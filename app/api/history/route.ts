// ============================================================
// POST /api/history — 保存剧本转换记录
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { title, novel, yaml, genre, format, author } = body;

    if (!title || !novel || !yaml || !genre || !format) {
      return NextResponse.json(
        { error: '缺少必填字段：title, novel, yaml, genre, format' },
        { status: 400 }
      );
    }

    const record = await prisma.screenplayRecord.create({
      data: {
        title,
        novel: typeof novel === 'string' ? novel : JSON.stringify(novel),
        yaml,
        genre,
        format,
        author: author || null,
        chapterCount: Array.isArray(novel) ? novel.length : 0,
      },
    });

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (error) {
    console.error('保存历史记录失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
