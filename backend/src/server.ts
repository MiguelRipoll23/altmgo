import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { readFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import app from './index.js';

/**
 * The container's front door: one port serving the built site and handing
 * everything under `/api` to the Hono app the Vercel function also exports.
 *
 * The site and the API share this origin, so the browser's calls stay relative
 * and there is no cross-origin request to allow. That is the same arrangement
 * `vercel.json` makes at the edge, kept here so the repository can also run as
 * a single container.
 */
const port = Number(process.env.PORT ?? 8443);
const staticRoot = process.env.STATIC_ROOT ?? './public';

const certificatePath = process.env.TLS_CERTIFICATE_PATH;
const privateKeyPath = process.env.TLS_CERTIFICATE_KEY_PATH;
const tls =
  certificatePath && privateKeyPath
    ? {
        cert: readFileSync(certificatePath),
        key: readFileSync(privateKeyPath),
      }
    : undefined;

const server = new Hono();

server.get('/health', (context) => context.json({ service: 'mgo2-web', status: 'ok' }));

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

// A real file first, then the SPA's entry point for a deep link such as
// `/dashboard`. The API is already answered above, so neither rule can swallow
// it.
server.get('*', serveStatic({ root: staticRoot }));
server.get('*', serveStatic({ root: staticRoot, path: 'index.html' }));

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
    console.log(`mgo2-web listening on ${tls ? 'https' : 'http'}://${info.address}:${info.port}`);
  },
);
