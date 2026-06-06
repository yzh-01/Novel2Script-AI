// ============================================================
// Schema 文档页 — 完整 YAML Screenplay Schema 说明
// ============================================================

export default function SchemaDocPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 pb-20">
      {/* 标题 */}
      <header className="border-b border-stone-200 pb-6">
        <h1 className="text-3xl font-bold text-stone-900">YAML Screenplay Schema v1.0</h1>
        <p className="mt-2 text-stone-600">
          适用于电影 (movie)、电视剧 (tv_series)、短剧 (short_drama) 三种格式的结构化剧本定义。
        </p>
      </header>

      {/* 快速示例 */}
      <Section title="快速示例">
        <CodeBlock lang="yaml">{`meta:
  format: movie
  title: "流浪地球"
  genre: [sci-fi]
characters:
  - id: CH-001
    name: "刘启"
    category: main
    gender: male
    description: "地下城居民"
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
        text: "CUT TO:"`}</CodeBlock>
      </Section>

      {/* 设计理念 */}
      <Section title="设计理念">
        <PrincipleList items={[
          { title: '三层分离', desc: 'meta（元信息）→ characters（角色表）→ scenes（场景集），对应剧本工业标准的"故事大纲 → 人物小传 → 场次表"。' },
          { title: '单一数据源', desc: '角色通过 CH-001 格式 ID 引用。改角色名只需改一处，杜绝数据不一致。' },
          { title: 'discriminatedUnion', desc: '3 种 block 类型（action / dialogue / transition），每种只携带自己的字段。Zod 在编译期拒绝非法组合。' },
          { title: '格式靠 Schema，内容靠 Prompt', desc: 'LLM 输出 JSON + Zod 校验保证格式正确；Prompt 专注于内容决策（切场景、提角色、转对白）。' },
        ]} />
      </Section>

      {/* meta */}
      <Section title="meta — 元信息">
        <FieldTable
          fields={[
            ['format', 'enum', '✓', 'movie | tv_series | short_drama — 顶层分支开关'],
            ['title', 'string', '✓', '剧本标题'],
            ['subtitle', 'string', '', '副标题'],
            ['genre', 'string[]', '', '类型标签：sci-fi / romance / mystery / history / fantasy / other'],
            ['source', 'object', '', '改编来源：{ type, title, author? }'],
            ['language', 'string', '✓', '语言代码，默认 zh-CN（系统注入）'],
            ['version', 'string', '✓', 'Schema 版本号（系统注入）'],
            ['generated_at', 'string', '✓', 'ISO 8601 生成时间（系统注入）'],
            ['generator', 'string', '✓', '生成工具标识（系统注入）'],
          ]}
        />
        <Note>
          <strong>为什么没有 config 段？</strong> 编号策略可从 format 推导，ID 格式由 Zod 正则约束。多一个 config 段 = 给 LLM 增加无效认知负担。
        </Note>
      </Section>

      {/* characters */}
      <Section title="characters — 角色表">
        <FieldTable
          fields={[
            ['id', 'string', '✓', 'CH-001 格式，全局唯一引用键'],
            ['name', 'string', '✓', '角色名'],
            ['aliases', 'string[]', '', '别名/化名/绰号'],
            ['category', 'enum', '✓', 'main | supporting | guest | cameo | extras'],
            ['gender', 'enum', '✓', 'male | female | other'],
            ['age_display', 'string', '', '展示年龄，如 "28岁"'],
            ['archetype', 'string', '', '角色原型：hero / mentor / love_interest / villain…'],
            ['traits', 'string[]', '', '性格标签'],
            ['description', 'string', '✓', '一句话角色简介'],
            ['arc', 'string', '', '角色弧光简述'],
            ['relationships', 'array', '', '重要关系：[{ target, type, description? }]'],
            ['notes', 'string', '', '自由文本扩展口'],
          ]}
        />
        <Note>
          <strong>为什么用 ID 引用而非内联？</strong> 一个角色可能出现在 30 个场景中。ID 引用 = 数据库范式化在剧本领域的应用。改一处生效全局。
        </Note>
      </Section>

      {/* scenes */}
      <Section title="scenes — 场景集">
        <FieldTable
          fields={[
            ['id', 'string', '✓', 'SC-001 格式'],
            ['scene_number', 'int', '✓', '显示序号'],
            ['episode', 'int', '', '所属集号（电影格式省略）'],
            ['act', 'int', '', '幕号（1/2/3）'],
            ['source_chapter', 'int', '✓', '来源章节号（小说改编核心字段）'],
            ['heading', 'object', '✓', '场景标题（见下方）'],
            ['summary', 'string', '', '本场一句话概括'],
            ['characters_present', 'string[]', '✓', '出场角色 ID 列表'],
            ['props', 'string[]', '', '重要道具'],
            ['blocks', 'array', '✓', '剧本内容块（顺序执行）'],
          ]}
        />

        <h4 className="mt-6 mb-3 text-base font-semibold text-stone-800">heading 子字段</h4>
        <FieldTable
          fields={[
            ['interior', 'boolean', '✓', 'true = INT.（内景）/ false = EXT.（外景）'],
            ['location', 'string', '✓', '"大地点 - 具体位置"'],
            ['time_of_day', 'enum', '✓', 'dawn / morning / afternoon / dusk / day / night'],
            ['extra', 'string', '', '闪回 / 梦境 / 蒙太奇（开放文本）'],
          ]}
        />
        <Note>
          <strong>time_of_day 可选值：</strong> dawn（拂晓）、morning（晨）、afternoon（午后）、dusk（黄昏）、day（日）、night（夜）。默认 day。
        </Note>
      </Section>

      {/* blocks */}
      <Section title="blocks — 剧本内容块">
        <p className="mb-4 text-stone-700">三种类型，通过 Zod discriminatedUnion 按 type 字段分发校验：</p>

        <div className="space-y-6">
          <BlockDef title="action — 动作/场景描写" color="blue">
            <CodeBlock lang="yaml">{`- type: action
  text: "窗外大雨倾盆。张三坐在沙发上，盯着手中的信。"`}</CodeBlock>
            <FieldTable mini fields={[['text', 'string', '✓', '动作/环境/人物入场描述']]} />
          </BlockDef>

          <BlockDef title="dialogue — 对白" color="amber">
            <CodeBlock lang="yaml">{`- type: dialogue
  character_id: "CH-001"
  text: "你终于来了。"
  parenthetical: "(低声)"        # 可选：表演提示
  delivery: on_screen            # 可选：on_screen | voice_over | off_screen
  emotion: "压抑的愤怒"          # 可选：情感标注
  continuation: false            # 可选：被 action 打断后继续`}</CodeBlock>
            <FieldTable mini fields={[
              ['character_id', 'string', '✓', '引用 characters[].id'],
              ['text', 'string', '✓', '对白内容'],
              ['parenthetical', 'string', '', '(低声) 等表演提示'],
              ['delivery', 'enum', '', 'on_screen | voice_over | off_screen'],
              ['emotion', 'string', '', '情感标注，比自由 parenthetical 更结构化'],
              ['continuation', 'boolean', '', '对白被 action 打断后继续同一角色'],
            ]} />
            <Note>
              <strong>V.O. 硬约束：</strong> voice_over 旁白必须在原文有对应文字。禁止将"她很不安"这类概括性心理描述改写为具体独白。
            </Note>
          </BlockDef>

          <BlockDef title="transition — 转场" color="gray">
            <CodeBlock lang="yaml">{`- type: transition
  text: "FADE OUT."`}</CodeBlock>
            <FieldTable mini fields={[['text', 'string', '✓', 'CUT TO: / FADE OUT / DISSOLVE TO / MATCH CUT TO']]} />
          </BlockDef>
        </div>

        <Note>
          <strong>为什么只有 3 种？</strong> character_cue（角色出场）并入 action，parenthetical（表演提示）并入 dialogue。类型越少 → LLM 决策负担越小 → 输出一致性越高。
        </Note>
      </Section>

      {/* episodes */}
      <Section title="episodes — 剧集（电视剧/短剧）">
        <FieldTable
          fields={[
            ['id', 'string', '✓', 'EP-01 格式'],
            ['number', 'int', '✓', '集号'],
            ['title', 'string', '✓', '本集标题'],
            ['cold_open', 'boolean', '', '是否有冷开场（片头前悬念场景）'],
            ['synopsis', 'string', '', '本集一句话概要'],
          ]}
        />
        <Note>
          <strong>电影格式不使用此字段。</strong> 不输出 episodes: null 或 episodes: []，直接省略整个键。场景属于哪一集由 scenes[].episode 字段标注，不设反向引用，避免双向数据不一致。
        </Note>
      </Section>

      {/* ID 格式规范 */}
      <Section title="ID 格式规范">
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-left">
                <th className="px-4 py-2.5 font-medium text-stone-600">实体</th>
                <th className="px-4 py-2.5 font-medium text-stone-600">格式</th>
                <th className="px-4 py-2.5 font-medium text-stone-600">示例</th>
                <th className="px-4 py-2.5 font-medium text-stone-600">Zod 正则</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr><td className="px-4 py-2.5">角色</td><td className="px-4 py-2.5 font-mono">CH-001</td><td className="px-4 py-2.5 font-mono text-stone-500">CH-001, CH-042</td><td className="px-4 py-2.5 font-mono text-amber-700">{`/^CH-\\d{3}$/`}</td></tr>
              <tr><td className="px-4 py-2.5">场景</td><td className="px-4 py-2.5 font-mono">SC-001</td><td className="px-4 py-2.5 font-mono text-stone-500">SC-001, SC-099</td><td className="px-4 py-2.5 font-mono text-amber-700">{`/^SC-\\d{3}$/`}</td></tr>
              <tr><td className="px-4 py-2.5">剧集</td><td className="px-4 py-2.5 font-mono">EP-01</td><td className="px-4 py-2.5 font-mono text-stone-500">EP-01, EP-12</td><td className="px-4 py-2.5 font-mono text-amber-700">{`/^EP-\\d{2}$/`}</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* 向后兼容 */}
      <Section title="向后兼容">
        <p className="text-stone-700">
          未来新增 block 类型（如 montage、lyrics）时，在 Zod discriminatedUnion 末尾加 fallback 对象：
        </p>
        <CodeBlock lang="typescript">{`// 允许未知 type 通过而不报错
z.discriminatedUnion('type', [
  ActionBlockSchema,
  DialogueBlockSchema,
  TransitionBlockSchema,
  z.object({ type: z.string(), text: z.string() }), // catch-all
]);`}</CodeBlock>
        <p className="text-stone-700">
          也可通过 <code className="rounded bg-stone-100 px-1 text-sm text-amber-800">meta.version</code> 字段判读版本，选择对应 Zod Schema 进行校验。
        </p>
      </Section>

      {/* 页脚 */}
      <footer className="border-t border-stone-200 pt-6 text-center text-sm text-stone-500">
        完整可执行定义见 <code className="rounded bg-stone-100 px-1">lib/schema.ts</code> ·
        设计决策记录见 <code className="rounded bg-stone-100 px-1">docs/设计理念.md</code>
      </footer>
    </div>
  );
}

// ── 布局组件 ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-stone-800 border-b border-stone-100 pb-2">{title}</h2>
      {children}
    </section>
  );
}

function FieldTable({ fields, mini }: {
  fields: Array<[string, string, string, string]>;
  mini?: boolean;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border border-stone-200 ${mini ? '' : 'mb-4'}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 text-left">
            <th className="px-4 py-2.5 font-medium text-stone-600">字段</th>
            <th className="px-4 py-2.5 font-medium text-stone-600">类型</th>
            <th className="px-4 py-2.5 text-center font-medium text-stone-600 w-10">{mini ? '' : '必填'}</th>
            <th className="px-4 py-2.5 font-medium text-stone-600">说明</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {fields.map(([name, type, required, desc]) => (
            <tr key={name}>
              <td className="px-4 py-2.5 font-mono text-amber-800">{name}</td>
              <td className="px-4 py-2.5 text-stone-500">{type}</td>
              {!mini && (
                <td className="px-4 py-2.5 text-center">
                  {required === '✓' ? (
                    <span className="text-red-400 font-medium">✓</span>
                  ) : (
                    <span className="text-stone-300">—</span>
                  )}
                </td>
              )}
              <td className="px-4 py-2.5 text-stone-600">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-stone-900 p-4 text-sm leading-relaxed text-stone-100">
      {lang && <div className="mb-2 text-xs text-stone-500">{lang}</div>}
      <code>{children}</code>
    </pre>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 text-sm text-stone-700">
      {children}
    </div>
  );
}

function PrincipleList({ items }: { items: Array<{ title: string; desc: string }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map(item => (
        <div key={item.title} className="rounded-lg border border-stone-200 bg-white p-4">
          <h3 className="mb-1 font-semibold text-stone-800">{item.title}</h3>
          <p className="text-sm text-stone-600">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

function BlockDef({ title, color, children }: { title: string; color: 'blue' | 'amber' | 'gray'; children: React.ReactNode }) {
  const borderColor = { blue: 'border-blue-300', amber: 'border-amber-300', gray: 'border-gray-300' }[color];
  return (
    <div className={`rounded-lg border-l-4 ${borderColor} bg-white p-4`}>
      <h4 className="mb-3 font-semibold text-stone-800">{title}</h4>
      {children}
    </div>
  );
}
