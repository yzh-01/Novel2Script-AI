// ============================================================
// POST /api/convert — 小说章节 → 剧本 YAML
//
// 契约：
//   Request:  { title, author?, genre, format, chapters[] }
//   Response: NDJSON stream（两阶段）
//     → {"phase":"characters", ...}
//     → {"phase":"complete", ...}
//
// 扩展：后续可加 /api/polish (AI 润色), /api/validate (纯校验)
// ============================================================

import { NextRequest } from 'next/server';
import { convertNovelToScreenplay } from '@/lib/converter';
import { validateConvertRequest } from '@/lib/schema';
import { formatZodErrors } from '@/lib/validators';
import type { ConvertPhase1 } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await request.json();

    // 2. 校验输入
    const inputResult = validateConvertRequest(body);
    if (!inputResult.success) {
      return Response.json(
        { error: `输入校验失败：${formatZodErrors(inputResult.error).join('；')}` },
        { status: 400 }
      );
    }

    // 3. 创建 NDJSON 流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let phase1Sent = false;

        try {
          const onPhase1 = (phase1: ConvertPhase1) => {
            if (!phase1Sent) {
              phase1Sent = true;
              const chunk = encoder.encode(JSON.stringify(phase1) + '\n');
              controller.enqueue(chunk);
            }
          };

          const result = await convertNovelToScreenplay(inputResult.data, onPhase1);

          // 确保 phase1 在 phase2 之前发送
          const phase2Chunk = encoder.encode(JSON.stringify(result) + '\n');
          controller.enqueue(phase2Chunk);
          controller.close();

        } catch (err) {
          const errorChunk = encoder.encode(
            JSON.stringify({
              phase: 'error',
              error: err instanceof Error ? err.message : '转换失败',
            }) + '\n'
          );
          controller.enqueue(errorChunk);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    console.error('[/api/convert] 请求处理失败：', err);
    return Response.json(
      { error: err instanceof Error ? err.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}
