// ============================================================
// Novel2Script-AI — 校验辅助
// Zod 错误格式化 + YAML 实时校验
// ============================================================

import type { ZodError } from 'zod';
import { ScreenplaySchema } from './schema';
import { tryParseYaml } from './yaml';
import type { ValidationResult, ValidationIssue } from '@/types';
import { BLOCK_TYPES } from '@/constants';

/**
 * 格式化 ZodError 为人类可读消息
 */
export function formatZodErrors(error: ZodError): string[] {
  return error.issues.map(issue => {
    const path = issue.path.join('.') || '(root)';
    return `${path}: ${issue.message}`;
  });
}

/**
 * 将 Zod 错误映射为 ValidationIssue 列表
 */
export function zodErrorToIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
    severity: 'error' as const,
  }));
}

/**
 * 前端实时校验：YAML 字符串 → 完整校验结果
 * 分两步：先解析 YAML 语法，再用 Zod 校验结构
 */
export function validateYamlInEditor(yamlString: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Step 1: YAML 语法校验
  const parseResult = tryParseYaml(yamlString);
  if (!parseResult.success) {
    issues.push({
      path: '(yaml)',
      message: `YAML 语法错误：${parseResult.error}`,
      severity: 'error',
    });
    return { valid: false, issues };
  }

  // Step 2: Zod 结构校验
  const zodResult = ScreenplaySchema.safeParse(parseResult.data);
  if (!zodResult.success) {
    issues.push(...zodErrorToIssues(zodResult.error));
  }

  // Step 3: 额外一致性检查
  const data = parseResult.data as Record<string, unknown>;
  if (data && typeof data === 'object') {
    issues.push(...consistencyChecks(data));
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * YAML 字符串是否包含至少一个场景
 * 用于编辑器"有内容可预览"的判断
 */
export function hasContent(yamlString: string): boolean {
  const result = tryParseYaml(yamlString);
  if (!result.success) return false;

  const data = result.data as Record<string, unknown>;
  return Array.isArray(data?.scenes) && data.scenes.length > 0;
}

/**
 * 额外一致性检查（Zod 层面无法覆盖的规则）
 */
function consistencyChecks(data: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const characters = (data.characters as Array<{ id: string; name: string }>) || [];
  const scenes = (data.scenes as Array<Record<string, unknown>>) || [];
  const characterIds = new Set(characters.map(c => c.id));

  for (const scene of scenes) {
    const sceneId = scene.id as string;

    // 检查 characters_present 引用的角色 ID 是否存在
    const present = (scene.characters_present as string[]) || [];
    for (const charId of present) {
      if (!characterIds.has(charId)) {
        issues.push({
          path: `scenes.${sceneId}.characters_present`,
          message: `角色 "${charId}" 未在 characters 表中定义`,
          severity: 'warning',
        });
      }
    }

    // 检查 blocks 中的未知 type
    const blocks = (scene.blocks as Array<{ type: string }>) || [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!BLOCK_TYPES.includes(block.type as typeof BLOCK_TYPES[number])) {
        issues.push({
          path: `scenes.${sceneId}.blocks.${i}.type`,
          message: `未知的 block 类型 "${block.type}"（支持：${BLOCK_TYPES.join(', ')}）`,
          severity: 'warning',
        });
      }
    }
  }

  return issues;
}
