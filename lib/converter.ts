// ============================================================
// Novel2Script-AI — 转换管道 v2.3
//
// 编排流程：
//   校验输入 → 拼 Prompt → 调 DeepSeek → 预处理自动修复
//   → 后端注入字段 → Zod 校验 → JSON→YAML → 一致性校验 → 返回
// ============================================================

import { buildSystemPrompt, buildUserMessage } from './prompt';
import {
  ScreenplaySchema,
  validateConvertRequest,
  validateScreenplayInput,
} from './schema';
import { jsonToYaml } from './yaml';
import { formatZodErrors } from './validators';
import {
  DASHSCOPE_BASE_URL,
  LLM_MODEL,
  MAX_RETRIES,
  CONVERT_TIMEOUT,
} from '@/constants';
import type {
  ConvertRequest,
  ConvertResponse,
  ConvertPhase1,
  ConvertPhase2,
  Screenplay,
  ValidationResult,
} from '@/types';

// ── 阿里云 DashScope 客户端 ───────────────────────────

function getApiKey(): string {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key || key === '你的阿里云API-KEY') {
    throw new Error('DASHSCOPE_API_KEY 未配置，请在 .env.local 中设置');
  }
  return key;
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

async function callDashScope(
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONVERT_TIMEOUT);

  try {
    const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        max_tokens: 6000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '未知错误');
      throw new Error(`DashScope API 返回 ${response.status}：${errText}`);
    }

    const data: ChatResponse = await response.json();

    if (data.error) {
      throw new Error(`DashScope 错误：${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM 返回了空响应');
    }

    return content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`LLM 请求超时（${CONVERT_TIMEOUT / 1000} 秒未响应）`);
    }
    throw err;
  }
}

// ── 主转换函数 ──────────────────────────────────────────

export async function convertNovelToScreenplay(
  request: ConvertRequest,
  onPhase1?: (phase1: ConvertPhase1) => void
): Promise<ConvertResponse> {
  try {
  // 1. 校验输入
  const inputResult = validateConvertRequest(request);
  if (!inputResult.success) {
    throw new Error(`输入校验失败：${formatZodErrors(inputResult.error).join('；')}`);
  }

  // 2. 构建 Prompt
  const systemPrompt = buildSystemPrompt(request);

  // 3. 调用 LLM（带错误注入重试）
  const raw = await callLLMWithRetry(systemPrompt, request);

  // 4. 预处理自动修复
  let repaired: Record<string, unknown>;
  try {
    repaired = autoFixPostProcess(raw);
  } catch (fixErr) {
    console.warn('[autoFix] 预处理异常（第2阶段）：', safeErrorMsg(fixErr));
    repaired = raw;
  }

  // 5. 后端注入系统字段
  const screenplay = injectSystemFields(repaired);

  // 6. Zod 最终校验
  const schemaResult = ScreenplaySchema.safeParse(screenplay);
  if (!schemaResult.success) {
    throw new Error(`最终校验失败：${formatZodErrors(schemaResult.error).join('；')}`);
  }
  const final = schemaResult.data;

  // 7. 构建 Phase1（角色 + 大纲）
  const phase1: ConvertPhase1 = {
    phase: 'characters',
    characters: final.characters,
    episodes: final.episodes,
    scene_outline: final.scenes.map(s => ({
      id: s.id,
      scene_number: s.scene_number,
      episode: s.episode,
      heading: s.heading,
      summary: s.summary || '',
      source_chapter: s.source_chapter,
    })),
  };
  onPhase1?.(phase1);

  // 8. JSON → YAML
  const yaml = jsonToYaml(final);

  // 9. 一致性校验
  const validation = validateOutput(final);

  // 10. 返回 Phase2
  return { phase: 'complete', screenplay: final, yaml, validation };

  } catch (err) {
    throw new Error(safeErrorMsg(err) || '转换失败');
  }
}

// ── LLM 调用（带错误注入重试）──────────────────────────

async function callLLMWithRetry(
  systemPrompt: string,
  request: ConvertRequest,
): Promise<Record<string, unknown>> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 重试时在 User Message 中注入前次错误
      const userMessage = buildUserMessage(
        request,
        lastError ? [lastError] : undefined
      );

      const text = await callDashScope([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      // 解析 JSON（含自动修复）
      const jsonText = extractJsonFromText(text);
      const parsed = tryParseJson(jsonText);

      // 预处理修复（在 Zod 校验前，修复空值/类型/引用）
      let repaired: Record<string, unknown>;
      try {
        repaired = autoFixPostProcess(parsed as Record<string, unknown>);
      } catch (fixErr) {
        // 预处理失败不应阻断转换，退回到原始 parsed
        console.warn('[autoFix] 预处理异常：', safeErrorMsg(fixErr));
        repaired = parsed as Record<string, unknown>;
      }

      // 宽松校验
      const result = validateScreenplayInput(repaired);
      if (result.success) {
        return result.data as Record<string, unknown>;
      }

      // 校验失败 → 记录错误，下次重试时注入 Prompt
      lastError = formatZodErrors(result.error).join('；');
      console.warn(`[Attempt ${attempt + 1}] Schema 校验失败：${lastError}`);

    } catch (err) {
      lastError = safeErrorMsg(err);
      console.warn(`[Attempt ${attempt + 1}] 调用失败：${lastError}`);
    }

    if (attempt < MAX_RETRIES) {
      // 限流错误等待更久（429），普通错误递增延迟
      const isRateLimit = lastError?.includes('429') || lastError?.includes('速率限制');
      const delayMs = isRateLimit ? 5000 : 1000 * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`转换失败（已重试 ${MAX_RETRIES} 次）：${lastError}`);
}

// ── 预处理自动修复层 ────────────────────────────────────

/** genre 别名映射：LLM 可能返回非标准值，统一映射到合法枚举 */
const GENRE_ALIASES: Record<string, string> = {
  science_fiction: 'sci-fi',
  'science fiction': 'sci-fi',
  scifi: 'sci-fi',
  thriller: 'mystery',
  suspense: 'mystery',
  love: 'romance',
  'historical fiction': 'history',
  historical: 'history',
  wuxia: 'history',
  xianxia: 'fantasy',
  xuanhuan: 'fantasy',
  horror: 'mystery',
  drama: 'other',
  'slice of life': 'other',
};

/** category 别名：AI 输出自然语言角色分类 → Schema 枚举 */
const CATEGORY_ALIASES: Record<string, string> = {
  protagonist: 'main', hero: 'main', heroine: 'main', lead: 'main',
  antagonist: 'supporting', villain: 'supporting',
  side: 'supporting', secondary: 'supporting',
  minor: 'guest', tertiary: 'guest',
  background: 'extras', extra: 'extras',
};

/** time_of_day 别名 */
const TIME_OF_DAY_ALIASES: Record<string, string> = {
  evening: 'dusk', sunset: 'dusk', sunrise: 'dawn',
  daytime: 'day', nighttime: 'night', midnight: 'night', noon: 'afternoon',
};

/** gender 别名 */
const GENDER_ALIASES: Record<string, string> = {
  man: 'male', woman: 'female', unknown: 'other',
  '未知': 'other', '男': 'male', '女': 'female', '其他': 'other',
  m: 'male', f: 'female',
};

/** relationship.type 别名 */
const RELATIONSHIP_TYPE_ALIASES: Record<string, string> = {
  friend: 'ally', friendship: 'ally',
  brother: 'family', sister: 'family', sibling: 'family',
  parent: 'family', child: 'family', father: 'family', mother: 'family',
  son: 'family', daughter: 'family', cousin: 'family',
  master: 'mentor_student', teacher: 'mentor_student',
  student: 'mentor_student', disciple: 'mentor_student',
  mentor: 'mentor_student', apprentice: 'mentor_student',
  husband: 'lover', wife: 'lover', boyfriend: 'lover', girlfriend: 'lover',
  lover: 'lover', spouse: 'lover',
  rival: 'rival', enemy: 'enemy', foe: 'enemy',
};

/** 安全序列化任意错误为字符串（防止 [object Object]） */
function safeErrorMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}
function normalizeEnum(value: unknown, aliases: Record<string, string>, validValues: readonly string[]): string {
  if (typeof value !== 'string') return validValues[0]; // fallback to first valid
  const v = value.trim();
  if (!v) return validValues[0];
  if (validValues.includes(v)) return v;
  const lower = v.toLowerCase();
  if (validValues.includes(lower)) return lower;
  if (aliases[lower]) return aliases[lower];
  // 尝试模糊匹配：输入值包含 alias key（仅当 key 长度 ≥ 3 防止过短匹配）
  for (const [key, target] of Object.entries(aliases)) {
    if (key.length >= 3 && lower.includes(key)) return target;
  }
  // 无法映射 → 返回原值，让 Zod 报错（能看到具体是什么值）
  return v;
}

/** 递归清理对象中的 null 值（可选字段 null → 删除该键） */
function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls).filter(v => v !== undefined);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const cleaned = stripNulls(v);
      if (cleaned !== undefined) result[k] = cleaned;
    }
    return result;
  }
  return obj;
}

function autoFixPostProcess(raw: Record<string, unknown>): Record<string, unknown> {
  try {
  // 先全局清理 null 值
  let data = stripNulls(raw) as Record<string, unknown>;

  // 修复 0: genre 别名映射
  if (data.meta && typeof data.meta === 'object') {
    const meta = data.meta as Record<string, unknown>;
    if (Array.isArray(meta.genre)) {
      meta.genre = (meta.genre as string[]).map(g => {
        const normalized = g.toLowerCase().trim();
        return GENRE_ALIASES[normalized] || (GENRE_ALIASES[g] || g);
      });
    }
  }

  // 修复 0.5: meta 空字段回退
  if (data.meta && typeof data.meta === 'object') {
    const meta = data.meta as Record<string, unknown>;
    if (!meta.title || (typeof meta.title === 'string' && !meta.title.trim())) {
      meta.title = '未命名剧本';
    }
    if (meta.source && typeof meta.source === 'object') {
      const src = meta.source as Record<string, unknown>;
      if (!src.title || (typeof src.title === 'string' && !src.title.trim())) {
        src.title = (meta.title as string) || '未知原著';
      }
    }
  }

  // 修复 1: 角色字段修正
  const VALID_CATEGORIES = ['main', 'supporting', 'guest', 'cameo', 'extras'];
  const VALID_GENDERS = ['male', 'female', 'other'];
  const VALID_REL_TYPES = ['ally', 'enemy', 'family', 'lover', 'rival', 'mentor_student'];

  if (Array.isArray(data.characters)) {
    for (const ch of data.characters as Array<Record<string, unknown>>) {
      // category: 归一化 AI 输出的自然语言值
      if (typeof ch.category === 'string') {
        ch.category = normalizeEnum(ch.category, CATEGORY_ALIASES, VALID_CATEGORIES);
      }
      // gender: 归一化
      if (typeof ch.gender === 'string') {
        ch.gender = normalizeEnum(ch.gender, GENDER_ALIASES, VALID_GENDERS);
      }
      // description 缺失 → 回退
      if (!ch.description || (typeof ch.description === 'string' && !ch.description.trim())) {
        ch.description = (ch.name as string) || '未知角色';
      }
      // traits 可能为 null/undefined → 空数组
      if (!Array.isArray(ch.traits)) ch.traits = [];
      // relationships.type 归一化
      if (Array.isArray(ch.relationships)) {
        for (const rel of ch.relationships as Array<Record<string, unknown>>) {
          if (typeof rel.type === 'string') {
            rel.type = normalizeEnum(rel.type, RELATIONSHIP_TYPE_ALIASES, VALID_REL_TYPES);
          }
        }
      }
    }
  }

  // 修复 2: scenes 字段修正
  if (Array.isArray(data.scenes)) {
    const scenes = data.scenes as Array<Record<string, unknown>>;

    for (const scene of scenes) {
      // source_chapter 数组 → 取第一个元素
      if (Array.isArray(scene.source_chapter)) {
        scene.source_chapter = (scene.source_chapter as number[])[0] || 1;
      }
      if (scene.source_chapter === undefined || scene.source_chapter === null || scene.source_chapter === 0) {
        scene.source_chapter = 1;
      }
      // 清理 characters_present
      if (Array.isArray(scene.characters_present)) {
        scene.characters_present = (scene.characters_present as string[]).filter(
          id => typeof id === 'string' && id.startsWith('CH-')
        );
      }
      // 修复 blocks 中的 null 字段
      if (Array.isArray(scene.blocks)) {
        for (const block of scene.blocks as Array<Record<string, unknown>>) {
          // emotion/parenthetical/delivery 为 null → 删除
          if (block.emotion === null) delete block.emotion;
          if (block.parenthetical === null) delete block.parenthetical;
          if (block.delivery === null) delete block.delivery;
          if (block.continuation === null) delete block.continuation;
          // 空字符串 → 删除
          if (block.emotion === '') delete block.emotion;
          if (block.parenthetical === '') delete block.parenthetical;
        }
      }
      // heading.extra 可能为 null 或空字符串
      // heading.time_of_day 归一化（AI 可能输出非标准值）
      if (scene.heading && typeof scene.heading === 'object') {
        const h = scene.heading as Record<string, unknown>;
        if (h.extra === null || h.extra === '') delete h.extra;
        if (typeof h.time_of_day === 'string') {
          const VALID_TOD = ['dawn', 'morning', 'afternoon', 'dusk', 'day', 'night'];
          h.time_of_day = normalizeEnum(h.time_of_day, TIME_OF_DAY_ALIASES, VALID_TOD);
        }
      }
    }
  }

  return data;
  } catch (preErr) {
    console.warn('[autoFix] 内部异常：', safeErrorMsg(preErr));
    return raw; // 预处理失败退回原始输入
  }
}

// ── 系统字段注入 ────────────────────────────────────────

const SYSTEM_INJECT = {
  language: 'zh-CN',
  version: '1.0.0',
  generator: 'novel2script-ai',
} as const;

function injectSystemFields(raw: Record<string, unknown>): Screenplay {
  const meta = (raw.meta || {}) as Record<string, unknown>;

  const enriched = {
    ...raw,
    meta: {
      ...meta,
      language: SYSTEM_INJECT.language,
      version: SYSTEM_INJECT.version,
      generator: SYSTEM_INJECT.generator,
      generated_at: new Date().toISOString(),
    },
  };

  return enriched as unknown as Screenplay;
}

// ── JSON 提取与修复 ───────────────────────────────────

function extractJsonFromText(text: string): string {
  let content = text.trim();
  const match = content.match(/```(?:json|yaml)?\s*\n?([\s\S]*?)\n?```/);
  if (match) content = match[1].trim();
  if (content.startsWith('{') || content.startsWith('[')) return content;
  throw new Error('无法从 LLM 响应中提取 JSON');
}

/** 修复 LLM 常见的 JSON 语法错误 */
function repairJson(json: string): string {
  let fixed = json;
  // 1. 移除尾逗号
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  // 2. 一行中字符串值直接跟字符串键，缺逗号: "xxx"\n  "yyy"
  fixed = fixed.replace(/("\s*\n\s*")/g, '",\n"');
  // 3. 数字/布尔/null 后缺逗号
  fixed = fixed.replace(/([\d]|true|false|null)\s*\n\s*"/g, '$1,\n"');
  // 4. } 或 ] 后缺逗号
  fixed = fixed.replace(/([}\]])\s*\n\s*"/g, '$1,\n"');
  // 5. 属性值末尾缺逗号（最常见的 LLM 错误模式）
  //    "text": "..."\n      "character_id"
  fixed = fixed.replace(/"\s*\n(\s*)"([a-z_]+)"/g, '",\n$1"$2"');
  // 6. 对象/数组值后缺逗号
  fixed = fixed.replace(/([}\]])\s*\n(\s*)\{/g, '$1,\n$2{');
  // 7. 连续空行导致解析器误判 — 不处理，safe
  return fixed;
}

function tryParseJson(text: string): unknown {
  try { return JSON.parse(text); } catch {}

  // 尝试修复后解析
  let repaired = repairJson(text);
  try { return JSON.parse(repaired); } catch (e1) {
    // 修复仍失败 → 尝试在报错位置插入逗号
    const posMatch = (e1 as Error).message.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      // 在错误位置前插入逗号
      repaired = repaired.slice(0, pos) + ',' + repaired.slice(pos);
      try { return JSON.parse(repaired); } catch {}
    }
    throw e1;
  }
}

// ── 一致性校验 ──────────────────────────────────────────

function validateOutput(screenplay: Screenplay): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const characterIds = new Set(screenplay.characters.map(c => c.id));

  for (const scene of screenplay.scenes) {
    for (const charId of scene.characters_present) {
      if (!characterIds.has(charId)) {
        issues.push({
          path: `scenes.${scene.id}.characters_present`,
          message: `角色 "${charId}" 未在 characters 表中定义`,
          severity: 'warning',
        });
      }
    }

    for (let i = 0; i < scene.blocks.length; i++) {
      const block = scene.blocks[i];
      if (block.type === 'dialogue' && !characterIds.has(block.character_id)) {
        issues.push({
          path: `scenes.${scene.id}.blocks.${i}.character_id`,
          message: `对白引用了未定义的角色 "${block.character_id}"`,
          severity: 'warning',
        });
      }
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}
