import { AutoRouter, IRequest, error } from 'itty-router';
import { html } from './html';
import { apiDocs } from './api-docs';

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
  duration?: string;
}

interface Request extends IRequest {
  params: {
    code: string;
  };
}

const router = AutoRouter();

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
  if (!match) throw new Error("Invalid duration format. Use format like '15m', '1d', '2h', etc.");

  const value = parseInt(match[1]);
  const unit = match[2]?.toLowerCase() || 'h'; // default to hours if no unit

  switch (unit) {
    case 'm': return value / 60; // minutes to hours
    case 'h': return value;
    case 'd': return value * 24;
    case 'w': return value * 24 * 7;
    default: throw new Error("Unknown time unit. Supported: m (minutes), h (hours), d (days), w (weeks)");
  }
};

export const expiryUrl = (url: string, duration: string | number = 24): { url: string; expiresAt: string } => {
  const hours = parseDuration(duration);
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

  try {
    // Use URL constructor to validate and normalize the URL
    const urlObject = new URL(normalizedUrl);
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      return error(400, "Unsupported URL protocol. Only 'http' and 'https' are allowed.");
    }

    normalizedUrl = urlObject.toString();
  } catch (err) {
    return error(400, "Invalid URL. Please provide a valid URL to shorten. (http:// or https://)");
  }

  const code = generateShortCode();
  const duration = content?.duration || 24;
  const kv_value: ShortUrlData = {
    url: normalizedUrl,
    createdAt: new Date().toISOString(),
    expiresAt: expiryUrl(normalizedUrl, duration).expiresAt
  };
  await env.SHORT_URLS.put(code, JSON.stringify(kv_value));

  const origin = new URL(request.url).origin;
  return new Response(JSON.stringify({ 
    code, 
    shortUrl: `${origin}/${code}`,
    expiresAt: kv_value.expiresAt 
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201
  });
});

// GET /
router.get('/', () => {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
});

// GET /api/docs
router.get('/api/docs', () => { 
  return new Response(apiDocs, {
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
