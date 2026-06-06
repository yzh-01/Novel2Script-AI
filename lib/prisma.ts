// ============================================================
// Prisma client 单例 — 防止 Next.js 热重载时创建多个实例
// Prisma 7 需要 driver adapter，使用 libsql 适配器连接 SQLite
// 注意：Vercel 运行时 /tmp 下数据库文件不存在/无表结构，
//       必须在 PrismaClient 初始化前用 libsql 客户端建表。
// ============================================================

import { createClient } from '@libsql/client';
import { PrismaClient } from './generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel 环境文件系统只读，数据库放在 /tmp 下
const DB_URL = process.env.DATABASE_URL || (
  process.env.VERCEL ? 'file:/tmp/dev.db' : 'file:./prisma/dev.db'
);

// ── 确保表结构存在（Vercel 文件系统临时，表不会自动创建）──

function ensureDatabaseTables() {
  const client = createClient({ url: DB_URL });
  client.execute(`
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
}

// ── 创建 PrismaClient ──────────────────────────────────────

function createPrismaClient() {
  ensureDatabaseTables();
  const adapter = new PrismaLibSql({ url: DB_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
