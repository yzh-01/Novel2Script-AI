// ============================================================
// 首页 — 小说章节输入
// 核心步骤：填章节 → 选类型/格式 → 点转换 → 跳转编辑器
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChapterList } from '@/components/input/ChapterList';
import { useChapterList } from '@/hooks/useChapterList';
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

  const canConvert = chapterList.isValid && title.trim() && !isConverting;

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
        <p className="mt-1 text-sm text-stone-500">
          粘贴 3 个以上章节，AI 自动生成 YAML 格式剧本
        </p>
      </div>

      {/* 基本信息 */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              小说标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="如：三体"
              className="w-full rounded border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">作者（选填）</label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="如：刘慈欣"
              className="w-full rounded border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">小说类型</label>
            <select
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
            <label className="mb-1 block text-sm font-medium text-stone-700">目标格式</label>
            <select
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

      {/* 章节输入 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-700">章节内容</h2>
          <span className="text-xs text-stone-400">最少 3 章 · 每章建议 5000 字以内</span>
        </div>

        <ChapterList
          chapters={chapterList.chapters}
          onAdd={chapterList.addChapter}
          onRemove={chapterList.removeChapter}
          onUpdate={chapterList.updateChapter}
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
          disabled={!canConvert}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-base font-medium text-white
                     transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <span>🎬</span>
          转换为剧本
        </button>
      </div>
    </div>
  );
}
