// ============================================================
// app/error.tsx — 全局错误边界
// API 调用失败 / CodeMirror 加载异常 / 其他运行时错误
// ============================================================

'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="mb-2 text-lg font-semibold text-red-700">出错了</h2>
        <p className="mb-4 max-w-md text-sm text-red-600">
          {error.message || '发生了意外错误，请刷新页面重试。'}
        </p>
        <button
          onClick={reset}
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          刷新重试
        </button>
      </div>
    </div>
  );
}
