// ============================================================
// GET /api/history/[id] — 查询单条记录详情（含 novel + yaml）
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureTables } from '@/lib/db-init';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await ensureTables();
    const id = Number(params.id);

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: '无效的 id' },
        { status: 400 }
      );
    }

    const record = await prisma.screenplayRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error: any) {
    console.error('查询记录详情失败:', error);
    const msg = error?.message || String(error);
    return NextResponse.json(
      { error: `服务器内部错误: ${msg}` },
      { status: 500 }
    );
  }
}
