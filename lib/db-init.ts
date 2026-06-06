// ============================================================
// 数据库表结构初始化 — Vercel 上 /tmp 为临时文件系统，
// prisma generate 只生成客户端代码，不会自动建表。
// 必须在首次查询前异步执行 CREATE TABLE IF NOT EXISTS。
// ============================================================

import { prisma } from './prisma';

let initialized = false;

export async function ensureTables(): Promise<void> {
  if (initialized) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ScreenplayRecord" (
      "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "title"        TEXT    NOT NULL,
      "novel"        TEXT    NOT NULL,
      "yaml"         TEXT    NOT NULL,
      "genre"        TEXT    NOT NULL,
      "format"       TEXT    NOT NULL,
      "author"       TEXT,
      "chapterCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    DATETIME NOT NULL
    );
  `);

  initialized = true;
}
