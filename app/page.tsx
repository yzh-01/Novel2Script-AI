// ============================================================
// 首页 — 小说章节输入
// 核心步骤：填章节 → 选类型/格式 → 点转换 → 跳转编辑器
// ============================================================

'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChapterList } from '@/components/input/ChapterList';
import { useChapterList } from '@/hooks/useChapterList';
import { parseChaptersFromText } from '@/lib/parseChapters';
import { GENRES, FORMATS } from '@/constants';
import type { Genre, Format } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const chapterList = useChapterList();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState<Genre>('other');
  const [format, setFormat] = useState<Format>('movie');
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canConvert = chapterList.isValid && title.trim() && !isConverting;

  // 处理文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 从文件名推断小说标题
    const nameWithoutExt = file.name.replace(/\.(txt|text)$/i, '');
    if (!title.trim()) setTitle(nameWithoutExt);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const parsed = parseChaptersFromText(text);
      chapterList.bulkImport(parsed);
    };
    reader.readAsText(file, 'UTF-8');
    // 重置 input 以便重复上传同一文件
    e.target.value = '';
  }, [title, chapterList]);

  // 快速填充示例文本
  const handleQuickFill = useCallback(async (name: string, genre: Genre) => {
    try {
      const res = await fetch(`/fixtures/${name}-sample.txt`);
      if (!res.ok) throw new Error('加载失败');
      const text = await res.text();
      const parsed = parseChaptersFromText(text);
      chapterList.bulkImport(parsed);
      if (!title.trim()) setTitle(name === 'sci-fi' ? '三体' : name === 'romance' ? '偶遇' : '长安疑案');
      setGenre(genre);
    } catch {
      // 静默失败
    }
  }, [title, chapterList]);

  const handleConvert = async () => {
    if (!canConvert) return;
    setIsConverting(true);

    // 构建请求，但先存在 sessionStorage 中
    // 编辑器页会从 sessionStorage 读取并发起 API 调用
    sessionStorage.setItem('novel2script:request', JSON.stringify({
      title: title.trim(),
      author: author.trim() || undefined,
      genre,
      format,
      chapters: chapterList.chapters.map(ch => ({
        number: ch.number,
        title: ch.title.trim(),
        content: ch.content.trim(),
      })),
    }));

    router.push('/editor');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">📖 小说转剧本</h1>
        <p className="mt-1 text-sm text-stone-600">
          粘贴 3 个以上章节，AI 自动生成 YAML 格式剧本
        </p>
      </div>

      {/* 基本信息 */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-stone-700">
              小说标题 <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="如：三体"
              className="w-full rounded border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label htmlFor="author" className="mb-1 block text-sm font-medium text-stone-700">作者（选填）</label>
            <input
              id="author"
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="如：刘慈欣"
              className="w-full rounded border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label htmlFor="genre" className="mb-1 block text-sm font-medium text-stone-700">小说类型</label>
            <select
              id="genre"
              value={genre}
              onChange={e => setGenre(e.target.value as Genre)}
              className="w-full rounded border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {GENRES.map(g => (
                <option key={g.value} value={g.value}>{g.label} — {g.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="format" className="mb-1 block text-sm font-medium text-stone-700">目标格式</label>
            <select
              id="format"
              value={format}
              onChange={e => setFormat(e.target.value as Format)}
              className="w-full rounded border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label} — {f.description}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 文件上传 */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-stone-300 px-4 py-2.5 text-sm
                     text-stone-600 transition-colors hover:border-amber-400 hover:text-amber-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
          </svg>
          上传 .txt 小说文件
        </label>
        <span className="text-xs text-stone-500">
          支持「第N章」「Chapter N」「---」分隔，自动解析
        </span>
      </div>

      {/* 快速填充示例 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-400">快速填充：</span>
        {([
          { key: 'sci-fi', label: '🚀 科幻示例', genre: 'sci-fi' as Genre },
          { key: 'romance', label: '💕 言情示例', genre: 'romance' as Genre },
          { key: 'history', label: '🏛️ 历史示例', genre: 'history' as Genre },
        ]).map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleQuickFill(item.key, item.genre)}
            className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500
                       transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 章节输入 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-700">章节内容</h2>
          <span className="text-xs text-stone-600">最少 3 章 · 每章建议 5000 字以内</span>
        </div>

        <ChapterList
          chapters={chapterList.chapters}
          onAdd={chapterList.addChapter}
          onRemove={chapterList.removeChapter}
          onUpdate={chapterList.updateChapter}
          onMoveUp={(i) => chapterList.moveChapter(i, i - 1)}
          onMoveDown={(i) => chapterList.moveChapter(i, i + 1)}
          errors={chapterList.errors}
          totalWords={chapterList.totalWords}
          isOverLimit={chapterList.isOverLimit}
        />
      </div>

      {/* 转换按钮 */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {chapterList.isOverLimit && (
          <p className="text-sm text-amber-600">⚠ 部分章节超过建议字数，可能影响转换质量，建议精简</p>
        )}
        <button
          type="button"
          onClick={handleConvert}
          disabled={!canConvert || isConverting}
          aria-busy={isConverting}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-base font-medium text-white
                     transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isConverting ? (
            <>
              <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              正在跳转编辑器...
            </>
          ) : (
            <>
              <span>🎬</span>
              转换为剧本
            </>
          )}
        </button>
      </div>
    </div>
  );
}
