// ============================================================
// parseChapters — 从 .txt 文本中解析多章节
//
// 支持的章节分隔格式（按优先级）：
//   1. "第N章" / "第N章：标题" / "第N章 标题"
//   2. "Chapter N" / "CHAPTER N"
//   3. "---" 分隔线
//   4. 无匹配时整篇作为一个章节
// ============================================================

import type { ChapterInput } from '@/types';
import { MAX_CHAPTERS } from '@/constants';

/**
 * 从文本中解析章节列表
 * @returns 解析出的章节数组（最多 MAX_CHAPTERS 章，超出截断）
 */
export function parseChaptersFromText(text: string): ChapterInput[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!clean) return [];

  // 策略 1: "第N章" 格式（中文小说最常见）
  const cnPattern = /(?=第\s*\d+\s*章[：:\s])/;
  let parts = clean.split(cnPattern).filter(p => p.trim());

  if (parts.length >= 3) {
    return parts.slice(0, MAX_CHAPTERS).map((part, i) => {
      const lines = part.trim().split('\n');
      const firstLine = lines[0].trim();
      // 提取标题：移除 "第N章：" 后的内容
      const titleMatch = firstLine.match(/第\s*\d+\s*章[：:\s]*(.*)/);
      return {
        number: i + 1,
        title: titleMatch ? (titleMatch[1] || `第 ${i + 1} 章`) : `第 ${i + 1} 章`,
        content: part.trim(),
      };
    });
  }

  // 策略 2: "Chapter N" 格式（英文小说）
  const enPattern = /(?=Chapter\s+\d+)/i;
  parts = clean.split(enPattern).filter(p => p.trim());
  if (parts.length >= 3) {
    return parts.slice(0, MAX_CHAPTERS).map((part, i) => ({
      number: i + 1,
      title: `Chapter ${i + 1}`,
      content: part.trim(),
    }));
  }

  // 策略 3: "---" 分隔线
  parts = clean.split(/\n---\n/).filter(p => p.trim());
  if (parts.length >= 3) {
    return parts.slice(0, MAX_CHAPTERS).map((part, i) => {
      const lines = part.trim().split('\n');
      const firstLine = lines[0].trim();
      return {
        number: i + 1,
        title: firstLine || `第 ${i + 1} 章`,
        content: part.trim(),
      };
    });
  }

  // 策略 4: 整篇作为一个章节（至少返回一段文本）
  return [{
    number: 1,
    title: '全文',
    content: clean,
  }];
}
