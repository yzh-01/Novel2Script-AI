# YAML Screenplay Schema v1.0

**适用范围：** 电影 (movie) · 电视剧 (tv_series) · 短剧 (short_drama)

---

## 设计理念

本 Schema 遵循三个核心原则：

1. **单一数据源** — 所有角色、场景通过 ID 引用，不存在冗余副本。改角色名只需改一处，杜绝数据不一致。
2. **LLM 生成友好** — 结构清晰、字段语义明确、选项精简。每个场景有 `summary` 供 LLM 在生成 blocks 前定位方向，`dialogue.emotion` 和 `delivery` 提供明确的情感标注信号。
3. **三层分离** — `meta`（元信息）/ `characters`（角色表）/ `scenes`（场景集）三层独立，对应剧本工业标准中的"故事大纲 → 人物小传 → 场次表"。

### 为什么不设 `config` 段？

`config` 中的信息（编号策略、ID 格式、默认转场）要么可从 `meta.format` 推导，要么已有 Zod 正则校验约束。多一个 config 段等于给 LLM 增加"先理解 config 再理解正文"的负担，且实际约束力很弱（ID 格式的最终裁判是校验层，不是 config 里的字符串模板）。

### 为什么 `time_of_day` 只有 `day` 和 `night`？

行业标准剧本的 Slug Line 只用 DAY 或 NIGHT。具体时间信息（清晨/黄昏/下午）合并到 `location` 字段中，避免 LLM 在 7 个枚举值之间反复摇摆。简洁的选项 = 稳定的输出。

### 为什么 blocks 用 discriminatedUnion？

剧本内容块有三种类型（action / dialogue / transition），每种携带不同字段。用 discriminated union（按 `type` 字段分发校验）确保：
- dialogue 必须有 `character_id`，action 不需要
- transition 只需 `text`，不带角色信息
- Zod 校验在编译期就能区分非法组合，而非依赖运行时判断

### 为什么只有 3 种 block type？

标准剧本格式中，character_cue（角色出场提示）本质上是 action 的一部分，parenthetical（表演提示）本质上是 dialogue 的修饰。合并后减少 block 类型数 = 减少 LLM 决策负担 = 提高输出一致性。

---

## 完整字段定义

### `meta` — 元信息

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `format` | enum | ✓ | `movie` \| `tv_series` \| `short_drama` — 顶层分支开关 |
| `title` | string | ✓ | 剧本标题 |
| `subtitle` | string | | 副标题 |
| `genre` | string[] | | 类型标签：sci-fi / romance / mystery / history / fantasy / other。LLM 风格提示 |
| `source` | object | | 改编来源：{ type, title, author? } |
| `language` | string | ✓ | 语言代码，默认 zh-CN |
| `version` | string | ✓ | Schema 版本号，未来迁移用 |
| `generated_at` | string | ✓ | ISO 8601 生成时间 |
| `generator` | string | ✓ | 生成工具标识 |

**注意：** 不设 `total_scenes` 字段。该值等于 `scenes.length`，可推导。手动编辑后不一致会引入 bug。

---

### `characters` — 角色表

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `id` | string | ✓ | `CH-001` 格式，全局唯一引用键 |
| `name` | string | ✓ | 角色名 |
| `aliases` | string[] | | 别名/化名/绰号，LLM 据此判断对话归属 |
| `category` | enum | ✓ | main \| supporting \| guest \| cameo \| extras |
| `gender` | enum | ✓ | male \| female \| other |
| `age_display` | string | | 对外展示年龄，如 "28岁" |
| `archetype` | string | | 角色原型：hero / mentor / trickster / love_interest / villain… |
| `traits` | string[] | | 性格标签 |
| `description` | string | ✓ | 一句话角色简介 |
| `arc` | string | | 角色弧光简述 |
| `relationships` | array | | 重要关系列表：[{ target, type, description? }] |
| `notes` | string | | **自由文本扩展口**，创作者可写任意备注 |

---

### `episodes` — 剧集（电影格式省略）

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `id` | string | ✓ | `EP-01` 格式 |
| `number` | int | ✓ | 集号 |
| `title` | string | ✓ | 本集标题 |
| `cold_open` | boolean | | 是否有冷开场 |
| `synopsis` | string | | 本集一句话概要 |

**设计决策：** 只保留 `scenes[].episode`（场景知道自己在哪一集），不设 `episodes[].scenes[]`。避免双向引用导致的不一致。需要查"某一集有哪些场景"时，消费端 filter 即可。

---

### `scenes` — 场景集

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `id` | string | ✓ | `SC-001` 格式 |
| `scene_number` | int | ✓ | 显示序号 |
| `episode` | int | | 所属集号（电影格式省略） |
| `act` | int | | 幕号 (1/2/3)，剧本骨架 |
| `source_chapter` | int \| int[] | | **★ 小说转剧本核心**：溯源到原文第几章 |
| `heading` | object | ✓ | 场景标题 |
| `summary` | string | | 本场一句话概括（LLM 生成时的定位锚点） |
| `characters_present` | string[] | ✓ | 出场角色 ID 列表 |
| `props` | string[] | | 重要道具列表 |
| `blocks` | array | ✓ | 剧本内容块（顺序执行） |

#### `heading` 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `interior` | boolean | ✓ | true = INT.（内景）/ false = EXT.（外景） |
| `location` | string | ✓ | 地点描述，"场景 - 具体位置" |
| `time_of_day` | enum | ✓ | **仅 day / night**（行业标准） |
| `extra` | string | | 额外标记：闪回 / 梦境 / 连续 / 蒙太奇（**开放文本，不设枚举**） |

---

### `blocks[]` — 剧本内容块

#### `action` — 动作/场景/环境描写

```yaml
- type: action
  text: "窗外大雨倾盆。张三坐在沙发上，盯着手中的信。"
```

#### `dialogue` — 对白

```yaml
- type: dialogue
  character_id: "CH-001"           # 引用 characters[].id
  text: "你终于来了。"
  parenthetical: "(低声)"          # 可选，表演提示
  delivery: on_screen              # 可选，默认为 on_screen
  emotion: "压抑的愤怒"            # 可选，情感方向
  continuation: false              # 可选，对白被 action 打断后继续
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `character_id` | string | ✓ | 引用 characters[].id |
| `text` | string | ✓ | 对白内容 |
| `parenthetical` | string | | 表演提示（如"(低声)"） |
| `delivery` | enum | | on_screen \| voice_over \| off_screen — **小说改编关键**：旁白→voice_over |
| `emotion` | string | | 情感标注（"愤怒""温柔""恐惧"），比自由 parenthetical 更结构化 |
| `continuation` | boolean | | 被 action 打断后继续同一角色的对白。标记为 optional，LLM 可选择每次都显式写 character_id |

#### `transition` — 转场

```yaml
- type: transition
  text: "FADE OUT."
```

---

## 完整示例

参见 `public/schema-example.yaml`（以《流浪地球》为例）。

---

## 向后兼容策略

未来新增 block type 时（如 v1.1 的 `montage`、`lyrics`），旧版本的 Zod Schema 使用 `z.discriminatedUnion` 会遇到未知 type 报错。兼容方案：

1. **宽松模式**：在 union 末尾加 catch-all `z.object({ type: z.string(), text: z.string() })`，让新 type 不会导致旧 Schema 拒绝
2. **版本迁移**：通过 `meta.version` 判读版本，选择对应 Zod Schema

---

## 与 Zod 代码的对应关系

本 Schema 的可执行形式定义见 `lib/schema.ts`（Zod Schema，前后端共享）。文档中的类型约束 = Zod 中的校验规则。两者保持严格一致。
