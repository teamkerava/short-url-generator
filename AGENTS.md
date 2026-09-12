# AGENTS.md — short-url-worker (Cloudflare Workers URL shortener + image host)

## Commands

| Action | Command |
|--------|---------|
| Install deps | `bun install` |
| Dev server | `bun start` (`wrangler dev`, port 8787, emulates KV/R2 locally) |
| Deploy | `bun run deploy` |
| Tests | `bun test` (single file: `src/index.test.ts`) |
| Lint/typecheck | `npx tsc --noEmit` (strict; this *is* the linter, via lint-staged on `*.ts`) |

- `wrangler` CLI requires **Node ≥ 22**. If `bun start` dies with a Node-version error, that's why (system node here is v20) — use bun for tests/typecheck instead.
- Pre-commit hook (`.husky/pre-commit`) runs `bunx tsc --noEmit` on the whole project and **blocks** the commit on failure. It's intentionally *not* lint-staged: lint-staged would pass staged filenames to `tsc`, which then ignores `tsconfig.json` (hard `TS5112` error on modern tsc). `bun test` is deliberately *not* in the hook — 2 tests fail on purpose (see below).

## Layout

- `src/index.ts` only wires the router (`itty-router` `AutoRouter`) and re-exports lib helpers for tests. Handlers live in `src/routes/shorten.ts` (`POST /api/shorten`, `GET /:code`) and `src/routes/upload.ts` (`POST /api/upload`, `GET /img/:code`); shared types/helpers in `src/lib/{types,utils}.ts`.
- `public/` is served by the platform **before** the Worker runs (`[assets]` + `ASSETS` binding in `wrangler.toml`). `GET /` never reaches the Worker; API docs are edited directly in `public/docs.html`. Frontend (`app.js`) is vanilla JS, no build step.

## Gotchas (read before touching read paths)

- **Never fetch a one-time URL except to consume it.** Any GET burns it (entry deleted, second view 404s). The frontend previews one-time images via local `URL.createObjectURL`, never via the server URL — keep it that way.
- **R2 `customMetadata` keys: write lowercase (`onetime`), accept both cases on read.** Metadata travels as case-insensitive `x-amz-meta-*` headers and may come back lowercased; mocks preserve case, production may not.
- **KV values have two formats**: legacy plain-string URLs and current JSON `{ url, createdAt, expiresAt, oneTime? }`. `GET /:code` must handle both.
- **Deletes are best-effort** (try/catch, e.g. expiry cleanup, one-time burn). Concurrent first-readers can race the burn — KV/R2 have no atomic take.
- **One-time redirects can't use `Response.redirect()`** — it's built manually (`new Response(null, { status: 301, headers: { Location, 'Cache-Control': 'no-store' } })`) because redirect responses need the `no-store` header.
- **2 tests fail on purpose (for now)**: `src/index.test.ts:48,63` assert `Location` without trailing slash, but `Response.redirect()` normalizes `https://example.com` → `https://example.com/`. Baseline is 20 pass / 2 fail — don't "fix" handler behavior to satisfy them.
- **Test mocks must include `delete`** on KV/R2 envs or one-time/expiry paths throw. Call pattern: `worker.fetch(request, mockEnv as any, {} as any)`.
- Error messages are deliberately snarky (site voice). Keep status codes stable — tests and the frontend (`data.error`) depend on them, not on message text.

## Bindings (`wrangler.toml`; setup commands in its comments)

- KV `SHORT_URLS` (id `69c7cf8a99a54eadb89c230c8f4b5a06`), R2 `IMAGE_R2` (bucket `short-url-images`), `ASSETS` (static files). No AI binding (removed).

## API

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/shorten` | Body `{ url, duration?, oneTime? }` → `{ code, shortUrl, expiresAt, oneTime? }`, 201. Durations: `15m`, `1h`, `24h` (default), `1w`, custom `36h`. |
| `POST` | `/api/upload` | Multipart `image` + `duration?` + `oneTime?` (`"true"`/`"1"`/`"on"`). 10 MB max, fixed allowlist in `upload.ts`. |
| `GET` | `/:code` | 301 (regular) / 301 + `no-store` + delete (one-time) / 404 / 410 expired. |
| `GET` | `/img/:code` | Same semantics; non-one-time `Cache-Control: max-age` capped at remaining TTL (max 86400s). |
| `GET` | `/api/docs` | Serves `public/docs.html` via `ASSETS`. |

## Scripts (`scripts/`, need dev server running)

- `./scripts/test-local-curl.sh [duration]` — quick `POST /api/shorten`.
- `./scripts/test-local-kv.sh` — shorten, then inspect KV via `wrangler kv key get`.
- `./scripts/check-local-kv-value.sh <code>` — read one KV key locally.
