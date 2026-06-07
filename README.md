# Novel2Script AI

🎬 **AI 小说转剧本工具** — 将多章节小说自动转换为 YAML 格式的结构化剧本。支持电影、电视剧、短剧三种格式。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyzh-01%2FNovel2Script-AI&env=DASHSCOPE_API_KEY&envDescription=%E9%98%BF%E9%87%8C%E4%BA%91%20DashScope%20API%20Key&envLink=https%3A%2F%2Fdashscope.console.aliyun.com%2F&project-name=novel2script-ai&repository-name=Novel2Script-AI)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

>  在线 Demo：[novel2-script-ai.vercel.app](https://novel2-script-ai.vercel.app)

>Demo展示视频：[点击转至bilibili观看](https://www.bilibili.com/video/BV1g3Et65EWG/?vd_source=d44e247a23b620c9d22bdc327eb16f43) 

> **该在线Demo所接入的模型为阿里云`Qwen3-Max-2026-01-23`模型，有一定免费额度，可供少量试用。**

---

## 功能

- **双输入方式** — 手动粘贴章节 + 上传 `.txt` 小说文件（每章之间用'---'隔开，自动解析章节目录）
- **智能编码检测** — 自动识别 GBK / UTF-8 编码，告别乱码
- **AI 转换引擎** — 调用大模型提取角色、切分场景、生成对白，支持自动重试 + JSON 修复 + 枚举归一化
- **分栏编辑器** — 左侧 YAML 源码编辑（CodeMirror 6），右侧可读剧本预览，实时同步
- **实时校验** — Zod Schema 校验 + 角色一致性校验 + YAML 语法检查，行内标注问题
- **历史记录** — 所有转换自动保存，支持搜索、分页、在编辑器中重新打开编辑。**（Demo 版本：数据存储于 SQLite 文件，Vercel 实例重启后丢失。真实场景使用考虑迁移至 Turso / PostgreSQL）**
- **保存到历史** — 编辑后的 YAML 可手动保存到历史记录，元数据从 YAML 解析
- **下载导出** — 一键下载 `.yaml` 剧本文件
- **Schema 文档** — 内置完整的数据结构文档页，清晰展示所有字段定义

---

## 快速开始

```bash
npm install
cp .env.example .env.local   # 填入 DASHSCOPE_API_KEY
npm run dev                   # http://localhost:3000
```

或一键部署到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyzh-01%2FNovel2Script-AI&env=DASHSCOPE_API_KEY&envDescription=%E9%98%BF%E9%87%8C%E4%BA%91%20DashScope%20API%20Key&envLink=https%3A%2F%2Fdashscope.console.aliyun.com%2F&project-name=novel2script-ai&repository-name=Novel2Script-AI)

> **注意：** Vercel 使用无服务器部署，数据库文件存储在 `/tmp/dev.db`（实例级别，重启后丢失）。本地开发时使用 `./prisma/dev.db`。

---

## 使用流程

1. **输入小说** — 手动填写标题/类型/格式 + 粘贴章节内容，或直接上传 `.txt` 文件自动解析
2. **AI 转换** — 点击"转换为剧本"，两阶段流式处理：先提取角色 → 再生成场景
3. **编辑预览** — 自动跳转编辑器，支持分栏/YAML/预览三种视图，编辑实时校验
4. **保存/下载** — 保存到历史记录（数据库）或下载 YAML 文件到本地
5. **历史管理** — 在历史页搜索、查看详情、重新编辑或删除记录

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript (strict mode) |
| 样式 | Tailwind CSS 3 |
| 编辑器 | CodeMirror 6 (YAML 高亮 / 行号 / 折叠 / lint) |
| 校验 | Zod (前后端共享单一数据源) |
| 数据库 | SQLite (libSQL) + Prisma 7 |
| YAML 解析 | js-yaml |
| AI 服务 | 阿里云 DashScope (qwen3-max)，OpenAI 兼容协议 |

---

## 项目结构

```
Novel2Script-AI/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # 首页：小说信息 + 文件上传 + 章节输入
│   ├── layout.tsx                    # 根布局（导航栏 + 页脚）
│   ├── globals.css                   # Tailwind + CodeMirror 主题
│   ├── error.tsx                     # 全局错误边界
│   ├── editor/
│   │   ├── page.tsx                  # 编辑器：分栏/YAML/预览三视图 + 保存到历史
│   │   └── loading.tsx               # CodeMirror 加载骨架屏
│   ├── history/
│   │   ├── page.tsx                  # 历史记录列表（搜索 + 分页 + 删除）
│   │   └── [id]/page.tsx             # 历史详情（查看完整 YAML + 重新编辑）
│   ├── schema-doc/
│   │   └── page.tsx                  # Schema 文档页（完整字段说明）
│   └── api/
│       ├── convert/route.ts          # POST /api/convert — NDJSON 两阶段流式转换
│       └── history/
│           ├── route.ts              # GET/POST/DELETE /api/history — 历史记录 CRUD
│           └── [id]/route.ts         # GET /api/history/[id] — 单条记录详情
│
├── components/
│   ├── input/                        # 输入页组件
│   │   ├── ChapterInput.tsx          # 单章表单（标题 + 正文 + 字数统计）
│   │   └── ChapterList.tsx           # 章节列表（增删 + 校验汇总）
│   └── editor/                       # 编辑器组件
│       ├── ScreenplayEditor.tsx      # CodeMirror 6 YAML 编辑器（语法高亮 + lint）
│       ├── ScreenplayPreview.tsx     # YAML → 可读剧本渲染（角色表 + 场景列表）
│       ├── ValidationPanel.tsx       # Zod 校验结果面板
│       ├── DownloadButton.tsx        # 下载 .yaml 文件
│       ├── ConversionProgress.tsx    # 转换进度指示器
│       └── SceneChapterMap.tsx       # 章节 → 场景溯源映射表
│
├── hooks/                            # 客户端状态管理
│   ├── useChapterList.ts             # 章节增删改 + 批量导入
│   ├── useConvert.ts                 # 两阶段转换状态机
│   └── useEditorValidation.ts        # 编辑器实时校验（300ms 防抖）
│
├── lib/                              # 核心逻辑（前后端复用）
│   ├── schema.ts                     # Zod Schema 定义（单一数据源）
│   ├── prompt.ts                     # LLM System Prompt（Few-shot + 格式策略 + 类型策略）
│   ├── converter.ts                  # 转换管道（动态超时 + 重试 + JSON 修复 + 枚举归一化 + 字段注入）
│   ├── rate-limit.ts                 # 速率限制（令牌桶算法，按 IP+端点限流）
│   ├── yaml.ts                       # js-yaml 封装（JSON ↔ YAML）
│   ├── validators.ts                 # 前端校验（YAML 语法 + Zod + 一致性）
│   ├── parseChapters.ts              # .txt 章节解析（多策略正则匹配）
│   ├── prisma.ts                     # PrismaClient 单例（Vercel 感知 DB 路径）
│   └── db-init.ts                    # 异步数据库表初始化
│
├── types/index.ts                    # 全局 TypeScript 类型定义
├── constants/index.ts                # 全局常量（模型、枚举选项、ID 格式、限制）
│
├── docs/                             # 文档
│   ├── YAML-Schema.md                # Schema 完整参考文档
│   ├── 设计理念.md                    # 架构决策记录
│   ├── 开发路线图.md                  # 开发计划与验收标准
│   └── PR-初始发布.md                 # 原始 PR 描述
│
├── fixtures/                         # 测试用小说文本
│   ├── sci-fi-sample.txt             # 科幻（三体风格）
│   ├── romance-sample.txt            # 言情（都市爱情）
│   └── history-sample.txt            # 历史悬疑（狄仁杰探案）
│
├── prisma/
│   └── schema.prisma                 # Prisma Schema（ScreenplayRecord 模型）
│
├── public/schema-example.yaml        # 完整 YAML 示例（流浪地球）
└── CLAUDE.md                         # Claude Code 配置
```

---

## YAML Schema 设计

### 核心原则

1. **三层分离** — `meta`（元信息）→ `characters`（角色表）→ `scenes`（场景集），对应剧本工业标准
2. **单一数据源** — 角色通过 `CH-001` 格式 ID 引用，改一处生效全局
3. **discriminatedUnion** — 3 种 block 类型（action / dialogue / transition），每种只携带自己的字段
4. **source_chapter 必填** — 每个场景标注来源章节，支持溯源对照
5. **枚举归一化** — AI 输出可能不稳定（如 "protagonist"、"evening"），转管管道自动映射到合法枚举值，不阻塞转换
6. **系统字段注入** — `language`、`version`、`generated_at`、`generator` 由后端注入，LLM 不负责生成

### 示例

```yaml
meta:
  format: movie
  title: "流浪地球"
  genre: [sci-fi]
  language: zh-CN
characters:
  - id: CH-001
    name: "刘启"
    category: main
    gender: male
    description: "地下城居民，因地球危机踏上拯救之旅"
scenes:
  - id: SC-001
    scene_number: 1
    source_chapter: 1
    heading:
      interior: false
      location: "地下城 - 公路"
      time_of_day: night
    characters_present: [CH-001]
    blocks:
      - type: action
        text: "冰封的北京城。刘启驾驶运输车穿越风雪。"
      - type: dialogue
        character_id: CH-001
        text: "希望，像钻石一样珍贵。"
        delivery: voice_over
      - type: transition
        text: "CUT TO:"
```

完整 Schema 参考见 [docs/YAML-Schema.md](docs/YAML-Schema.md) 和 `/schema-doc` 页面。

---

## 架构决策

| 决策 | 选择 | 原因 |
|------|------|------|
| AI 输出格式 | LLM 输出 JSON，Zod 校验 | 格式正确靠 Schema，内容质量靠 Prompt |
| 等待体验 | 两阶段 NDJSON 流 | 先展示角色列表 + 场景大纲，再展示完整剧本 |
| 编辑器 | CodeMirror 6 | 150KB，比 Monaco 小 10x，YAML 编辑场景够用 |
| 章节上传 | 前端 FileReader 解析 | 纯浏览器端处理，不增加服务端开销 |
| 编码检测 | CJK 字符占比启发式 | 中文占比 < 2% 判定为 GBK，比 BOM 检测更可靠 |
| 错误恢复 | 重试注入 + JSON 修复 + 枚举归一化 | 三重容错，适配不同模型的输出质量波动 |
| 数据库 | SQLite (libSQL) + Prisma 7 | 零配置，Vercel 兼容（写入 /tmp）。**Demo 版本**：实例重启数据丢失，生产需迁移至 Turso 等云数据库 |
| 历史保存 | 转换自动保存 + 手动保存 | 原始转换和编辑后版本都可存入历史 |
| Vercel 部署 | 运行时检测 + /tmp 路径 | `.env` 文件优先级高于系统环境变量，需前置判断 |

---

## API

> 所有 `/api/history` 端点均受速率限制保护（30 req/min per IP），429 响应表示限流触发。

### POST /api/convert

将小说章节转换为剧本。

```json
// Request
{
  "title": "三体",
  "author": "刘慈欣",
  "genre": "sci-fi",
  "format": "movie",
  "chapters": [
    { "number": 1, "title": "疯狂年代", "content": "..." },
    { "number": 2, "title": "三体问题", "content": "..." },
    { "number": 3, "title": "地球三体组织", "content": "..." }
  ]
}

// Response: NDJSON stream
{"phase":"characters","characters":[...],"scene_outline":[...]}
{"phase":"complete","screenplay":{...},"yaml":"...","validation":{...}}
{"phase":"error","error":"错误描述"}
```

### GET /api/history

获取历史记录列表。

```
GET /api/history?page=1&pageSize=10&q=搜索关键词

// Response
{
  "records": [{ "id": 1, "title": "...", "genre": "...", "format": "...", ... }],
  "total": 42,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5
}
```

### POST /api/history

创建新的历史记录。

```json
// Request
{
  "title": "斗破苍穹",
  "novel": [{ "number": 1, "title": "...", "content": "..." }],
  "yaml": "meta:\n  title: ...",
  "genre": "fantasy",
  "format": "tv_series",
  "author": "天蚕土豆"
}
```

### DELETE /api/history?id=1

删除指定记录。

### GET /api/history/[id]

获取单条记录的完整内容（含 YAML 和小说原文）。

---

## 枚举归一化系统

AI 输出枚举值不稳定（如把 `main` 写成 `protagonist`，把 `dusk` 写成 `evening`），项目内置了别名映射表自动修正：

| 字段 | 示例 AI 输出 | 自动修正为 |
|------|-------------|-----------|
| `characters[].category` | `protagonist`, `antagonist`, `villain` | `main`, `supporting` |
| `characters[].gender` | `man`, `woman`, `男`, `女`, `m`, `f` | `male`, `female`, `other` |
| `heading.time_of_day` | `evening`, `sunset`, `midnight`, `sunrise` | `dusk`, `night`, `dawn` |
| `relationships[].type` | `friend`, `brother`, `teacher`, `master` | `ally`, `family`, `mentor_student` |
| `meta.genre` | `science_fiction`, `thriller`, `wuxia` | `sci-fi`, `mystery`, `history` |

详见 `lib/converter.ts` 中的 `autoFixPostProcess()` 函数。

---

## 切换模型

修改 `constants/index.ts` 中的 `LLM_MODEL` 和 `DASHSCOPE_BASE_URL`：

```ts
// 阿里云 DashScope（当前默认）
export const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
export const LLM_MODEL = 'qwen3-max-2026-01-23';

// OpenRouter
export const DASHSCOPE_BASE_URL = 'https://openrouter.ai/api/v1';
export const LLM_MODEL = 'openai/gpt-oss-120b:free';

// DeepSeek
export const DASHSCOPE_BASE_URL = 'https://api.deepseek.com';
export const LLM_MODEL = 'deepseek-chat';
```

同时更新 `.env.local` 中对应的 API Key 环境变量名。

---

## 部署

### Vercel（推荐）

点击按钮一键部署，环境变量 `DASHSCOPE_API_KEY` 自动配置：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyzh-01%2FNovel2Script-AI&env=DASHSCOPE_API_KEY&envDescription=%E9%98%BF%E9%87%8C%E4%BA%91%20DashScope%20API%20Key&envLink=https%3A%2F%2Fdashscope.console.aliyun.com%2F&project-name=novel2script-ai&repository-name=Novel2Script-AI)

或手动：

```bash
npm i -g vercel
vercel --prod
# 在 Vercel Dashboard → Settings → Environment Variables 中添加 DASHSCOPE_API_KEY
```

### Vercel 注意事项

- **数据库路径**：Vercel Serverless 文件系统只读，代码自动检测 `VERCEL` 环境变量并将数据库写入 `/tmp/dev.db`（实例临时存储）
- **实例重启后数据丢失**：Vercel 实例空闲后回收，`/tmp` 中的数据会被清除。如需持久化，考虑迁移到 Turso 等云数据库
- **超时限制**：Vercel Hobby 计划函数超时 10s，Pro 计划 60s。本项目已内置动态超时机制（120-300s，按文件大小缩放），但仍受 Vercel 平台硬限制。大文件建议本地部署或升级 Vercel 计划
- **速率限制**：API 端点内置令牌桶限流（30 req/min per IP），Vercel 部署下各实例独立计数。生产环境建议加网关层限流

### 自部署

```bash
npm run build
npm start                     # 默认 http://localhost:3000
```

---

## License

MIT
