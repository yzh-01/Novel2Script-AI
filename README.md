# Novel2Script AI

**AI 小说转剧本工具** — 将多章节小说自动转换为 YAML 格式剧本。支持电影、电视剧、短剧。

## 快速开始

```bash
# 安装依赖
npm install

# 配置 API Key
cp .env.example .env.local
# 编辑 .env.local，替换 ANTHROPIC_API_KEY 为你的 Claude API Key

# 启动开发服务器
npm run dev
# → 打开 http://localhost:3000
```

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 编辑器 | CodeMirror 6 |
| 校验 | Zod（前后端共享） |
| YAML | js-yaml |
| AI | Claude API (Anthropic) |

## 使用流程

1. **输入页** — 填写小说标题、类型、格式，粘贴 ≥3 章内容
2. **点转换** — 跳转编辑器页，自动调 Claude API
3. **编辑** — 在 YAML 编辑器中修改，实时校验 + 可读预览
4. **下载** — 导出 .yaml 剧本文件

## 项目结构

```
app/           Next.js App Router（页面 + API）
components/    React 组件（按 input/editor 分组）
hooks/         客户端状态管理
lib/           核心逻辑（Schema / Prompt / 转换 / 校验 / YAML 工具）
constants/     全局常量
types/         TypeScript 类型定义
docs/          YAML Schema 文档 + 设计理念 + 开发路线图
fixtures/      测试用小说文本（科幻 / 言情 / 历史）
```

## Schema 文档

详见 [docs/YAML-Schema.md](docs/YAML-Schema.md) 和 Schema 文档页（`/schema-doc`）。

## 部署

```bash
npm run build  # → Vercel / 任意 Node.js 环境
```

## License

MIT
