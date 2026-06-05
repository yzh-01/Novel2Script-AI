// ============================================================
// Novel2Script-AI — Zod Schema 定义
// 前后端共享的单一数据源。
//
// 设计原则：格式正确靠 Schema，内容质量靠 Prompt。
// LLM 不需要负责 system-injected 字段（language/version/generated_at/generator）。
// ============================================================

import { z } from 'zod';
import { ID_PATTERNS } from '@/constants';

// ── 元信息（LLM 负责的部分）─────────────────────────────

const SourceSchema = z.object({
  type: z.enum(['novel', 'comic', 'original', 'true_story']),
  title: z.string().min(1),
  author: z.string().optional(),
});

const MetaInputSchema = z.object({
  format: z.enum(['movie', 'tv_series', 'short_drama']),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  genre: z.array(z.enum(['sci-fi', 'romance', 'mystery', 'history', 'fantasy', 'other'])).optional(),
  source: SourceSchema.optional(),
});

// 完整 Meta（供校验用，系统注入字段为 optional 以兼容 LLM 输出）
const MetaSchema = MetaInputSchema.extend({
  language: z.string().optional().default('zh-CN'),
  version: z.string().optional().default('1.0.0'),
  generated_at: z.string().optional(),
  generator: z.string().optional(),
});

// ── 角色 ───────────────────────────────────────────────

const RelationshipSchema = z.object({
  target: z.string().regex(ID_PATTERNS.character, '须为 CH-001 格式'),
  type: z.enum(['ally', 'enemy', 'family', 'lover', 'rival', 'mentor_student']),
  description: z.string().optional(),
});

const CharacterSchema = z.object({
  id: z.string().regex(ID_PATTERNS.character, '须为 CH-001 格式'),
  name: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  category: z.enum(['main', 'supporting', 'guest', 'cameo', 'extras']),
  gender: z.enum(['male', 'female', 'other']),
  age_display: z.string().optional(),
  archetype: z.string().optional(),
  traits: z.array(z.string()).optional(),
  description: z.string().min(1),
  arc: z.string().optional(),
  relationships: z.array(RelationshipSchema).optional(),
  notes: z.string().optional(),
});

// ── 剧本块 ─────────────────────────────────────────────

const ActionBlockSchema = z.object({
  type: z.literal('action'),
  text: z.string().min(1),
});

const DialogueBlockSchema = z.object({
  type: z.literal('dialogue'),
  character_id: z.string().min(1),
  text: z.string().min(1),
  parenthetical: z.string().optional(),
  delivery: z.enum(['on_screen', 'voice_over', 'off_screen']).optional(),
  emotion: z.string().optional(),
  continuation: z.boolean().optional(),
});

const TransitionBlockSchema = z.object({
  type: z.literal('transition'),
  text: z.string().min(1),
});

const BlockSchema = z.discriminatedUnion('type', [
  ActionBlockSchema,
  DialogueBlockSchema,
  TransitionBlockSchema,
]);

// ── 场景 ───────────────────────────────────────────────

const SceneHeadingSchema = z.object({
  interior: z.boolean(),
  location: z.string().min(1),
  time_of_day: z.enum(['day', 'night']),
  extra: z.string().optional(),
});

// LLM 输出的 scene（source_chapter 可选，预处理层可修复）
const SceneInputSchema = z.object({
  id: z.string().regex(ID_PATTERNS.scene, '须为 SC-001 格式'),
  scene_number: z.number().int().positive(),
  episode: z.number().int().positive().optional(),
  act: z.number().int().min(1).max(5).optional(),
  source_chapter: z.union([z.number(), z.array(z.number())]).optional(),
  heading: SceneHeadingSchema,
  summary: z.string().optional(),
  characters_present: z.array(z.string()),
  props: z.array(z.string()).optional(),
  blocks: z.array(BlockSchema).min(1),
});

// 经过预处理的 scene（source_chapter 已修复为单值 int）
const SceneSchema = SceneInputSchema.extend({
  source_chapter: z.number().int().positive(),
});

// ── 剧集（保留兼容，MVP 不使用）────────────────────────

const EpisodeSchema = z.object({
  id: z.string().regex(ID_PATTERNS.episode, '须为 EP-01 格式'),
  number: z.number().int().positive(),
  title: z.string().min(1),
  cold_open: z.boolean().optional(),
  synopsis: z.string().optional(),
});

// ── LLM 输出的原始剧本（宽松校验）─────────────────────

export const ScreenplayInputSchema = z.object({
  meta: MetaInputSchema,
  characters: z.array(CharacterSchema).min(1),
  episodes: z.array(EpisodeSchema).optional(),
  scenes: z.array(SceneInputSchema).min(1),
});

// ── 最终剧本 Schema（系统注入后）───────────────────────

export const ScreenplaySchema = z.object({
  meta: MetaSchema.extend({
    language: z.string(),
    version: z.string(),
    generated_at: z.string(),
    generator: z.string(),
  }),
  characters: z.array(CharacterSchema).min(1),
  episodes: z.array(EpisodeSchema).optional(),
  scenes: z.array(SceneSchema).min(1),
});

// ── 类型推导 ───────────────────────────────────────────

export type Screenplay = z.infer<typeof ScreenplaySchema>;
export type ScreenplayInput = z.infer<typeof ScreenplayInputSchema>;

// ── 输入校验 ───────────────────────────────────────────

export const ChapterInputSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1, '章节标题不能为空'),
  content: z.string().min(1, '章节内容不能为空'),
});

export const ConvertRequestSchema = z.object({
  title: z.string().min(1, '小说标题不能为空'),
  author: z.string().optional(),
  genre: z.enum(['sci-fi', 'romance', 'mystery', 'history', 'fantasy', 'other']),
  format: z.enum(['movie', 'tv_series', 'short_drama']),
  chapters: z.array(ChapterInputSchema).min(3, '至少需要 3 个章节'),
});

// ── 辅助函数 ───────────────────────────────────────────

export function validateScreenplay(data: unknown) {
  return ScreenplaySchema.safeParse(data);
}

export function validateConvertRequest(data: unknown) {
  return ConvertRequestSchema.safeParse(data);
}

export function validateScreenplayInput(data: unknown) {
  return ScreenplayInputSchema.safeParse(data);
}
