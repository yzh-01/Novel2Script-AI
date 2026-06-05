// ============================================================
// Novel2Script-AI — 全局常量
// 单一数据源：所有硬编码值集中管理
// ============================================================

import type { Genre, Format, CharacterCategory, RelationshipType } from '@/types';

// ── 小说类型 ───────────────────────────────────────────

export const GENRES: { value: Genre; label: string; description: string }[] = [
  { value: 'sci-fi', label: '科幻', description: '未来世界、外星文明、科技想象' },
  { value: 'romance', label: '言情', description: '爱情、情感纠葛、人物关系' },
  { value: 'mystery', label: '悬疑', description: '推理、反转、紧张节奏' },
  { value: 'history', label: '历史', description: '古代背景、历史事件、人物传记' },
  { value: 'fantasy', label: '奇幻', description: '魔法、异世界、超自然元素' },
  { value: 'other', label: '其他', description: '上述类型之外的题材' },
];

// ── 剧本格式 ───────────────────────────────────────────

export const FORMATS: { value: Format; label: string; description: string }[] = [
  { value: 'movie', label: '电影', description: '90-180 分钟单篇故事' },
  { value: 'tv_series', label: '电视剧', description: '多集连续剧，每集 40-60 分钟' },
  { value: 'short_drama', label: '短剧', description: '每集 5-15 分钟，节奏快' },
];

// ── 角色分类 ───────────────────────────────────────────

export const CHARACTER_CATEGORIES: { value: CharacterCategory; label: string }[] = [
  { value: 'main', label: '主角' },
  { value: 'supporting', label: '配角' },
  { value: 'guest', label: '客串' },
  { value: 'cameo', label: '特出' },
  { value: 'extras', label: '群众' },
];

// ── 角色关系 ───────────────────────────────────────────

export const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'ally', label: '盟友' },
  { value: 'enemy', label: '敌人' },
  { value: 'family', label: '家人' },
  { value: 'lover', label: '恋人' },
  { value: 'rival', label: '对手' },
  { value: 'mentor_student', label: '师徒' },
];

// ── 剧本块类型 ─────────────────────────────────────────

export const BLOCK_TYPES = ['action', 'dialogue', 'transition'] as const;

// ── 对白表达方式 ───────────────────────────────────────

export const DELIVERY_MODES = [
  { value: 'on_screen' as const, label: '画面内' },
  { value: 'voice_over' as const, label: '旁白 (V.O.)' },
  { value: 'off_screen' as const, label: '画外音 (O.S.)' },
];

// ── 输入约束 ───────────────────────────────────────────

/** 每章建议最大字数 */
export const CHAPTER_WORD_LIMIT = 5000;

/** 最少章节数 */
export const MIN_CHAPTERS = 3;

/** 最多章节数（防止 API 超时） */
export const MAX_CHAPTERS = 10;

// ── API 配置 ───────────────────────────────────────────

/** 阿里云 DashScope API 地址（OpenAI 兼容模式） */
export const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

/** 模型标识 */
export const LLM_MODEL = 'qwen3-max-2026-01-23';

/** 转换请求超时 (ms) */
export const CONVERT_TIMEOUT = 60_000;

/** 失败重试次数 */
export const MAX_RETRIES = 1;

// ── ID 格式正则 ────────────────────────────────────────

export const ID_PATTERNS = {
  character: /^CH-\d{3}$/,
  scene: /^SC-\d{3}$/,
  episode: /^EP-\d{2}$/,
} as const;

// ── Schema 版本 ────────────────────────────────────────

export const SCHEMA_VERSION = '1.0.0';
