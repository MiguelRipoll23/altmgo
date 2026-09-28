import { createApp } from './app';

/**
 * Vercel finds a Hono app by this default export — from `app`, `index` or
 * `server` at the project root or under `src/` — and routes every request to it,
 * letting Hono's own router match the path. Nothing else has to be configured.
 */
export default createApp();
