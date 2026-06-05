// ============================================================
// Novel2Script-AI — 根布局
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Novel2Script AI — 小说转剧本工具',
  description: '将多章节小说自动转换为 YAML 格式剧本。支持电影、电视剧、短剧。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {/* 导航栏 */}
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-amber-700 no-underline">
              <span className="text-lg">🎬</span>
              <span>Novel2Script</span>
            </Link>

            <div className="flex items-center gap-4 text-sm">
              <NavLink href="/editor">✏️ 编辑器</NavLink>
              <NavLink href="/schema-doc">📄 Schema 文档</NavLink>
            </div>

            <div className="flex-1" />

            <span className="text-xs text-stone-500">AI 辅助剧本创作工具</span>
          </nav>
        </header>

        {/* 主内容区 */}
        <main className="mx-auto max-w-7xl px-4 py-6">
          {children}
        </main>

        {/* 页脚 */}
        <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
          Powered by 阿里云通义千问 · YAML Screenplay Schema v1.0
        </footer>
      </body>
    </html>
  );
}

// ── 导航链接组件 ──

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded px-3 py-1.5 text-stone-500 no-underline transition-colors hover:bg-stone-100 hover:text-stone-800"
    >
      {children}
    </Link>
  );
}
