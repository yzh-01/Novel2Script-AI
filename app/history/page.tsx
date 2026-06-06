// ============================================================
// 历史记录页 — 查看、搜索、删除转换记录
// ============================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface RecordItem {
  id: number;
  title: string;
  genre: string;
  format: string;
  author: string | null;
  chapterCount: number;
  createdAt: string;
}

interface HistoryResponse {
  records: RecordItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const GENRE_LABELS: Record<string, string> = {
  'sci-fi': '科幻', romance: '言情', history: '历史',
  mystery: '悬疑', fantasy: '奇幻', other: '其他',
};

const FORMAT_LABELS: Record<string, string> = {
  movie: '电影', tv_series: '电视剧', short_drama: '短剧',
};

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchRecords = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '10' });
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.error) msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message || '加载历史记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords(page, query);
  }, [page, fetchRecords]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(1);
    fetchRecords(1, query);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除这条记录？')) return;
    setDeleting(id);
    try {
      await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      fetchRecords(page, query);
    } catch {
      // 静默失败
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800">历史记录</h1>
        <p className="mt-1 text-sm text-stone-600">查看和管理所有剧本转换记录</p>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="搜索剧本标题…"
          className="input-enhanced flex-1"
        />
        <button
          onClick={handleSearch}
          className="btn-brand rounded-lg px-4 py-2 text-sm"
        >
          搜索
        </button>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="rounded-lg border bg-white p-12 text-center text-sm text-stone-500">
          加载中…
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button onClick={() => fetchRecords(page, query)} className="ml-2 underline">重试</button>
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && data?.records.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-stone-200 py-20 text-center">
          <span className="text-4xl">📭</span>
          <p className="mt-3 text-stone-500">
            {query.trim() ? '没有匹配的记录' : '暂无转换记录，去首页开始第一个转换吧'}
          </p>
          {!query.trim() && (
            <Link href="/" className="btn-brand mt-4 inline-block rounded-lg px-4 py-2 text-sm no-underline">
              开始转换
            </Link>
          )}
        </div>
      )}

      {/* 记录列表 */}
      {!loading && !error && data && data.records.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-left">
                  <th className="px-4 py-3 font-medium text-stone-600">标题</th>
                  <th className="px-4 py-3 font-medium text-stone-600 hidden sm:table-cell">类型</th>
                  <th className="px-4 py-3 font-medium text-stone-600 hidden md:table-cell">格式</th>
                  <th className="px-4 py-3 font-medium text-stone-600 hidden md:table-cell">章节</th>
                  <th className="px-4 py-3 font-medium text-stone-600 hidden lg:table-cell">时间</th>
                  <th className="px-4 py-3 text-right font-medium text-stone-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.records.map(record => (
                  <tr key={record.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800 truncate max-w-[200px]">{record.title}</p>
                      {record.author && (
                        <p className="text-xs text-stone-400">{record.author}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">
                      {GENRE_LABELS[record.genre] || record.genre}
                    </td>
                    <td className="px-4 py-3 text-stone-600 hidden md:table-cell">
                      {FORMAT_LABELS[record.format] || record.format}
                    </td>
                    <td className="px-4 py-3 text-stone-600 hidden md:table-cell">
                      {record.chapterCount} 章
                    </td>
                    <td className="px-4 py-3 text-stone-500 hidden lg:table-cell text-xs">
                      {new Date(record.createdAt).toLocaleString('zh-CN', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/history/${record.id}`}
                          className="text-xs text-amber-600 hover:text-amber-800 transition-colors no-underline"
                        >
                          查看
                        </Link>
                        <button
                          onClick={() => handleDelete(record.id)}
                          disabled={deleting === record.id}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          {deleting === record.id ? '删除中…' : '删除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              >
                上一页
              </button>
              <span className="text-sm text-stone-500">
                {page} / {data.totalPages}（共 {data.total} 条）
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="rounded px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
