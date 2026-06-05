// ============================================================
// useChapterList — 章节列表增删排序状态管理
// ============================================================

'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ChapterInput } from '@/types';
import { MIN_CHAPTERS, MAX_CHAPTERS, CHAPTER_WORD_LIMIT } from '@/constants';

interface UseChapterListReturn {
  chapters: ChapterInput[];
  addChapter: () => void;
  removeChapter: (index: number) => void;
  updateChapter: (index: number, updates: Partial<ChapterInput>) => void;
  moveChapter: (fromIndex: number, toIndex: number) => void;
  bulkImport: (imported: ChapterInput[]) => void;
  clearAll: () => void;
  isValid: boolean;
  errors: string[];
  totalWords: number;
  isOverLimit: boolean;
}

const createEmptyChapter = (number: number): ChapterInput => ({
  number,
  title: '',
  content: '',
});

export function useChapterList(): UseChapterListReturn {
  const [chapters, setChapters] = useState<ChapterInput[]>([
    createEmptyChapter(1),
    createEmptyChapter(2),
    createEmptyChapter(3),
  ]);

  const addChapter = useCallback(() => {
    setChapters(prev => {
      if (prev.length >= MAX_CHAPTERS) return prev;
      return [...prev, createEmptyChapter(prev.length + 1)];
    });
  }, []);

  const removeChapter = useCallback((index: number) => {
    setChapters(prev => {
      if (prev.length <= MIN_CHAPTERS) return prev;
      const next = prev.filter((_, i) => i !== index);
      // 重新编号
      return next.map((ch, i) => ({ ...ch, number: i + 1 }));
    });
  }, []);

  const updateChapter = useCallback((index: number, updates: Partial<ChapterInput>) => {
    setChapters(prev =>
      prev.map((ch, i) => (i === index ? { ...ch, ...updates } : ch))
    );
  }, []);

  const moveChapter = useCallback((fromIndex: number, toIndex: number) => {
    setChapters(prev => {
      if (fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((ch, i) => ({ ...ch, number: i + 1 }));
    });
  }, []);

  const bulkImport = useCallback((imported: ChapterInput[]) => {
    if (!imported.length) return;
    const limited = imported.slice(0, MAX_CHAPTERS);
    setChapters(limited.map((ch, i) => ({ ...ch, number: i + 1 })));
  }, []);

  const clearAll = useCallback(() => {
    setChapters([
      createEmptyChapter(1),
      createEmptyChapter(2),
      createEmptyChapter(3),
    ]);
  }, []);

  // 校验
  const { isValid, errors, totalWords, isOverLimit } = useMemo(() => {
    const errs: string[] = [];
    let words = 0;

    if (chapters.length < MIN_CHAPTERS) {
      errs.push(`至少需要 ${MIN_CHAPTERS} 个章节`);
    }

    for (const ch of chapters) {
      words += ch.content.length;
      if (ch.title.trim() === '') {
        errs.push(`第 ${ch.number} 章标题不能为空`);
      }
      if (ch.content.trim() === '') {
        errs.push(`第 ${ch.number} 章内容不能为空`);
      }
    }

    const overLimit = chapters.some(ch => ch.content.length > CHAPTER_WORD_LIMIT);

    return {
      isValid: errs.length === 0 && chapters.length >= MIN_CHAPTERS,
      errors: errs,
      totalWords: words,
      isOverLimit: overLimit,
    };
  }, [chapters]);

  return {
    chapters,
    addChapter,
    removeChapter,
    updateChapter,
    moveChapter,
    bulkImport,
    clearAll,
    isValid,
    errors,
    totalWords,
    isOverLimit,
  };
}
