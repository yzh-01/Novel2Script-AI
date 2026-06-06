// ============================================================
// Prisma client 单例 — 防止 Next.js 热重载时创建多个实例
// Prisma 7 需要 driver adapter，使用 libsql 适配器连接 SQLite
// ============================================================

import { PrismaClient } from './generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel 环境文件系统只读，数据库必须放在 /tmp 下。
// 注意：.env 中 DATABASE_URL 会被 dotenv 加载，不能让它覆盖 Vercel 路径。
const isVercel = !!process.env.VERCEL;
const DB_URL = isVercel
  ? 'file:/tmp/dev.db'
  : (process.env.DATABASE_URL || 'file:./prisma/dev.db');

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: DB_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
