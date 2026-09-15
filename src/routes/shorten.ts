import { error } from 'itty-router';
import type { Env, Request, ShortUrlData, ShortenRequest } from '../lib/types';
import { expiryUrl, generateShortCode, parseDuration, parseOneTime, checkRateLimit, getClientIp, oneTimeConfirmResponse } from '../lib/utils';

// POST /api/shorten
// Request body: { "url": "https://example.com", "duration"?: "24h", "oneTime"?: true }

export const handleShorten = async (request: Request, env: Env) => {
  const rl = await checkRateLimit(env.SHORT_URLS, 'shorten', getClientIp(request));
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Whoa, slow down. Too many links — take a breath and try again in a bit." }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter) },
    });
  }

  let content: ShortenRequest | undefined;
  try {
    content = await request.json() as ShortenRequest;
  } catch (err) {
    return error(400, "Oh, so parsing JSON is hard now? Try sending valid JSON next time.");
  }

  const url = content?.url;
  if (!url) {
    return error(400, "No URL? Really? What did you expect me to shorten, your hopes and dreams?");
  }

  let normalizedUrl = url.trim();

  try {
    // Use URL constructor to validate and normalize the URL
    const urlObject = new URL(normalizedUrl);
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      return error(400, "Fancy protocol. We only speak 'http' and 'https' here — nothing exotic.");
    }

    normalizedUrl = urlObject.toString();
  } catch (err) {
    return error(400, "That URL is invalid. I need a real one starting with http:// or https://.");
  }

  const code = generateShortCode();
  const duration = content?.duration || 24;
  const oneTime = parseOneTime(content?.oneTime);
  let expiresAt: string;
  let ttlSeconds: number;
  try {
    expiresAt = expiryUrl(normalizedUrl, duration).expiresAt;
    // Native KV expiry so dead entries vanish without requiring a read.
    // KV enforces a 60s minimum TTL — clamp sub-minute durations up.
    ttlSeconds = Math.max(60, Math.round(parseDuration(duration) * 3600));
  } catch (err) {
    return error(400, (err as Error).message);
  }
  const kv_value: ShortUrlData = {
    url: normalizedUrl,
    createdAt: new Date().toISOString(),
    expiresAt,
    ...(oneTime ? { oneTime: true as const } : {}),
  };
  await env.SHORT_URLS.put(code, JSON.stringify(kv_value), { expirationTtl: ttlSeconds });

  const origin = new URL(request.url).origin;
  return new Response(JSON.stringify({
    code,
    shortUrl: `${origin}/${code}`,
    expiresAt: kv_value.expiresAt,
    ...(oneTime ? { oneTime: true as const } : {}),
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201
  });
};

// GET /:code
// Regular links redirect immediately. One-time links render a confirm page —
// previews/bots only see the page and never burn the entry. The burn happens
// on POST /:code (the form button), which deletes then redirects.

export const handleRedirect = async (request: Request, env: Env) => {
  const code = request.params.code;
  const value = await env.SHORT_URLS.get(code);

  if (!value) {
    return error(404, `The code '${code}' doesn't exist. Typo? Or it already burned after its one glorious view?`);
  }

  let targetUrl = value;
  let oneTime = false;
  try {
    const data = JSON.parse(value) as ShortUrlData;
    if (data.url) {
      targetUrl = data.url;
    }

    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return error(410, "This short URL has expired. What did you expect? Eternal life?");
    }

    oneTime = data.oneTime === true;
  } catch (e) {}

  if (oneTime) {
    return oneTimeConfirmResponse('link');
  }

  return Response.redirect(targetUrl, 301);
};

// POST /:code — consumes a one-time link (burn after reading).

export const handleConsumeRedirect = async (request: Request, env: Env) => {
  const code = request.params.code;
  const value = await env.SHORT_URLS.get(code);

  if (!value) {
    return error(404, `The code '${code}' doesn't exist. Typo? Or it already burned after its one glorious view?`);
  }

  let targetUrl = value;
  let oneTime = false;
  try {
    const data = JSON.parse(value) as ShortUrlData;
    if (data.url) {
      targetUrl = data.url;
    }

    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return error(410, "This short URL has expired. What did you expect? Eternal life?");
    }

    oneTime = data.oneTime === true;
  } catch (e) {}

  if (oneTime) {
    // Burn after reading: delete first so a second viewer gets 404.
    // Concurrent readers can still race this (KV has no atomic take).
    try {
      await env.SHORT_URLS.delete(code);
    } catch (e) {}
    return new Response(null, {
      status: 301,
      headers: {
        Location: targetUrl,
        'Cache-Control': 'no-store',
      },
    });
  }

  return Response.redirect(targetUrl, 301);
};
