// ============================================================
// Prisma client 单例 — 防止 Next.js 热重载时创建多个实例
// Prisma 7 需要 driver adapter，使用 libsql 适配器连接 SQLite
// ============================================================

import { PrismaClient } from './generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel 环境文件系统只读，数据库放在 /tmp 下
const DB_URL = process.env.DATABASE_URL || (
  process.env.VERCEL ? 'file:/tmp/dev.db' : 'file:./prisma/dev.db'
);

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: DB_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
