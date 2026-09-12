import { error } from 'itty-router';
import type { Env, Request, ShortUrlData, ShortenRequest } from '../lib/types';
import { expiryUrl, generateShortCode, parseOneTime } from '../lib/utils';

// POST /api/shorten
// Request body: { "url": "https://example.com", "duration"?: "24h", "oneTime"?: true }

export const handleShorten = async (request: Request, env: Env) => {
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
  const kv_value: ShortUrlData = {
    url: normalizedUrl,
    createdAt: new Date().toISOString(),
    expiresAt: expiryUrl(normalizedUrl, duration).expiresAt,
    ...(oneTime ? { oneTime: true as const } : {}),
  };
  await env.SHORT_URLS.put(code, JSON.stringify(kv_value));

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
// Redirects to the original URL. One-time links are deleted on first access.

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
