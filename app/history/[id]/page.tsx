// ============================================================
// 历史记录详情页 — 查看单条记录的完整内容
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RecordDetail {
  id: number;
  title: string;
  novel: string;
  yaml: string;
  genre: string;
  format: string;
  author: string | null;
  chapterCount: number;
  createdAt: string;
}

const GENRE_LABELS: Record<string, string> = {
  'sci-fi': '科幻', romance: '言情', history: '历史',
  mystery: '悬疑', fantasy: '奇幻', other: '其他',
};

export default function HistoryDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/history/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('记录不存在');
        return res.json();
      })
      .then(data => setRecord(data))
      .catch(() => setError('加载记录失败'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="rounded-lg border bg-white p-12 text-center text-sm text-stone-500">加载中…</div>;
  }

  if (error || !record) {
    return (
      <div className="rounded-xl border-2 border-dashed border-stone-200 py-20 text-center">
        <p className="text-stone-500">{error || '记录不存在'}</p>
        <Link href="/history" className="mt-3 inline-block text-sm text-amber-600 hover:text-amber-800">← 返回列表</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回 */}
      <Link href="/history" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
        ← 返回历史记录
      </Link>

      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">{record.title}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-stone-500">
          <span>类型：{GENRE_LABELS[record.genre] || record.genre}</span>
          <span>格式：{record.format === 'movie' ? '电影' : record.format === 'tv_series' ? '电视剧' : '短剧'}</span>
          {record.author && <span>作者：{record.author}</span>}
          <span>{record.chapterCount} 章</span>
          <span>创建于 {new Date(record.createdAt).toLocaleString('zh-CN')}</span>
        </div>
      </div>

      {/* 操作 */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            sessionStorage.setItem('novel2script:history', JSON.stringify({
              yaml: record.yaml,
              title: record.title,
              genre: record.genre,
              format: record.format,
              author: record.author,
              novel: record.novel,
            }));
            router.push('/editor');
          }}
          className="btn-brand rounded-lg px-4 py-2 text-sm"
        >
          在编辑器中打开
        </button>
      </div>

      {/* YAML 剧本 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-stone-700">YAML 剧本</h2>
        <pre className="overflow-x-auto rounded-lg bg-stone-900 p-4 text-sm leading-relaxed text-stone-100 max-h-[600px] overflow-y-auto">
          {record.yaml}
        </pre>
      </section>
    </div>
  );
}
