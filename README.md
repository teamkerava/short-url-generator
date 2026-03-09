# Short URL Generator

A serverless URL shortener built with Cloudflare Workers, TypeScript, and Cloudflare KV.

## Prerequisites

- bun
- Wrangler CLI (installed via devDependencies)

## Setup

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

## Local Development

Start the local development server:

```bash
bun start
```

This runs `wrangler dev`, which emulates the Worker and KV storage locally on port 8787.

## Web Interface

A built-in web interface is available at the root URL (`http://localhost:8787/`).

## Testing

### Local Testing Script

A script is provided to test the KV functionality locally (write, read, inspect):

```bash
./test-local-kv.sh
```

### Manual Testing

Create a short URL:

```bash
curl -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Visit the generated URL in your browser or use curl to see the redirect:

```bash
curl -I http://localhost:8787/<code_from_response>
```

## Deployment

To deploy to Cloudflare:

```bash
bun run deploy
```

Note: You must have a Cloudflare account and be logged in via Wrangler (`wrangler login`). You also need to create the KV namespace in your Cloudflare dashboard or via CLI and update `wrangler.toml` with the correct ID.

## API Reference

### POST /api/shorten

Creates a new short URL.

**Request Body:**

```json
{
  "url": "https://www.example.com",
  "duration": "24h"
}
```

**Parameters:**
- `url` (required): The URL to shorten
- `duration` (optional): Expiration time. Options: `15m`, `1h`, `1d`, `24h`, `1w`, or custom format (e.g., `36h`, `10d`). Default: `24h`

**Response:**

```json
{
  "code": "abc12",
  "shortUrl": "https://your-worker.workers.dev/abc12"
}
```

### GET /:code

Redirects to the original URL associated with the code.

- Returns 301 Redirect if found.
- Returns 404 Not Found if the code does not exist.

### GET /api/docs

Returns HTML documentation for the API endpoints.
