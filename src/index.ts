import { AutoRouter, IRequest, error } from 'itty-router';
import { html } from './html';

// Environment Bindings
export interface Env {
  SHORT_URLS: KVNamespace;
}

interface ShortUrlData {
  url: string;
  createdAt: string;
  expiresAt: string;
}

interface ShortenRequest {
  url?: string;
}

const router = AutoRouter();
const ipLimits = new Map<string, { count: number, expiry: number }>();

interface Request extends IRequest {
  params: {
    code: string;
  };
}

export const generateShortCode = (length: number = 6): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const expiryUrl = (url: string, hours: number = 24): { url: string; expiresAt: string } => {
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  return { url, expiresAt };
};


// POST /api/shorten
// Request body: { "url": "https://example.com" }

router.post('/api/shorten', async (request: Request, env: Env) => {
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
  if (!normalizedUrl.match(/^https?:\/\//i)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    new URL(normalizedUrl);
  } catch (err) {
    return error(400, "That URL is as valid as a three-dollar bill. Fix it, maybe?");
  }

  const code = generateShortCode();
  const kv_value: ShortUrlData = {
    url: normalizedUrl,
    createdAt: new Date().toISOString(),
    expiresAt: expiryUrl(normalizedUrl).expiresAt
  };
  await env.SHORT_URLS.put(code, JSON.stringify(kv_value));

  const origin = new URL(request.url).origin;
  return new Response(JSON.stringify({ code, shortUrl: `${origin}/${code}` }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201
  });
});


// GET /
// Serves the frontend
router.get('/', () => {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
});

// GET /:code
// Redirects to the original URL
router.get('/:code', async (request: Request, env: Env) => {
  const code = request.params.code;
  const value = await env.SHORT_URLS.get(code);

  if (!value) {
    return error(404, `The code '${code}' doesn't exist. Maybe double-check your typing skills?`);
  }

  let targetUrl = value;
  try {
    const data = JSON.parse(value) as ShortUrlData;
    if (data.url) {
      targetUrl = data.url;
    }

    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return error(410, "This short URL has expired. What did you expect? Eternal life?");
    }
  } catch (e) {}

  return Response.redirect(targetUrl, 301);
});

// 404 Fallback
router.all('*', () => error(404, "Not found. But hey, at least you tried, right?"));

export default {
  fetch: router.fetch
};
