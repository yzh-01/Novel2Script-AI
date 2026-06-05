// ============================================================
// app/editor/loading.tsx — 编辑器页面加载骨架
// CodeMirror ~150KB，慢网络下用户需要看到一个结构占位
// ============================================================

export default function EditorLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-6 w-32 animate-pulse rounded bg-stone-200" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* 编辑器骨架 */}
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-stone-100"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        </div>
        {/* 预览面板骨架 */}
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
          <div className="space-y-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-stone-100"
                style={{ width: `${40 + Math.random() * 60}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
