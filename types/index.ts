// ============================================================
// Novel2Script-AI — 全局 TypeScript 类型定义
// ============================================================

/** 小说类型标签 */
export type Genre = 'sci-fi' | 'romance' | 'mystery' | 'history' | 'fantasy' | 'other';

/** 剧本格式 */
export type Format = 'movie' | 'tv_series' | 'short_drama';

// ── 输入类型 ───────────────────────────────────────────

/** 单章输入 */
export interface ChapterInput {
  number: number;
  title: string;
  content: string;
}

/** POST /api/convert 请求体 */
export interface ConvertRequest {
  title: string;
  author?: string;
  genre: Genre;
  format: Format;
  chapters: ChapterInput[];
}

// ── 输出类型 ───────────────────────────────────────────

/** 角色分类 */
export type CharacterCategory = 'main' | 'supporting' | 'guest' | 'cameo' | 'extras';

/** 角色关系类型 */
export type RelationshipType = 'ally' | 'enemy' | 'family' | 'lover' | 'rival' | 'mentor_student';

/** 角色关系 */
export interface CharacterRelationship {
  target: string; // character.id
  type: RelationshipType;
  description?: string;
}

/** 角色定义 */
export interface Character {
  id: string; // CH-001 格式
  name: string;
  aliases?: string[];
  category: CharacterCategory;
  gender: 'male' | 'female' | 'other';
  age_display?: string;
  archetype?: string;
  traits?: string[];
  description: string;
  arc?: string;
  relationships?: CharacterRelationship[];
  notes?: string;
}

// ── 剧本块（核心联合类型） ─────────────────────────────

/** 动作/场景描写 */
export interface ActionBlock {
  type: 'action';
  text: string;
}

/** 对白 */
export interface DialogueBlock {
  type: 'dialogue';
  character_id: string;
  text: string;
  parenthetical?: string;
  delivery?: 'on_screen' | 'voice_over' | 'off_screen';
  emotion?: string;
  continuation?: boolean;
}

/** 转场 */
export interface TransitionBlock {
  type: 'transition';
  text: string;
}

export type Block = ActionBlock | DialogueBlock | TransitionBlock;

// ── 场景 ───────────────────────────────────────────────

export interface SceneHeading {
  interior: boolean;       // true = INT. / false = EXT.
  location: string;
  time_of_day: 'day' | 'night';
  extra?: string;          // 闪回 / 梦境 / 连续
}

export interface Scene {
  id: string;              // SC-001 格式
  scene_number: number;
  episode?: number;
  act?: number;            // 1 | 2 | 3
  source_chapter: number;  // ← 审查 P0：统一为单值 int，不搞 int | int[]
  heading: SceneHeading;
  summary?: string;
  characters_present: string[];
  props?: string[];
  blocks: Block[];
}

// ── 剧集（电视剧/短剧用，MVP 阶段暂不使用）──────────────

export interface Episode {
  id: string;              // EP-01 格式
  number: number;
  title: string;
  cold_open?: boolean;
  synopsis?: string;
}

// ── 剧本顶层 ───────────────────────────────────────────

/** LLM 返回的原始 meta（不含系统注入字段） */
export interface ScreenplayMetaInput {
  format: Format;
  title: string;
  subtitle?: string;
  genre?: Genre[];
  source?: {
    type: 'novel' | 'comic' | 'original' | 'true_story';
    title: string;
    author?: string;
  };
}

/** 完整 meta（系统注入 language/version/generated_at/generator） */
export interface ScreenplayMeta extends ScreenplayMetaInput {
  language: string;
  version: string;
  generated_at: string;
  generator: string;
}

export interface Screenplay {
  meta: ScreenplayMeta;
  characters: Character[];
  episodes?: Episode[];
  scenes: Scene[];
}

// ── API 响应 ───────────────────────────────────────────

/** 两阶段转换：第一阶段立即返回 */
export interface ConvertPhase1 {
  phase: 'characters';
  characters: Character[];
  episodes?: Episode[];
  scene_outline: Array<{
    id: string;
    scene_number: number;
    episode?: number;
    heading: SceneHeading;
    summary: string;
    source_chapter: number;
  }>;
}

/** 两阶段转换：第二阶段完整结果 */
export interface ConvertPhase2 {
  phase: 'complete';
  screenplay: Screenplay;
  yaml: string;
  validation: ValidationResult;
}

export type ConvertResponse = ConvertPhase1 | ConvertPhase2;

// ── 校验 ───────────────────────────────────────────────

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ── 编辑器状态 ─────────────────────────────────────────

export interface EditorState {
  yaml: string;
  screenplay: Screenplay | null;
  validation: ValidationResult;
  isDirty: boolean;
}

// ── 转换状态机 ─────────────────────────────────────────

export type ConvertStatus =
  | 'idle'
  | 'validating_input'
  | 'generating_characters'
  | 'generating_scenes'
  | 'formatting'
  | 'complete'
  | 'error';

export interface ConvertState {
  status: ConvertStatus;
  phase1: ConvertPhase1 | null;
  phase2: ConvertPhase2 | null;
  error: string | null;
}
