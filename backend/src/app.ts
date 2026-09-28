import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { AppBindings } from './authentication';
import { authenticationRoutes } from './routes/authenticationRoutes';
import { characterRoutes } from './routes/characterRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { magicLinkRoutes } from './routes/magicLinkRoutes';

/**
 * Builds the backend.
 *
 * Every route lives under `/api`, because the frontend is its own deployment and
 * reaches this one across origins — the prefix is what makes that addressable,
 * and what keeps the bare root free to answer something useful to a visitor who
 * opened the API by hand.
 */
export function createApp() {
  const app = new Hono<AppBindings>();

  app.use('*', logger());

  // The two deployments sit on two Vercel hostnames, so every call the frontend
  // makes is cross-origin. Nothing here is authenticated by a cookie, so the
  // browser's credential rules are not in play and the origin need not be
  // narrowed to allow the header the token travels in.
  app.use(
    '/api/*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  app.get('/', (context) => context.json({ service: 'altmgo-backend', status: 'ok' }));

  app.route('/api', authenticationRoutes);
  app.route('/api', characterRoutes);
  app.route('/api', healthRoutes);
  app.route('/api', magicLinkRoutes);

  app.notFound((context) => context.json({ error: 'Not found.' }, 404));

  // A thrown error is answered as JSON like everything else, so the browser can
  // read the reason rather than parsing a Vercel error page.
  app.onError((error, context) => {
    console.error(error);

    return context.json({ error: error.message || 'Unexpected server error.' }, 500);
  });

  return app;
}
