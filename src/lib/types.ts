import type { IRequest } from 'itty-router';

// Environment Bindings
export interface Env {
  SHORT_URLS: KVNamespace;
  IMAGE_R2: R2Bucket;
  ASSETS: Fetcher;
}

export interface ShortUrlData {
  url: string;
  createdAt: string;
  expiresAt: string;
  /** When true, the link is deleted on first access (burn after reading). */
  oneTime?: boolean;
}

export interface ShortenRequest {
  url?: string;
  duration?: string;
  /** Opt-in burn-after-reading flag for short URLs. */
  oneTime?: boolean;
}

export interface Request extends IRequest {
  params: {
    code: string;
  };
}
