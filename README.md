# Novel2Script AI

🎬 **AI 小说转剧本工具** — 将多章节小说自动转换为 YAML 格式的结构化剧本。支持电影、电视剧、短剧。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyzh-01%2FNovel2Script-AI&env=DASHSCOPE_API_KEY&envDescription=%E9%98%BF%E9%87%8C%E4%BA%91%20DashScope%20API%20Key&envLink=https%3A%2F%2Fdashscope.console.aliyun.com%2F&project-name=novel2script-ai&repository-name=Novel2Script-AI)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/yzh-01/Novel2Script-AI)

> 🚀 在线 Demo：[https://novel2script.vercel.app](https://novel2script.vercel.app)（待部署后替换）

---

## 快速开始

```bash
npm install
cp .env.example .env.local   # 填入 DASHSCOPE_API_KEY
npm run dev                   # http://localhost:3000
```

或一键部署到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyzh-01%2FNovel2Script-AI&env=DASHSCOPE_API_KEY&envDescription=%E9%98%BF%E9%87%8C%E4%BA%91%20DashScope%20API%20Key&envLink=https%3A%2F%2Fdashscope.console.aliyun.com%2F&project-name=novel2script-ai&repository-name=Novel2Script-AI)

---

## 使用流程

1. **上传或粘贴** — 上传 `.txt` 文件（自动解析章节），或手动粘贴 ≥3 章内容
2. **配置** — 选择小说类型（科幻/言情/悬疑/历史/奇幻/其他）和目标格式（电影/电视剧/短剧）
3. **转换** — 点击按钮，AI 自动提取角色、切分场景、生成对白
4. **编辑** — YAML 源码编辑器 + 可读剧本预览，实时 Zod 校验 + 行内纠错
5. **下载** — 导出 `.yaml` 剧本文件

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript (strict mode) |
| 样式 | Tailwind CSS 3 |
| 编辑器 | CodeMirror 6 (YAML 高亮 / 行号 / 折叠 / lint) |
| 校验 | Zod (前后端共享单一数据源) |
| YAML | js-yaml |
| AI | 阿里云 DashScope (qwen3-max)，OpenAI 兼容协议 |

---

## 项目结构

```
Novel2Script-AI/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 首页：小说信息 + 文件上传 + 章节输入
│   ├── layout.tsx                # 根布局（导航栏 + 页脚）
│   ├── globals.css               # Tailwind + CodeMirror 主题
│   ├── error.tsx                 # 全局错误边界
│   ├── editor/
│   │   ├── page.tsx              # 编辑器：YAML / 预览 / 分栏 三视图
│   │   └── loading.tsx           # CodeMirror 加载骨架屏
│   ├── schema-doc/
│   │   └── page.tsx              # Schema 文档页（服务端渲染 Markdown）
│   └── api/convert/
│       └── route.ts              # POST /api/convert — NDJSON 两阶段流
│
├── components/
│   ├── input/                    # 输入页组件
│   │   ├── ChapterInput.tsx      # 单章表单（标题 + 正文 + 字数）
│   │   └── ChapterList.tsx       # 章节列表（增删 + 校验汇总）
│   └── editor/                   # 编辑器组件
│       ├── ScreenplayEditor.tsx  # CodeMirror 6 YAML 编辑器
│       ├── ScreenplayPreview.tsx # YAML → 可读剧本渲染
│       ├── ValidationPanel.tsx   # Zod 校验结果面板
│       ├── DownloadButton.tsx    # 下载 .yaml 文件
│       ├── ConversionProgress.tsx# 四步转换进度指示器
│       └── SceneChapterMap.tsx   # 章节 → 场景溯源映射表
│
├── hooks/                        # 客户端状态管理
│   ├── useChapterList.ts         # 章节增删改 + 批量导入
│   ├── useConvert.ts             # 两阶段转换状态机
│   └── useEditorValidation.ts   # 编辑器实时校验（300ms 防抖）
│
├── lib/                          # 核心逻辑（纯函数，前后端复用）
│   ├── schema.ts                 # Zod Schema 定义（单一数据源）
│   ├── prompt.ts                 # LLM System Prompt（Few-shot + 类型策略）
│   ├── converter.ts              # 转换管道（重试 + JSON 修复 + 字段注入）
│   ├── yaml.ts                   # js-yaml 封装（JSON ↔ YAML）
│   ├── validators.ts             # 前端校验（YAML 语法 + Zod + 一致性）
│   └── parseChapters.ts          # .txt 章节解析（4 种分隔策略）
│
├── types/index.ts                # 全局 TypeScript 类型
├── constants/index.ts            # 全局常量（模型、限制、ID 格式）
│
├── docs/                         # 独立交付物
│   ├── YAML-Schema.md            # Schema 完整文档（字段 + 设计原因 + 示例）
│   ├── 设计理念.md                # 8 条架构决策记录
│   └── 开发路线图.md              # 3 天开发计划 + 验收标准
│
├── fixtures/                     # 测试用小说文本
│   ├── sci-fi-sample.txt         # 科幻（三体风格）
│   ├── romance-sample.txt        # 言情（都市爱情）
│   └── history-sample.txt        # 历史悬疑（狄仁杰探案）
│
└── public/schema-example.yaml    # 完整 YAML 示例（流浪地球）
```

---

## YAML Schema 设计

### 核心原则

1. **三层分离** — `meta`（元信息）/ `characters`（角色表）/ `scenes`（场景集），对应剧本工业标准
2. **单一数据源** — 角色通过 `CH-001` 格式 ID 引用，改一处生效全局
3. **discriminatedUnion** — 3 种 block 类型（action / dialogue / transition），每种只携带自己的字段
4. **source_chapter 必填** — 每个场景标注来源章节，支持溯源对照
5. **time_of_day 仅 day/night** — 符合行业标准，减少 LLM 选择摇摆

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
    source_chapter: 1
    heading:
      interior: false
      location: "地下城 - 公路"
      time_of_day: day
    blocks:
      - type: dialogue
        character_id: CH-001
        text: "希望，像钻石一样珍贵。"
        delivery: voice_over
      - type: transition
        text: "CUT TO:"
```

完整 Schema 见 [docs/YAML-Schema.md](docs/YAML-Schema.md) 和 `/schema-doc` 页面。

---

## 架构决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 状态管理 | 无状态 MVP | 零数据库开销，sessionStorage 桥接页面 |
| 等待体验 | 两阶段 NDJSON | 实现成本是 SSE 流式 1/3，体验差异小 |
| 格式约束 | Zod（代码）> Prompt（文字） | LLM 输出 JSON，Zod 校验；格式规则不占用 Prompt token |
| 编辑器 | CodeMirror 6 | 150KB，比 Monaco 小 10x，YAML 场景够用 |
| 章节上传 | 前端解析 | 纯浏览器端 FileReader，不增加服务端开销 |
| 错误恢复 | 重试 + JSON 修复 + 空值回退 | 三重容错，适配不同模型的输出质量波动 |

---

## API

### POST /api/convert

```json
// Request
{
  "title": "三体",
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
```

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

### 自部署

```bash
npm run build
npm start                     # 默认 http://localhost:3000
```

---

## License

MIT
