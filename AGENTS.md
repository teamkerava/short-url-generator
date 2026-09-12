# AGENTS.md - Short URL Generator

## Commands

| Action | Command |
|--------|---------|
| Install deps | `bun install` |
| Start dev server | `bun start` (runs `wrangler dev`, emulates Worker on port 8787) |
| Deploy | `bun run deploy` |
| Run all tests | `bun test` |
| Lint (tsc check) | `npx tsc --noEmit` (via lint-staged on `.ts` files) |

## Key Code Patterns

- **Layout**: `src/index.ts` wires the router; shared code lives in `src/lib/{types,utils}.ts`; feature routes live in `src/routes/{shorten,upload}.ts`
- **`generateShortCode(length=6)`** (`src/lib/utils.ts`): generates random alphanumeric code from `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`
- **`parseDuration(duration)`** (`src/lib/utils.ts`): parses strings like `'15m'`, `'1h'`, `'1d'`, `'24h'`, `'1w'`; returns hours as number. Defaults to `24` if undefined.
- **`expiryUrl(url, duration=24)`** (`src/lib/utils.ts`): returns `{ url, expiresAt: ISO string }` based on `Date.now() + hours * 3600000`
- **`parseOneTime(value)`** (`src/lib/utils.ts`): normalizes one-time flags from JSON booleans and form strings (`"true"`/`"1"`/`"on"`)
- **URL normalization**: `new URL(normalizedUrl)` validates and normalizes; only `http:`/`https:` protocols allowed
- **KV `put`**: stores `JSON.stringify(kv_value)` (`{ url, createdAt, expiresAt, oneTime? }`) under generated short code
- **KV `get`**: attempts `JSON.parse(value)`; falls back to treating value as plain string URL; checks `expiresAt` against `new Date()` for 410 Gone; one-time entries are `delete`d on first read and redirect with `Cache-Control: no-store`
- **R2 `put`**: stores image bytes under generated filename; `customMetadata: { expiresAt, onetime? }` holds ISO expiry (default `24h`, configurable via `duration` form field) plus optional one-time flag (`oneTime` form field; lowercase key since metadata travels as case-insensitive `x-amz-meta-*` headers)
- **R2 `get`**: checks `customMetadata.expiresAt` against `new Date()`; deletes the object and returns 410 Gone if expired; one-time objects are deleted after first serve with `Cache-Control: no-store`; otherwise caps `Cache-Control: max-age` at remaining TTL

## KV & Bindings

- Namespace `SHORT_URLS` bound in `wrangler.toml`; ID `69c7cf8a99a54eadb89c230c8f4b5a06`
- R2 bucket `IMAGE_R2` for image uploads

## API Endpoints (from `src/index.ts`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/shorten` | Create short URL. Body: `{ url, duration?, oneTime? }`. Returns `{ code, shortUrl, expiresAt, oneTime? }` |
| `POST` | `/api/upload` | Upload image. Multipart fields: `image` (file), `duration?`, `oneTime?`. Returns `{ code, shortUrl, originalMimeType, expiresAt, oneTime? }` |
| `GET` | `/` | Serves frontend HTML |
| `GET` | `/api/docs` | Serves API docs HTML |
| `GET` | `/:code` | Redirects to original URL (301). Returns 404 if not found, 410 if expired. One-time links are deleted on first view |
| `GET` | `/img/:code` | Serves image from R2 bucket (404 if missing, 410 if expired). One-time images are deleted after first serve |

## Testing (`bun:test`)

- Tests in `src/index.test.ts` use `bun:test` with `mock` for KV
- Mock env: `SHORT_URLS` has `put` (mock) and `get` (returns stored string or JSON)
- Test flow: `worker.fetch(request, mockEnv, {})` — pass the worker's fetch handler your mock env
- Run: `bun test`

## Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `./scripts/test-local-kv.sh` | Creates a short URL via curl, then inspects KV content with `wrangler kv key get` |
| `./scripts/test-local-curl.sh [duration]` | Quick curl POST to `/api/shorten` |
| `./scripts/check-local-kv-value.sh <code>` | Look up a specific KV key value locally |

## Environment

- Requires `bun`
- Requires Wrangler CLI (devDependency; `wrangler dev` / `wrangler deploy`)
- KV namespace `SHORT_URLS` must be created in Cloudflare dashboard/CLI if deploying
- `wrangler login` for deploy access