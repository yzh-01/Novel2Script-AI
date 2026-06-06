// ============================================================
// GET /api/history/[id] — 查询单条记录详情（含 novel + yaml）
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
  } catch (error) {
    console.error('查询记录详情失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
