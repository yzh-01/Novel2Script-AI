// ============================================================
// ChapterInput — 单章输入表单
// ============================================================

'use client';

import { memo } from 'react';
import type { ChapterInput as ChapterInputType } from '@/types';
import { CHAPTER_WORD_LIMIT } from '@/constants';

interface ChapterInputProps {
  chapter: ChapterInputType;
  index: number;
  onChange: (index: number, updates: Partial<ChapterInputType>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export const ChapterInput = memo(function ChapterInput({
  chapter,
  index,
  onChange,
  onRemove,
  canRemove,
}: ChapterInputProps) {
  const wordCount = chapter.content.length;
  const isOverLimit = wordCount > CHAPTER_WORD_LIMIT;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      {/* 标题行 */}
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
          {chapter.number}
        </span>

        <input
          type="text"
          value={chapter.title}
          onChange={e => onChange(index, { title: e.target.value })}
          placeholder={`第 ${chapter.number} 章标题`}
          className="flex-1 rounded border px-3 py-1.5 text-lg font-medium
                     placeholder:text-gray-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />

        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="rounded px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="删除此章节"
          >
            ✕
          </button>
        )}
      </div>

      {/* 正文 */}
      <textarea
        value={chapter.content}
        onChange={e => onChange(index, { content: e.target.value })}
        placeholder="在此粘贴或输入章节正文…"
        rows={10}
        className="w-full resize-y rounded border px-3 py-2 font-mono text-sm leading-relaxed
                   placeholder:text-gray-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />

      {/* 字数统计 */}
      <div className={`mt-1 flex items-center justify-between text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
        <span>{wordCount} 字</span>
        {isOverLimit && (
          <span>建议每章 {CHAPTER_WORD_LIMIT} 字以内（超长可能影响转换质量）</span>
        )}
      </div>
    </div>
  );
});
