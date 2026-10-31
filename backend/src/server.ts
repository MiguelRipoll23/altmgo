import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';
import { createServer as createHttpServer } from 'node:http';
import { allowedOrigins } from './allowedOrigins.js';
import { isProxyHop } from './clientAddress.js';
import app from './index.js';

/**
 * The backend's front door: one plain HTTP port handing everything under `/api` to the
 * Hono app.
 *
 * The site is its own deployment on Vercel and calls this container at
 * https://raspberrypi.tailbb45e2.ts.net:10000, so the request is cross-origin. The
 * app's CORS middleware answers the preflight, and the caller's address is read
 * from the socket when the client reached this container itself, or from the
 * `x-forwarded-for` the Tailscale Funnel writes when it proxied the request.
 */
const port = Number(process.env.PORT ?? 9090);

const server = new Hono();

// The frontend asks for this on load to tell a reachable backend from a network
// that has not joined the tailnet yet, so the answer has to be readable from the
// Vercel origin.
server.use(
  '/health',
  cors({ origin: allowedOrigins, allowMethods: ['GET', 'OPTIONS'], maxAge: 86400 }),
);

server.get('/health', (context) =>
  context.json({ service: 'altmgo-backend', status: 'ok' }),
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
  const peer = getConnInfo(context).remote.address;

  // A proxy hop reports the visitor in `x-forwarded-for`, and the Funnel even
  // replaces a header the client sent with the address it observed. A client
  // that reached this container itself is the socket, and writing the socket
  // over the header is what keeps a browser from naming somebody else's
  // address - which is why the condition is not simply "prefer the header".
  if (peer && !(isProxyHop(peer) && context.req.header('x-forwarded-for'))) {
    context.req.raw.headers.set('x-forwarded-for', peer);
  }

  return app.fetch(context.req.raw);
}

server.all('/api', handleApi);
server.all('/api/*', handleApi);

server.notFound((context) => context.json({ error: 'Not found.' }, 404));

serve(
  {
    fetch: server.fetch,
    port,
    hostname: '0.0.0.0',
    createServer: createHttpServer,
  },
  (info) => {
    console.log(`altmgo-backend listening on http://${info.address}:${info.port}`);
  },
);
