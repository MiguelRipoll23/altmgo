import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { AppBindings } from './authentication.js';
import { authenticationRoutes } from './routes/authenticationRoutes.js';
import { characterRoutes } from './routes/characterRoutes.js';
import { addressRoutes } from './routes/addressRoutes.js';
import { clanRoutes } from './routes/clanRoutes.js';
import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { managerRoutes } from './routes/managerRoutes.js';
import { moderatorRoutes } from './routes/moderatorRoutes.js';

/**
 * Vercel finds the backend by this default export — from `app`, `index` or
 * `server` at the project root or under `src/` — and routes every request to it,
 * letting Hono's own router match the path. Nothing else has to be configured.
 *
 * Every route lives under `/api`, because the frontend is its own deployment and
 * reaches this one across origins — the prefix is what makes that addressable,
 * and what keeps the bare root free to answer something useful to a visitor who
 * opened the API by hand.
 */
const app = new Hono<AppBindings>();

app.use('*', logger());

// Locally the site and this app sit on two origins — vite on :5173, `vercel dev`
// on :3000 — so a development call is cross-origin and needs this. Deployed they
// share one origin and none of it is in play. Nothing here is authenticated by a
// cookie, so the browser's credential rules do not apply and the origin need not
// be narrowed to allow the header the token travels in.
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

app.get('/', (context) => context.json({ service: 'altmgo-backend', status: 'ok' }));

app.route('/api', authenticationRoutes);
app.route('/api', characterRoutes);
app.route('/api', addressRoutes);
app.route('/api', clanRoutes);
app.route('/api', dashboardRoutes);

// The staff routes are grouped by what they may do rather than by what they act
// on: everything under /moderator is the work of running the events, and
// everything under /manager speaks for the server. Each group checks the role
// itself, so a route added to the wrong group is refused rather than opened.
app.route('/api', moderatorRoutes);
app.route('/api', managerRoutes);

app.notFound((context) => context.json({ error: 'Not found.' }, 404));

// A thrown error is answered as JSON like everything else, so the browser can
// read the reason rather than parsing a Vercel error page.
app.onError((error, context) => {
  console.error(error);

  return context.json({ error: error.message || 'Unexpected server error.' }, 500);
});

export default app;
