// ============================================================
// Novel2Script-AI — 转换管道 v2.0
//
// 编排流程：
//   校验输入 → 拼 Prompt → 调 Claude → 预处理自动修复
//   → 后端注入字段 → Zod 校验 → JSON→YAML → 一致性校验 → 返回
//
// 审查后新增：
//   - 后端注入 generated_at / version / generator / language
//   - 预处理自动修复层（ID 格式 / source_chapter 类型 / 引用清理）
//   - 重试时注入格式化后的 Zod 错误信息
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserMessage } from './prompt';
import {
  ScreenplaySchema,
  validateConvertRequest,
  validateScreenplayInput,
} from './schema';
import { jsonToYaml } from './yaml';
import { formatZodErrors } from './validators';
import { CLAUDE_MODEL, MAX_RETRIES } from '@/constants';
import type {
  ConvertRequest,
  ConvertResponse,
  ConvertPhase1,
  ConvertPhase2,
  Screenplay,
  ScreenplayMetaInput,
  ValidationResult,
} from '@/types';

// ── Anthropic 客户端 ────────────────────────────────────

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'sk-ant-xxx') {
    throw new Error('ANTHROPIC_API_KEY 未配置，请在 .env.local 中设置');
  }
  return new Anthropic({ apiKey });
}

// ── 系统注入字段 ────────────────────────────────────────

const SYSTEM_INJECT = {
  language: 'zh-CN',
  version: '1.0.0',
  generator: 'novel2script-ai',
} as const;

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
  const userMessage = buildUserMessage(request);

  // 3. 调用 Claude（带错误注入重试）
  const raw = await callClaudeWithRetry(systemPrompt, request);

  // 4. 预处理自动修复（在 Zod 校验前）
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

// ── Claude API 调用（带错误注入重试）───────────────────

async function callClaudeWithRetry(
  systemPrompt: string,
  request: ConvertRequest,
): Promise<Record<string, unknown>> {
  const client = getClient();
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 重试时在 User Message 中注入前次错误
      const userMessage = buildUserMessage(
        request,
        lastError ? [lastError] : undefined
      );

      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      // 解析 JSON
      const text = extractJsonFromResponse(response);
      const parsed = JSON.parse(text);

      // 宽松校验（允许 system-injected 字段缺失）
      const result = validateScreenplayInput(parsed);
      if (result.success) {
        return result.data as Record<string, unknown>;
      }

      // 校验失败 → 记录错误信息，下次重试时注入 Prompt
      lastError = formatZodErrors(result.error).join('；');
      console.warn(`[Attempt ${attempt + 1}] Schema 校验失败：${lastError}`);

    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[Attempt ${attempt + 1}] 调用失败：${lastError}`);
    }

    if (attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error(`转换失败（已重试 ${MAX_RETRIES} 次）：${lastError}`);
}

// ── 预处理自动修复层 ────────────────────────────────────

/**
 * 在 Zod 严格校验前，自动修复 LLM 输出中的常见小问题。
 * 只修明确可自动修复的问题，不猜测、不编造。
 */
function autoFixPostProcess(raw: Record<string, unknown>): Record<string, unknown> {
  const data = structuredClone(raw) as Record<string, unknown>;

  if (Array.isArray(data.scenes)) {
    const scenes = data.scenes as Array<Record<string, unknown>>;

    for (const scene of scenes) {
      // 修复 1: source_chapter 数组 → 取第一个元素
      if (Array.isArray(scene.source_chapter)) {
        const arr = scene.source_chapter as number[];
        scene.source_chapter = arr.length > 0 ? arr[0] : 1;
      }
      // 修复 2: source_chapter 缺失 → 默认 1 + warning
      if (scene.source_chapter === undefined || scene.source_chapter === null) {
        scene.source_chapter = 1;
        console.warn(`[AutoFix] ${scene.id}: source_chapter 缺失，默认设为 1`);
      }
      // 修复 3: source_chapter 为 0 或负数 → 改为 1
      if (typeof scene.source_chapter === 'number' && scene.source_chapter < 1) {
        scene.source_chapter = 1;
        console.warn(`[AutoFix] ${scene.id}: source_chapter 为 ${scene.source_chapter}，修正为 1`);
      }

      // 修复 4: 清理 characters_present 中可能的悬空引用（简单清理，不做角色表校验）
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

/**
 * 注入 LLM 不应负责的字段：language、version、generator、generated_at
 */
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

function extractJsonFromResponse(response: Anthropic.Messages.Message): string {
  const content = response.content;
  for (const block of content) {
    if (block.type === 'text') {
      let text = block.text.trim();

      // 提取 ```json ... ``` 代码块
      const match = text.match(/```(?:json|yaml)?\s*\n?([\s\S]*?)\n?```/);
      if (match) text = match[1].trim();

      if (text.startsWith('{') || text.startsWith('[')) return text;
    }
  }
  throw new Error('无法从 Claude 响应中提取 JSON');
}

// ── 一致性校验 ──────────────────────────────────────────

function validateOutput(screenplay: Screenplay): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const characterIds = new Set(screenplay.characters.map(c => c.id));

  for (const scene of screenplay.scenes) {
    // 引用完整性：characters_present
    for (const charId of scene.characters_present) {
      if (!characterIds.has(charId)) {
        issues.push({
          path: `scenes.${scene.id}.characters_present`,
          message: `角色 "${charId}" 未在 characters 表中定义`,
          severity: 'warning',
        });
      }
    }

    // 引用完整性：dialogue.character_id
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
