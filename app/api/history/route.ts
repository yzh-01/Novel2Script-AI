// ============================================================
// /api/history — 剧本转换记录的 CRUD
//   POST   保存记录
//   GET    查询列表（分页 + 搜索）
//   DELETE 删除记录（?id=xxx）
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureTables } from '@/lib/db-init';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

// ── 安全限制 ──────────────────────────────────────────

/** 单条 YAML 最大长度（500 KB） */
const MAX_YAML_LENGTH = 500_000;
/** 单条 novel 字段最大序列化长度（2 MB） */
const MAX_NOVEL_LENGTH = 2_000_000;
/** 搜索关键词最大长度 */
const MAX_SEARCH_QUERY_LENGTH = 100;

// ── POST: 保存记录 ──────────────────────────────────────

export async function POST(request: Request) {
  try {
    await ensureTables();

    // 速率限制
    const ip = getClientIP(request);
    if (!checkRateLimit(ip, 'history:post')) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后重试' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const { title, novel, yaml, genre, format, author } = body;

    if (!title || !novel || !yaml || !genre || !format) {
      return NextResponse.json(
        { error: '缺少必填字段：title, novel, yaml, genre, format' },
        { status: 400 }
      );
    }

    // 大小限制校验（防止磁盘耗尽攻击）
    if (typeof yaml === 'string' && yaml.length > MAX_YAML_LENGTH) {
      return NextResponse.json(
        { error: `YAML 内容过大（最大 ${MAX_YAML_LENGTH / 1000} KB）` },
        { status: 413 }
      );
    }
    const novelStr = typeof novel === 'string' ? novel : JSON.stringify(novel);
    if (novelStr.length > MAX_NOVEL_LENGTH) {
      return NextResponse.json(
        { error: `小说内容过大（最大 ${MAX_NOVEL_LENGTH / 1000000} MB）` },
        { status: 413 }
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

    // 速率限制
    const ip = getClientIP(request);
    if (!checkRateLimit(ip, 'history:get')) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后重试' },
        { status: 429 }
      );
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10));
    const q = (searchParams.get('q') || '').slice(0, MAX_SEARCH_QUERY_LENGTH);

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

    // 速率限制
    const ip = getClientIP(request);
    if (!checkRateLimit(ip, 'history:delete')) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后重试' },
        { status: 429 }
      );
    }

    const { searchParams } = request.nextUrl;
    const id = Number(searchParams.get('id'));

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: '缺少参数 id' },
        { status: 400 }
      );
    }

    // 先检查记录是否存在
    const existing = await prisma.screenplayRecord.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json(
        { error: `记录不存在（id: ${id}）` },
        { status: 404 }
      );
    }

    await prisma.screenplayRecord.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Prisma P2025: record not found (并发删除的竞态情况)
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      );
    }
    console.error('删除历史记录失败:', error);
    const msg = error?.message || String(error);
    return NextResponse.json(
      { error: `服务器内部错误: ${msg}` },
      { status: 500 }
    );
  }
}
