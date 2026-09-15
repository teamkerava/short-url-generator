import { AutoRouter, error } from 'itty-router';
import type { Env, Request } from './lib/types';
import { handleRedirect, handleShorten } from './routes/shorten';
import { handleServeImage, handleUpload } from './routes/upload';

const router = AutoRouter();

// POST /api/shorten — see src/routes/shorten.ts
router.post('/api/shorten', async (request: Request, env: Env) => handleShorten(request, env));

// POST /api/upload — see src/routes/upload.ts
router.post('/api/upload', async (request: Request, env: Env) => handleUpload(request, env));

// GET /api/docs
// Served from the static asset (public/docs.html) so the URL stays stable
// while the content is a real file. Note: GET / itself is served directly
// from public/index.html by the platform and never reaches the Worker.
router.get('/api/docs', (request: Request, env: Env) => {
  return env.ASSETS.fetch(new URL('/docs.html', request.url).toString());
});

// GET /:code — see src/routes/shorten.ts
router.get('/:code', async (request: Request, env: Env) => handleRedirect(request, env));

// GET /img/:code — see src/routes/upload.ts
router.get('/img/:code', async (request: Request, env: Env) => handleServeImage(request, env));

// 404 Fallback
router.all('*', () => error(404, "Not found. But hey, at least you tried, right?"));

// Re-export shared helpers so existing imports from "./index" keep working.
export { expiryUrl, generateShortCode, parseDuration, parseOneTime, checkRateLimit, getClientIp, RATE_LIMITS } from './lib/utils';
export type { Env, Request, ShortUrlData, ShortenRequest } from './lib/types';

export default {
  fetch: router.fetch
};
