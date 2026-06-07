// ============================================================
// 简易内存速率限制器
//
// 设计：令牌桶算法，按 IP + 端点粒度限流。
// Vercel Serverless 环境下每个实例独立计数（冷启动清零），
// 仅提供基础防护，不替代网关层限流。
// ============================================================

interface Bucket {
  tokens: number;
  lastRefill: number;
}

/** 默认：每 IP 每端点每分钟 30 次请求 */
const DEFAULT_RATE = 30;
const DEFAULT_WINDOW_MS = 60_000;

const store = new Map<string, Bucket>();

/** 定期清理过期条目（每 5 分钟执行一次） */
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const expired: string[] = [];
    store.forEach((bucket, key) => {
      if (now - bucket.lastRefill > DEFAULT_WINDOW_MS * 2) {
        expired.push(key);
      }
    });
    for (let i = 0; i < expired.length; i++) {
      store.delete(expired[i]);
    }
    // 无条目时停止清理定时器，避免持续占用
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 300_000); // 每 5 分钟
  // Node.js 中允许进程退出（不阻止事件循环）
  if (cleanupTimer && 'unref' in cleanupTimer) {
    (cleanupTimer as NodeJS.Timeout).unref();
  }
}

/**
 * 检查请求是否被限流。
 * @returns true = 允许通过，false = 被限流
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  rate: number = DEFAULT_RATE,
  windowMs: number = DEFAULT_WINDOW_MS,
): boolean {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let bucket = store.get(key);

  if (!bucket) {
    bucket = { tokens: rate - 1, lastRefill: now };
    store.set(key, bucket);
    ensureCleanup();
    return true;
  }

  // 补充令牌
  const elapsed = now - bucket.lastRefill;
  const refillTokens = Math.floor((elapsed / windowMs) * rate);
  if (refillTokens > 0) {
    bucket.tokens = Math.min(rate, bucket.tokens + refillTokens);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true;
  }

  return false;
}

/**
 * 从 NextRequest 中提取客户端 IP。
 * Vercel 通过 x-forwarded-for 头部传递真实 IP。
 */
export function getClientIP(request: Request): string {
  // Vercel / 代理环境
  const forwarded = (request.headers as any).get?.('x-forwarded-for');
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  // Cloudflare
  const cf = (request.headers as any).get?.('cf-connecting-ip');
  if (cf && typeof cf === 'string') return cf;
  // 兜底
  return '127.0.0.1';
}
