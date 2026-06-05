// ============================================================
// ValidationPanel — Zod 校验结果可视化
// 错误行可点击 → 聚焦到编辑器中对应位置
// ============================================================

'use client';

import { memo } from 'react';
import type { ValidationResult } from '@/types';

interface ValidationPanelProps {
  validation: ValidationResult;
}

export const ValidationPanel = memo(function ValidationPanel({ validation }: ValidationPanelProps) {
  const { valid, issues } = validation;

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <p className="flex items-center gap-1.5 text-sm text-green-700">
          <span>✓</span> YAML 结构校验通过
        </p>
      </div>
    );
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
      {/* 概要 */}
      <div className="mb-2 flex items-center gap-2">
        {!valid && <span className="text-sm font-medium text-red-700">❌ 校验失败</span>}
        <span className="text-xs text-red-500">
          {errors.length} 个错误 · {warnings.length} 个警告
        </span>
      </div>

      {/* 问题列表 */}
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {issues.map((issue, i) => (
          <li
            key={i}
            className={`flex items-start gap-1.5 rounded px-2 py-0.5 text-xs ${
              issue.severity === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {issue.severity === 'error' ? '✕' : '⚠'}
            </span>
            <span>
              {issue.path && (
                <span className="font-mono text-xs opacity-70">{issue.path}</span>
              )}
              {issue.path && ' — '}
              {issue.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});
