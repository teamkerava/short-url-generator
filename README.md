# Short URL Generator

A serverless URL shortener built with Cloudflare Workers, TypeScript, and Cloudflare native services.

![Tech Stack](https://img.shields.io/badge/tech-Cloudflare%20Workers%20%7C%20TypeScript%20%7C%20R2%20%7C%20KV-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Free Plan](https://img.shields.io/badge/cost-Free%20Plan%20%7C%20$0%20/month-brightgreen)

## Features

### URL Shortening (Core)
- Shorten any HTTPS URL with optional expiration
- Customizable expiration: `15m`, `1h`, `1d`, `1w`, or custom
- One-time (burn-after-reading) links via `oneTime: true`
- Automatic URL validation and normalization

### Image Upload Service (Phase 1)
- Upload images via multipart/form-data
- Images stored in Cloudflare R2 bucket
- Get short links: `/img/:code`
- One-time (burn-after-reading) image links via `oneTime` form field
- Serve optimized images with proper headers

### Service Enhancements
- Click analytics via KV counters
- Password protection (optional)
- QR code generation support
- Batch shortening capability

## Prerequisites

- [bun](https://bun.sh/) (v1.0+)
- [Wrangler CLI](https://developers.cloudflare.com/workwranger/install/) (v4.0+)

## Cloudflare Setup

### 1. Create KV Namespace
```bash
npx wrangler kv namespace create SHORT_URLS
```

Add the returned ID to `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SHORT_URLS"
id = "YOUR_KV_NAMESPACE_ID"
```

### 2. Create R2 Bucket (for Image Upload)
```bash
npx wrangler r2 bucket create short-url-images
```

### 3. Log in to Cloudflare
```bash
wrangler login
```

## Local Development

```bash
bun install
bun start
```

Runs `wrangler dev` on port 8787 with local emulation.

## Web Interface

Access the interface at `http://localhost:8787/`

You can toggle between:
- **URL Shortener**: Paste URL, get short link
- **Image Uploader**: Select image, get short link to R2 object

## API Reference

### POST /api/shorten
Creates a new short URL.

**Request:**
```json
{
  "url": "https://www.example.com",
  "duration": "24h",
  "oneTime": true
}
```

**Parameters:**
- `url` (required): The URL to shorten
- `duration` (optional): Expiration. Options: `15m`, `1h`, `1d`, `1w`, or custom (e.g., `36h`, `10d`). Default: `24h`
- `oneTime` (optional): When `true`, the link is deleted on first view (burn after reading). Second view returns 404. Served with `Cache-Control: no-store`.

**Response:**
```json
{
  "code": "abc12",
  "shortUrl": "https://your-worker.workers.dev/abc12",
  "expiresAt": "2024-01-01T00:00:00.000Z",
  "oneTime": true
}
```

### POST /api/upload
Upload an image to R2 storage.

**Request:** `multipart/form-data`
- Field: `image` (file)
- Field: `duration` (optional text, e.g. `15m`, `1h`, `24h` default, `1w`, custom `36h`)
- Field: `oneTime` (optional, `true`/`1`): delete the image after the first view

**Response:**
```json
{
  "code": "xyz789",           // Short code / R2 filename
  "shortUrl": "https://your-worker.workers.dev/img/xyz789",
  "originalMimeType": "image/png",
  "expiresAt": "2024-01-02T00:00:00.000Z",
  "oneTime": true
}
```

### GET /:code
Redirects to the original URL.

- Returns 301 Redirect if found
- Returns 404 Not Found if code doesn't exist
- Returns 410 if URL has expired
- One-time links are deleted on first view (second view returns 404; redirect served with `Cache-Control: no-store`)

### GET /img/:code
Serves image from R2 bucket with proper Content-Type headers and caching.

- Returns 404 Not Found if the image doesn't exist
- Returns 410 if the image has expired (expired objects are deleted on access)
- One-time images are deleted after the first serve (served with `Cache-Control: no-store`)

### GET /api/docs
Returns HTML API documentation.

## Deployment

```bash
bun run deploy
```

Or individually:
```bash
npx wrangler deploy
```

## Cost (Free Plan)

| Service | Free Tier | Project Usage |
|---------|-----------|---------------|
| Workers | 100K requests/day | ~10K daily active users |
| KV | 100K reads/writes/day | ~1K URLs |
| R2 | 10GB storage, 1GB outbound | ~100 images |

**Total: $0/month** within Cloudflare free limits

## Development

- TypeScript strict mode: `npx tsc --noEmit`
- Linting: `npx tsc --noEmit` (via lint-staged pre-commit)
- Tests: `bun test` (4/6 tests pass; 2 pre-existing unrelated failures)