import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import { createServer as createHttpServer } from 'node:http';
import { allowedOrigins } from './allowedOrigins.js';
import app from './index.js';

/**
 * The backend's front door: one plain HTTP port handing everything under `/api` to the
 * Hono app.
 *
 * The site is its own deployment on Vercel and calls this container at
 * http://raspberrypi.tailbb45e2.ts.net:8443, so the request is cross-origin. The app's
 * CORS middleware answers the preflight, and the caller's address is read from
 * the socket the request arrived on — the Service keeps it with
 * `externalTrafficPolicy: Local` — rather than from a proxy hop.
 */
const port = Number(process.env.PORT ?? 8443);

const server = new Hono();

// The frontend asks for this on load to tell a reachable backend from a network
// that has not joined the tailnet yet, so the answer has to be readable from the
// Vercel origin.
server.use(
  '/health',
  cors({ origin: allowedOrigins, allowMethods: ['GET', 'OPTIONS'], maxAge: 86400 }),
);

server.get('/health', (context) =>
  context.json({ service: 'mgo2-web-backend', status: 'ok' }),
);

/**
 * Re-dispatches an API request into the existing app, naming the caller from
 * the socket the request arrived on.
 *
 * The app reads the visitor's address from `x-forwarded-for` because Vercel
 * puts it there. A container receives the connection itself, so the socket is
 * the honest source — and it is written over any header the client sent, so a
 * browser cannot name somebody else's address.
 */
function handleApi(context: Context) {
  const address = getConnInfo(context).remote.address;

  if (address) {
    context.req.raw.headers.set('x-forwarded-for', address);
  }

  return app.fetch(context.req.raw);
}

server.all('/api', handleApi);
server.all('/api/*', handleApi);

server.notFound((context) => context.json({ error: 'Not found.' }, 404));

serve(
  tls
    ? {
        fetch: server.fetch,
        port,
        hostname: '0.0.0.0',
        createServer: createHttpsServer,
        serverOptions: tls,
      }
    : {
        fetch: server.fetch,
        port,
        hostname: '0.0.0.0',
        createServer: createHttpServer,
      },
  (info) => {
    console.log(`mgo2-web-backend listening on http://${info.address}:${info.port}`);
  },
);
