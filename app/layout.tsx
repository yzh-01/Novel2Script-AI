// ============================================================
// Novel2Script-AI — 根布局
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Novel2Script AI — 小说转剧本工具',
  description: '将多章节小说自动转换为 YAML 格式剧本。支持电影、电视剧、短剧。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen text-stone-900 antialiased">
        {/* 导航栏 — 毛玻璃效果 */}
        <header className="sticky top-0 z-50 border-b border-stone-200/60 bg-white/70 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2.5 no-underline">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-sm text-white shadow-sm transition-transform group-hover:scale-105">
                N
              </span>
              <span className="text-base font-semibold tracking-tight text-stone-800">
                Novel<span className="text-gradient">2</span>Script
              </span>
            </Link>

            {/* 导航链接 */}
            <div className="flex items-center gap-1 text-sm">
              <NavLink href="/editor">编辑器</NavLink>
              <NavLink href="/schema-doc">Schema 文档</NavLink>
            </div>

            <div className="flex-1" />

            {/* 右侧标签 */}
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              AI 辅助剧本创作
            </span>
          </nav>
        </header>

        {/* 主内容区 */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>

        {/* 页脚 */}
        <footer className="border-t border-stone-200/60 py-6 text-center text-xs text-stone-400">
          <span className="inline-flex items-center gap-1.5">
            Powered by 阿里云通义千问
            <span className="text-stone-300">·</span>
            YAML Screenplay Schema v1.0
          </span>
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
      className="rounded-lg px-3 py-1.5 text-stone-500 no-underline transition-all duration-200 hover:bg-stone-100/80 hover:text-stone-800"
    >
      {children}
    </Link>
  );
}
