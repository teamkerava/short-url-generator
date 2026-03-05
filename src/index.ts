import { AutoRouter, IRequest } from 'itty-router';

// Environment Bindings
export interface Env {
  SHORT_URLS: KVNamespace;
}

const router = AutoRouter()

interface Request extends IRequest {}

export const generateShortCode = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const expiryUrl = (url: string, hours = 24) => {
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  return { url, expiresAt: expiresAt };
};


// POST /api/shorten
// Request body: { "url": "https://example.com" }

router.post('/api/shorten', async (request: Request, env: Env) => {
  let content: { url?: string } | undefined;
  try {
    content = await request.json();
  } catch (err) {
    return new Response('Invalid JSON', { status: 400 });
  }

  const url = content?.url;
  if (!url) {
    return new Response('Missing URL', { status: 400 });
  }

  try {
    new URL(url);
  } catch (err) {
    return new Response('Invalid URL', { status: 400 });
  }

  const code = generateShortCode();
  const kv_value = {
    url,
    createdAt: new Date().toISOString(),
    expiresAt: expiryUrl(url).expiresAt
  }
  await env.SHORT_URLS.put(code, JSON.stringify(kv_value));

  const origin = new URL(request.url).origin;
  return new Response(JSON.stringify({ code, shortUrl: `${origin}/${code}` }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201
  });
});

// GET /:code
// Redirects to the original URL
router.get('/:code', async (request: Request, env: Env) => {
  const code = request.params.code;
  const value = await env.SHORT_URLS.get(code);

  if (!value) {
    return new Response(`Short code '${code}' not found`, { status: 404 });
  }

  let targetUrl = value;
  try {
    const data = JSON.parse(value);
    if (data.url) {
      targetUrl = data.url;
    }
  } catch (e) {
    new Response('Unexpected data format', { status: 500 });
  }

  return Response.redirect(targetUrl, 301);
});

// 404 Fallback
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  fetch: router.fetch
};
