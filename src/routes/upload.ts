import { error } from 'itty-router';
import type { Env, Request } from '../lib/types';
import { expiryUrl, generateShortCode, parseOneTime } from '../lib/utils';

// POST /api/upload
// Request body: multipart/form-data with "image" field,
// optional "duration" field and optional "oneTime" flag.

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

export const handleUpload = async (request: Request, env: Env) => {
  if (!env.IMAGE_R2) {
    return error(500, "Image storage is not configured. The hamster powering R2 called in sick.");
  }

  let data: FormData;
  try {
    data = await request.formData();
  } catch (err) {
    return error(400, "Invalid request. I asked for multipart/form-data with an 'image' field and got... this.");
  }

  const file = data.get('image') as File | string | null;

  if (!file || typeof file === 'string') {
    return error(400, "No image? Bold strategy. Send multipart/form-data with an 'image' field.");
  }

  const mimeType = file.type || 'application/octet-stream';
  const fileExt = ALLOWED_IMAGE_TYPES[mimeType];
  if (!fileExt) {
    return error(400, `Unsupported image type '${mimeType}'. We take png, jpeg, gif, webp, svg, avif, bmp, ico — not modern art.`);
  }

  if (file.size === 0) {
    return error(400, "Empty file. That's just vibes, not an image. Pick a real one.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return error(400, "Image too large. 10 MB max — this isn't a museum archive.");
  }

  const fileName = `${generateShortCode(8)}.${fileExt}`;

  let duration = '24h';
  const rawDuration = data.get('duration');
  if (typeof rawDuration === 'string' && rawDuration.trim()) {
    duration = rawDuration.trim();
  }

  let expiresAt: string;
  try {
    expiresAt = expiryUrl(fileName, duration).expiresAt;
  } catch (err) {
    return error(400, (err as Error).message);
  }

  const oneTime = parseOneTime(data.get('oneTime'));

  try {
    // R2 accepts ArrayBuffer directly; Node's Buffer does not exist in Workers.
    await env.IMAGE_R2.put(fileName, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: mimeType
      },
      customMetadata: {
        expiresAt,
        // Lowercase key: customMetadata travels as x-amz-meta-* headers,
        // whose names are case-insensitive and may come back lowercased.
        ...(oneTime ? { onetime: '1' } : {}),
      }
    });
  } catch (err) {
    console.error("R2 put error:", err);
    return error(500, "Failed to store image. The bucket fumbled it — try again?");
  }

  const origin = new URL(request.url).origin;
  const shortUrl = `${origin}/img/${fileName}`;

  return new Response(JSON.stringify({
    code: fileName,
    shortUrl,
    originalMimeType: mimeType,
    expiresAt,
    ...(oneTime ? { oneTime: true as const } : {}),
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201
  });
};

// GET /img/:code
// Serves image from R2 bucket. One-time images are deleted after first serve.

export const handleServeImage = async (request: Request, env: Env) => {
  const code = request.params.code;
  const file = await env.IMAGE_R2.get(code);

  if (!file) {
    return error(404, `Image '${code}' not found. It either never existed or already burned after its one glorious view.`);
  }

  const expiresAt = file.customMetadata?.expiresAt;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    try {
      await env.IMAGE_R2.delete(code);
    } catch (e) {}
    return error(410, "This image has expired. Nothing gold can stay.");
  }

  // Accept the legacy mixed-case key too (objects uploaded before the fix).
  const oneTime = file.customMetadata?.onetime === '1' || file.customMetadata?.oneTime === '1';
  const contentType = file.httpMetadata?.contentType || 'application/octet-stream';
  const body = await file.arrayBuffer();

  if (oneTime) {
    // Burn after reading: delete so a second viewer gets 404.
    try {
      await env.IMAGE_R2.delete(code);
    } catch (e) {}
    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      }
    });
  }

  // Don't let caches outlive the object: cap max-age at the remaining TTL.
  // Objects uploaded before expiry existed have no metadata and keep the old header.
  let cacheControl = 'public, max-age=31536000, immutable';
  if (expiresAt) {
    const remainingSec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    cacheControl = `public, max-age=${Math.min(remainingSec, 86400)}`;
  }

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    }
  });
};
