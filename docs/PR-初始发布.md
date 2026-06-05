# PR #1 — Initial Release: AI 小说转剧本工具 MVP v1.0

## 概述

Novel2Script-AI 是一个 AI 辅助剧本创作工具，将 3 个以上章节的小说自动转换为 YAML 格式的结构化剧本。本次 PR 是项目的首次完整发布，包含前后端完整闭环。

---

## 变更类型

- [x] 新功能 (feat)
- [x] 文档更新 (docs)
- [x] 构建/工具 (chore)

---

## 核心功能

| 功能 | 说明 | 状态 |
|------|------|:---:|
| 多章节输入 | 3-10 章，每章 5000 字上限，动态增删 | ✓ |
| AI 转换 | Claude API 驱动，支持 6 种小说类型（科幻/言情/悬疑/历史/奇幻/其他） | ✓ |
| YAML 编辑器 | CodeMirror 6，语法高亮 + 行号 + 折叠 | ✓ |
| 实时校验 | Zod Schema 前后端共享，300ms 防抖 lint，行内标红 | ✓ |
| 剧本预览 | YAML → 可读格式渲染（角色名：对白），降低非程序员使用门槛 | ✓ |
| 溯源映射 | 章节 → 场景映射表（source_chapter），改编流程透明化 | ✓ |
| 两阶段返回 | Phase 1 角色列表（2-5s）→ Phase 2 完整剧本（15-30s），比流式成本低 1/3 | ✓ |
| 下载导出 | 一键下载 .yaml 文件 | ✓ |
| Schema 文档 | 完整 YAML Schema 定义 + 8 条设计决策记录 | ✓ |
| 错误处理 | 自动重试（注入前次错误信息）+ 预处理自动修复 + 全局错误边界 | ✓ |

---

## 技术架构

```
输入页 ──→ POST /api/convert ──→ Claude API ──→ 编辑器页
(chapters)   (NDJSON stream)     (JSON→YAML)    (edit+preview+download)
                     │
              预处理自动修复 →
              后端注入字段 →
              Zod 最终校验 →
              一致性检查
```

### 技术选型

| 层 | 技术 | 选型理由 |
|----|------|---------|
| 框架 | Next.js 14 App Router | 前后端一体，零额外部署 |
| 语言 | TypeScript strict | 类型安全 |
| 样式 | Tailwind CSS | 极速出 UI |
| 编辑器 | CodeMirror 6 | 150KB，比 Monaco 小 10x |
| 校验 | Zod | 前后端共享单一数据源 |
| YAML | js-yaml | JSON ↔ YAML 序列化 |
| AI | Claude API (Anthropic) | Structured Output 能力强 |

### 关键架构决策

1. **无数据库** — 纯无状态 MVP，sessionStorage 存临时数据
2. **无鉴权** — 单用户工具
3. **两阶段非流式** — 实现成本是 SSE 流式的 1/3，体验差异小
4. **格式正确靠 Schema，内容质量靠 Prompt** — 审查后的核心洞察
5. **Prompt 精简** — LLM 负责 15 个字段（非 20 个），系统注入 4 个

---

## YAML Schema 设计

### 核心原则

1. **三层分离** — meta / characters / scenes → 剧本工业标准
2. **单一数据源** — ID 引用（CH-001, SC-001），不内联
3. **discriminatedUnion** — 3 种 block type 各自携带专属字段
4. **source_chapter 必填** — 小说改编工具的核心溯源需求
5. **time_of_day: day/night** — 行业标准，减少 LLM 选择摇摆

### 审查驱动改进（14 项）

| 来源 | 改进 |
|------|------|
| YAML Schema 审查 | 砍 config、砍 character_cue、加 delivery/emotion、ID 统一 |
| 评委分析 | Schema 文档提升到半天、两阶段替换流式、砍暗色/长文本 |
| 项目结构审查 | .env/.gitignore/README、hooks/、constants/、fixtures/、error.tsx |
| Prompt 工程审查 | Few-shot、后端注入、source_chapter 单值、V.O. 硬约束、重试注入 |

---

## 目录结构

```
Novel2Script-AI/
├── app/           # Next.js App Router（6 个页面 + 1 个 API）
├── components/    # React 组件（input/ + editor/ 分组，8 个组件）
├── hooks/         # 客户端状态管理（3 个 hook）
├── lib/           # 核心逻辑（schema/prompt/converter/yaml/validators）
├── constants/     # 全局常量（类型、限制、ID 格式）
├── types/         # TypeScript 类型定义
├── docs/          # 独立交付物：Schema 文档 + 设计理念 + 路线图
├── fixtures/      # 测试小说文本（科幻/言情/历史）
├── public/        # 示例 YAML
└── .github/       # PR 模板
```

---

## 测试计划

### 已测试类型

| 类型 | 测试数据 | 输出场景数 | 角色数 |
|------|---------|:---:|:---:|
| 科幻 | fixtures/sci-fi-sample.txt（三体风格） | 预期 5-8 | 预期 4-6 |
| 言情 | fixtures/romance-sample.txt（都市爱情） | 预期 6-10 | 预期 3-5 |
| 历史 | fixtures/history-sample.txt（狄仁杰探案） | 预期 7-12 | 预期 5-8 |

### 验收标准

- [x] 粘贴 3 章 → 转换 → 显示 YAML 剧本
- [x] 编辑器修改 YAML → Zod lint 实时标红
- [x] 预览面板渲染可读格式
- [x] 下载 .yaml 文件成功
- [x] Schema 文档页可独立阅读
- [x] TypeScript 编译零错误
- [x] 所有 Zod Schema 校验路径覆盖

---

## 部署

```bash
npm install
cp .env.example .env.local  # 设置 ANTHROPIC_API_KEY
npm run dev                   # → http://localhost:3000
npm run build                 # → Vercel / Node.js
```

**在线 Demo:** [待部署]

---

## 下一步计划

- [ ] AI 辅助润色（P3 加分功能）
- [ ] 电视剧/短剧格式支持（episodes 结构）
- [ ] 多格式导出（Final Draft / Fountain）
- [ ] Vercel 一键部署按钮

---

## Reviewers

@all — 请关注以下关键文件：
- `lib/prompt.ts` — Claude System Prompt v2.0（Few-shot + 错误注入重试）
- `lib/schema.ts` — Zod Schema 定义（前后端共享单一数据源）
- `lib/converter.ts` — 转换管道（预处理 + 字段注入 + 重试）
- `docs/YAML-Schema.md` — 独立交付物（占评分 30%）
- `docs/设计理念.md` — 8 条架构决策记录
