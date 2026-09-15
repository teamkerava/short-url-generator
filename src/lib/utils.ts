export const generateShortCode = (length: number = 6): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const parseDuration = (duration: string | number): number => {
  if (typeof duration === 'number') return duration;

  const match = duration.match(/^(\d+)([mhdw]?)$/i);
  if (!match) throw new Error("Invalid duration. I accept '15m', '1h', '1d', '1w' and friends — 'forever' is not a unit.");

  const value = parseInt(match[1]);
  const unit = match[2]?.toLowerCase() || 'h'; // default to hours if no unit

  switch (unit) {
    case 'm': return value / 60; // minutes to hours
    case 'h': return value;
    case 'd': return value * 24;
    case 'w': return value * 24 * 7;
    default: throw new Error("Unknown time unit. I know m, h, d and w — pick a letter I recognize.");
  }
};

export const expiryUrl = (url: string, duration: string | number = 24): { url: string; expiresAt: string } => {
  const hours = parseDuration(duration);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  return { url, expiresAt };
};

/**
 * Normalizes opt-in one-time flags from JSON bodies (`boolean`) and
 * multipart form fields (`"true"` / `"1"` / `"on"`).
 */
export const parseOneTime = (value: unknown): boolean => {
  if (value === true) return true;
  if (typeof value === 'string') {
    return ['true', '1', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
};

/**
 * Per-IP fixed-window rate limits for the write APIs. Counters live in the
 * existing SHORT_URLS KV under `rl:<route>:<ip>:<window>` keys with a native
 * TTL, so no new bindings are needed. Best-effort like the rest of the
 * codebase: concurrent writers can overshoot the limit by a little.
 */
export const RATE_LIMITS = {
  shorten: { limit: 30, windowSeconds: 600 },
  upload: { limit: 20, windowSeconds: 600 },
} as const;

export type RateLimitRoute = keyof typeof RATE_LIMITS;

export const getClientIp = (request: Request): string => {
  const cf = request.headers.get('CF-Connecting-IP');
  if (cf && cf.trim()) return cf.trim();
  const xff = request.headers.get('X-Forwarded-For');
  if (xff && xff.trim()) return xff.split(',')[0].trim();
  return 'unknown';
};

export const checkRateLimit = async (
  kv: { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> },
  route: RateLimitRoute,
  ip: string,
): Promise<{ allowed: boolean; retryAfter: number }> => {
  const { limit, windowSeconds } = RATE_LIMITS[route];
  // Can't identify the caller — fail open rather than locking everyone out.
  if (!ip || ip === 'unknown') return { allowed: true, retryAfter: 0 };
  const nowSec = Math.floor(Date.now() / 1000);
  const windowId = Math.floor(nowSec / windowSeconds);
  const key = `rl:${route}:${ip}:${windowId}`;
  let count = 0;
  try {
    const raw = await kv.get(key);
    if (raw) count = parseInt(raw, 10) || 0;
  } catch (e) {
    return { allowed: true, retryAfter: 0 };
  }
  if (count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, windowSeconds - (nowSec % windowSeconds)) };
  }
  try {
    await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  } catch (e) {}
  return { allowed: true, retryAfter: 0 };
};
