// ============================================================
// Novel2Script-AI — 转换管道 v2.2
//
// 编排流程：
//   校验输入 → 拼 Prompt → 调智谱 GLM → 预处理自动修复
//   → 后端注入字段 → Zod 校验 → JSON→YAML → 一致性校验 → 返回
//
// v2.2 变更：OpenRouter → 智谱 AI（OpenAI 兼容协议，国内直连低延迟）
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
  ZHIPU_BASE_URL,
  LLM_MODEL,
  MAX_RETRIES,
} from '@/constants';
import type {
  ConvertRequest,
  ConvertResponse,
  ConvertPhase1,
  ConvertPhase2,
  Screenplay,
  ValidationResult,
} from '@/types';

// ── 智谱 AI 客户端 ────────────────────────────────────

function getApiKey(): string {
  const key = process.env.ZHIPU_API_KEY;
  if (!key || key === '你的智谱API-KEY') {
    throw new Error('ZHIPU_API_KEY 未配置，请在 .env.local 中设置');
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

async function callZhipu(
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${ZHIPU_BASE_URL}/chat/completions`, {
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
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '未知错误');
    throw new Error(`智谱 API 返回 ${response.status}：${errText}`);
  }

  const data: ChatResponse = await response.json();

  if (data.error) {
    throw new Error(`智谱错误：${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter 返回了空响应');
  }

  return content;
}

// ── 主转换函数 ──────────────────────────────────────────

export async function convertNovelToScreenplay(
  request: ConvertRequest,
  onPhase1?: (phase1: ConvertPhase1) => void
): Promise<ConvertResponse> {
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
  const repaired = autoFixPostProcess(raw);

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

      const text = await callZhipu([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      // 解析 JSON
      const jsonText = extractJsonFromText(text);
      const parsed = JSON.parse(jsonText);

      // 宽松校验
      const result = validateScreenplayInput(parsed);
      if (result.success) {
        return result.data as Record<string, unknown>;
      }

      // 校验失败 → 记录错误，下次重试时注入 Prompt
      lastError = formatZodErrors(result.error).join('；');
      console.warn(`[Attempt ${attempt + 1}] Schema 校验失败：${lastError}`);

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
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

function autoFixPostProcess(raw: Record<string, unknown>): Record<string, unknown> {
  const data = structuredClone(raw) as Record<string, unknown>;

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

  if (Array.isArray(data.scenes)) {
    const scenes = data.scenes as Array<Record<string, unknown>>;

    for (const scene of scenes) {
      // 修复 1: source_chapter 数组 → 取第一个元素
      if (Array.isArray(scene.source_chapter)) {
        const arr = scene.source_chapter as number[];
        scene.source_chapter = arr.length > 0 ? arr[0] : 1;
      }
      // 修复 2: source_chapter 缺失 → 默认 1
      if (scene.source_chapter === undefined || scene.source_chapter === null) {
        scene.source_chapter = 1;
        console.warn(`[AutoFix] ${scene.id}: source_chapter 缺失，默认设为 1`);
      }
      // 修复 3: source_chapter 为 0 或负数 → 改为 1
      if (typeof scene.source_chapter === 'number' && scene.source_chapter < 1) {
        scene.source_chapter = 1;
        console.warn(`[AutoFix] ${scene.id}: source_chapter 异常，修正为 1`);
      }
      // 修复 4: 清理 characters_present 中的悬空引用
      if (Array.isArray(scene.characters_present)) {
        scene.characters_present = (scene.characters_present as string[]).filter(
          id => typeof id === 'string' && id.startsWith('CH-')
        );
      }
    }
  }

  return data;
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

// ── JSON 提取 ───────────────────────────────────────────

function extractJsonFromText(text: string): string {
  let content = text.trim();

  // 提取 ```json ... ``` 代码块
  const match = content.match(/```(?:json|yaml)?\s*\n?([\s\S]*?)\n?```/);
  if (match) content = match[1].trim();

  if (content.startsWith('{') || content.startsWith('[')) return content;

  throw new Error('无法从 LLM 响应中提取 JSON');
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
