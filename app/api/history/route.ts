// ============================================================
// /api/history — 剧本转换记录的 CRUD
//   POST   保存记录
//   GET    查询列表（分页 + 搜索）
//   DELETE 删除记录（?id=xxx）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureTables } from '@/lib/db-init';

// ── POST: 保存记录 ──────────────────────────────────────

export async function POST(request: Request) {
  try {
    await ensureTables();
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
  } catch (error: any) {
    console.error('保存历史记录失败:', error);
    const msg = error?.message || String(error);
    return NextResponse.json(
      { error: `服务器内部错误: ${msg}` },
      { status: 500 }
    );
  }
}

// ── GET: 查询列表 + 分页 + 搜索 ────────────────────────

export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));
    const q = searchParams.get('q') || '';

    const where = q.trim()
      ? { title: { contains: q.trim() } }
      : {};

    const [records, total] = await Promise.all([
      prisma.screenplayRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          genre: true,
          format: true,
          author: true,
          chapterCount: true,
          createdAt: true,
          // 列表不返回大字段 novel/yaml，按需加载
        },
      }),
      prisma.screenplayRecord.count({ where }),
    ]);

    return NextResponse.json({
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error('查询历史记录失败:', error);
    const msg = error?.message || String(error);
    return NextResponse.json(
      { error: `服务器内部错误: ${msg}` },
      { status: 500 }
    );
  }
}

// ── DELETE: 删除记录 ────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    await ensureTables();
    const { searchParams } = request.nextUrl;
    const id = Number(searchParams.get('id'));

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: '缺少参数 id' },
        { status: 400 }
      );
    }

    await prisma.screenplayRecord.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除历史记录失败:', error);
    const msg = error?.message || String(error);
    return NextResponse.json(
      { error: `服务器内部错误: ${msg}` },
      { status: 500 }
    );
  }
}
