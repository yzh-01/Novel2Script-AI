// ============================================================
// app/schema-doc/page.tsx — YAML Schema 文档页
// 从 docs/YAML-Schema.md 静态渲染
// ============================================================

import fs from 'fs';
import path from 'path';

// 读取 Markdown 文件
function getSchemaDoc(): string {
  const docPath = path.join(process.cwd(), 'docs', 'YAML-Schema.md');
  try {
    return fs.readFileSync(docPath, 'utf-8');
  } catch {
    return '# Schema 文档\n\n文档正在编写中，请稍后查看。';
  }
}

export default function SchemaDocPage() {
  const content = getSchemaDoc();

  return (
    <div className="mx-auto max-w-3xl">
      <article
        className="prose prose-stone prose-headings:font-semibold prose-a:text-amber-700
                   prose-code:rounded prose-code:bg-stone-100 prose-code:px-1 prose-code:text-sm
                   prose-pre:bg-stone-900 prose-pre:text-stone-100
                   max-w-none"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
}

// 简易 Markdown → HTML 渲染器
// 生产环境建议换 next-mdx-remote 或 @next/mdx
// 此处用最小实现覆盖文档需求
function renderMarkdown(md: string): string {
  let html = md
    // 标题
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-stone-800">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-8 mb-3 text-stone-800 border-b pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-10 mb-4 text-stone-900">$1</h1>')
    // 代码块（```...```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
      `<pre class="rounded-lg bg-stone-900 p-4 overflow-x-auto my-3"><code class="text-sm text-stone-100">${escapeHtml(code.trim())}</code></pre>`
    )
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="rounded bg-stone-100 px-1 text-sm text-amber-800">$1</code>')
    // 粗体
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // 斜体
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 水平线
    .replace(/^---$/gm, '<hr class="my-6 border-stone-200">')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-stone-700">$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-stone-700">$1</li>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-amber-300 pl-4 my-3 text-stone-600 italic">$1</blockquote>')
    // 段落（连续空行 → </p><p>)
    .replace(/\n\n/g, '</p><p class="my-3 text-stone-700 leading-relaxed">')
    // 单换行 → <br>
    .replace(/\n(?!<)/g, '<br>');

  html = '<p class="my-3 text-stone-700 leading-relaxed">' + html + '</p>';
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
