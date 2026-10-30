import { isIPv4 } from 'node:net';
import type { Context } from 'hono';

/**
 * Reads the visitor's public address off the request the browser made.
 *
 * Vercel terminates TLS in front of the function, so the socket address is the
 * edge's; the forwarded header is the one that names the visitor.
 */
export function readClientAddress(context: Context): string | undefined {
  const forwarded = context.req.header('x-forwarded-for')?.split(',')[0];

  return parseForwardedIpv4(forwarded ?? context.req.header('x-real-ip'));
}

/**
 * Reads an address out of a forwarded header value. Only IPv4 is accepted: the
 * game stores the public address in a sixteen-byte field, so a v6 address has
 * nowhere to go, and storing half of one would be worse than refusing it.
 */
export function parseForwardedIpv4(address: string | undefined): string | undefined {
  if (!address) {
    return undefined;
  }

  let candidate = address.trim();
  if (candidate.startsWith('::ffff:')) {
    candidate = candidate.slice('::ffff:'.length);
  }

  // A few proxies append a port to the address they forward.
  const portSeparator = candidate.lastIndexOf(':');
  if (portSeparator > 0 && candidate.indexOf(':') === portSeparator) {
    candidate = candidate.slice(0, portSeparator);
  }

  return isIPv4(candidate) ? candidate : undefined;
}

/**
 * Whether the socket peer is a hop on this machine rather than the visitor.
 *
 * The Funnel terminates TLS and proxies to 127.0.0.1, and the cluster's port
 * mapping rewrites a loopback connection before it reaches the container, so a
 * request that came through the Funnel arrives from a private address. Such a
 * hop reports the visitor in `x-forwarded-for` - the Funnel even replaces a
 * header the client sent - so that header is the only record of the visitor
 * left, and the socket names the proxy instead.
 */
export function isProxyHop(address: string | undefined): boolean {
  if (!address) {
    return false;
  }

  const candidate = address.startsWith('::ffff:') ? address.slice('::ffff:'.length) : address;
  if (candidate === '::1' || candidate === '127.0.0.1') {
    return true;
  }

  const [first = -1, second = -1] = candidate.split('.').map(Number);

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}
