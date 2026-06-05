// ============================================================
// Novel2Script-AI — YAML 工具
// js-yaml 封装：Screenplay 对象 ↔ YAML 字符串
// ============================================================

import yaml from 'js-yaml';
import type { Screenplay } from '@/types';

/** YAML dump 选项：保持一致的缩进和格式 */
const DUMP_OPTIONS: yaml.DumpOptions = {
  indent: 2,
  lineWidth: -1,      // 不自动折行（对白文本可能很长）
  noRefs: true,        // 禁用引用锚点（保持输出可读）
  sortKeys: false,     // 保持字段原始顺序
  quotingType: '"',    // 字符串用双引号
  forceQuotes: false,  // 只在必要时加引号
};

/** YAML load 选项 */
const LOAD_OPTIONS: yaml.LoadOptions = {
  json: false,
};

/**
 * Screenplay 对象 → YAML 字符串
 */
export function jsonToYaml(screenplay: Screenplay): string {
  // 插入 Schema 版本注释头
  const header = [
    '# ============================================================',
    `# YAML Screenplay Schema v${screenplay.meta.version}`,
    `# 生成时间：${screenplay.meta.generated_at}`,
    `# 工具：${screenplay.meta.generator}`,
    '# 格式：' + screenplay.meta.format,
    '# ============================================================',
    '',
  ].join('\n');

  return header + yaml.dump(screenplay, DUMP_OPTIONS);
}

/**
 * YAML 字符串 → Screenplay 对象
 * 用于编辑器实时解析 + 校验
 */
export function yamlToJson(yamlString: string): Screenplay {
  const parsed = yaml.load(yamlString, LOAD_OPTIONS);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('YAML 解析失败：无法解析为对象');
  }
  return parsed as Screenplay;
}

/**
 * 安全尝试解析 YAML（不抛异常）
 */
export function tryParseYaml(yamlString: string): { success: true; data: unknown } | { success: false; error: string } {
  try {
    const data = yaml.load(yamlString, LOAD_OPTIONS);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'YAML 解析错误' };
  }
}
