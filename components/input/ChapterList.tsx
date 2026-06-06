// ============================================================
// ChapterList — 章节列表容器（增删排序 + 校验提示）
// ============================================================

'use client';

import { memo, useCallback } from 'react';
import { ChapterInput } from './ChapterInput';
import { MIN_CHAPTERS, MAX_CHAPTERS } from '@/constants';
import type { ChapterInput as ChapterInputType } from '@/types';

interface ChapterListProps {
  chapters: ChapterInputType[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<ChapterInputType>) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onClearAll?: () => void;
  errors: string[];
  totalWords: number;
  isOverLimit: boolean;
}

export const ChapterList = memo(function ChapterList({
  chapters,
  onAdd,
  onRemove,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onClearAll,
  errors,
  totalWords,
  isOverLimit,
}: ChapterListProps) {
  const canAdd = chapters.length < MAX_CHAPTERS;
  const canRemove = useCallback((_index: number) => chapters.length > MIN_CHAPTERS, [chapters.length]);

  return (
    <div className="space-y-4">
      {/* 章节列表 */}
      <div className="space-y-3">
        {chapters.map((chapter, index) => (
          <ChapterInput
            key={index}
            chapter={chapter}
            index={index}
            total={chapters.length}
            onChange={onUpdate}
            onRemove={onRemove}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            canRemove={canRemove(index)}
          />
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        {canAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 rounded border border-dashed border-gray-300 px-4 py-2
                       text-sm text-gray-500 transition-colors hover:border-amber-400 hover:text-amber-600"
          >
            + 添加章节（最多 {MAX_CHAPTERS} 章）
          </button>
        )}

        {onClearAll && chapters.some(ch => ch.title.trim() || ch.content.trim()) && (
          <button
            onClick={onClearAll}
            className="rounded px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            清空全部
          </button>
        )}

        <span className="text-sm text-gray-500">
          总计 {totalWords.toLocaleString()} 字 · {chapters.length} 章
        </span>

        {isOverLimit && (
          <span className="text-sm text-amber-600">⚠ 部分章节超过建议字数</span>
        )}
      </div>

      {/* 校验错误 */}
      {errors.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-3">
          <p className="mb-1 text-sm font-medium text-red-700">请修正以下问题：</p>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-red-600">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
