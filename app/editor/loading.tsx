// ============================================================
// app/editor/loading.tsx — 编辑器页面加载骨架
// CodeMirror ~150KB，慢网络下用户需要看到一个结构占位
// ============================================================

// 确定性宽度数组，消除 SSR/CSR 渲染差异导致的 CLS
const LEFT_WIDTHS  = [75, 60, 85, 48, 70, 55, 92, 42, 68, 80, 58, 72, 50, 88, 62, 45, 78, 65, 53, 82];
const RIGHT_WIDTHS = [55, 78, 42, 85, 60, 70, 48, 65, 80, 55, 72, 45, 68, 58, 82];

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
            {LEFT_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-stone-100"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
        {/* 预览面板骨架 */}
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
          <div className="space-y-2">
            {RIGHT_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-stone-100"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
