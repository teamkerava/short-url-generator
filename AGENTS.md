# AGENTS.md — short-url-worker (Cloudflare Workers URL shortener + image host)

> **Keep me fresh (agent rule):** any change to behavior, routes, bindings, limits,
> commands, or layout must update this file in the *same* commit. One line per
> fact, no fluff. The pre-commit hook reminds you if you forget (non-blocking).

## Commands

| Action | Command |
|--------|---------|
| Install deps | `bun install` |
| Dev server | `bun start` (`wrangler dev`, port 8787, emulates KV/R2 locally) |
| Deploy | `bun run deploy` |
| Tests | `bun test` (single file: `src/index.test.ts`; current baseline 24 pass / 0 fail) |
| Lint/typecheck | `bunx tsc --noEmit` (strict; this *is* the linter) |

- `wrangler` CLI requires **Node ≥ 22** — use bun for tests/typecheck instead.
- Pre-commit hook (`.husky/pre-commit`) blocks on `bunx tsc --noEmit` failure; its AGENTS.md reminder is non-blocking. Never pass filenames to `tsc` (hard-errors `TS5112` alongside `tsconfig.json`).

## Layout

- `src/index.ts` only wires the router (`itty-router` `AutoRouter`) and re-exports lib helpers for tests. Handlers live in `src/routes/shorten.ts` (`POST /api/shorten`, `GET /:code`) and `src/routes/upload.ts` (`POST /api/upload`, `GET /img/:code`); shared types/helpers in `src/lib/{types,utils}.ts`.
- `public/` is served by the platform **before** the Worker runs (`[assets]` + `ASSETS` binding in `wrangler.toml`). `GET /` never reaches the Worker.
- API docs are edited directly in `public/docs.html`. Frontend (`app.js`) is vanilla JS, no build step.
- Header is the only nav (no footer). The repo link in the header points at `github.com/teamkerava/shorten`.
- `index.html`/`docs.html` carry Open Graph + Twitter Card tags with absolute prod URLs (`https://url.imuroin.net/...`) plus `public/og-image.png` (1200×630). Keep the absolute URLs in sync if the domain ever changes.
- Short-link (`/:code`) embeds resolve to the *target's* preview (bare 301); `/img/:code` embeds as a raw image.
- The active tab (url/image) persists in a `shorten.defaultTab` cookie (1yr, `SameSite=Lax`); tab switches save it, page load restores it (try/catch — private mode may throw).
- The image pane accepts clipboard images (paste anywhere picks up `image/*` from `clipboardData`, switches to the image tab, loads the file into the form); the dropzone auto-focuses whenever the image tab becomes active so paste works immediately.
- The image pane shows a "deleted automatically after 30 days" note — it's load-bearing (enforced cap + R2 lifecycle, below), keep it if you touch that pane.

## Gotchas (read before touching read paths)

- **Never fetch a one-time URL except to consume it.** Any GET burns it (entry deleted, second view 404s). The frontend previews one-time images via local `URL.createObjectURL`, never via the server URL — keep it that way.
- **R2 `customMetadata` keys: write lowercase (`onetime`), accept both cases on read.** Metadata travels as case-insensitive `x-amz-meta-*` headers and may come back lowercased; mocks preserve case, production may not.
- **KV values have two formats**: legacy plain-string URLs and current JSON `{ url, createdAt, expiresAt, oneTime? }`. `GET /:code` must handle both.
- **Deletes are best-effort** (try/catch, e.g. expiry cleanup, one-time burn). Concurrent first-readers can race the burn — KV/R2 have no atomic take.
- **One-time redirects can't use `Response.redirect()`** — built manually with `no-store` (`new Response(null, { status: 301, headers: { Location, 'Cache-Control': 'no-store' } })`).
- **Trailing-slash history**: `Response.redirect()` normalizes `https://example.com` → `https://example.com/`; tests assert the normalized form, so don't change handler behavior for this.
- **Test mocks must include `delete`** on KV/R2 envs or one-time/expiry paths throw. Call pattern: `worker.fetch(request, mockEnv as any, {} as any)`.
- Error messages are deliberately snarky (site voice). Keep status codes stable — tests and the frontend (`data.error`) depend on them, not on message text.

## Bindings (`wrangler.toml`; setup commands in its comments)

- KV `SHORT_URLS` (id `69c7cf8a99a54eadb89c230c8f4b5a06`), R2 `IMAGE_R2` (bucket `short-url-images`), `ASSETS` (static files). No AI binding.
- R2 has a dashboard-side lifecycle policy deleting all objects after 30 days; `upload.ts` additionally rejects image durations over 30d (`MAX_IMAGE_TTL_HOURS`). Treat the 30-day cap as load-bearing.

## API

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/shorten` | Body `{ url, duration?, oneTime? }` → `{ code, shortUrl, expiresAt, oneTime? }`, 201. `duration` is any `parseDuration` value (`15m`, `1h`, `24h` default, `1w`, `36h`, `10d`, bare hours). |
| `POST` | `/api/upload` | Multipart `image` + `duration?` + `oneTime?` (`"true"`/`"1"`/`"on"`). 10 MB max, fixed allowlist in `upload.ts`. Image TTL capped at 30d (`MAX_IMAGE_TTL_HOURS`); R2 lifecycle policy deletes all objects after 30 days. |
| `GET` | `/:code` | 301 (regular) / 301 + `no-store` + delete (one-time) / 404 / 410 expired. |
| `GET` | `/img/:code` | Same semantics; non-one-time `Cache-Control: max-age` capped at remaining TTL (max 86400s). |
| `GET` | `/api/docs` | Serves `public/docs.html` via `ASSETS`. |
