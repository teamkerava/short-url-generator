import { Router, IRequest } from 'itty-router';

// Environment Bindings (matches wrangler.toml)
export interface Env {
  SHORT_URLS: KVNamespace;
}

// Custom request interface to help TypeScript know about params
interface Request extends IRequest {
  json?: () => Promise<any>; // Add json parsing to request type
}

const router = Router();

// POST /api/shorten
// Request body: { "url": "https://example.com" }
router.post('/api/shorten', async (request: Request, env: Env) => {
  // TODO: Your logic here
  // 1. Validate the URL from request body
  // 2. Generate a unique short code (e.g. Base62)
  // 3. Store in KV: await env.SHORT_URLS.put(code, url)
  // 4. Return the short URL
  
  return new Response(JSON.stringify({ message: "Not implemented yet" }), {
    headers: { 'Content-Type': 'application/json' },
    status: 501
  });
});

// GET /:code
// Redirects to the original URL
router.get('/:code', async (request: Request, env: Env) => {
  const code = request.params.code;

  // TODO: Your logic here
  // 1. Look up code in KV: const url = await env.SHORT_URLS.get(code)
  // 2. If found, return Response.redirect(url, 301)
  // 3. If not found, return 404

  return new Response(`Short code '${code}' not found`, { status: 404 });
});

// 404 Fallback
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  fetch: router.handle
};
