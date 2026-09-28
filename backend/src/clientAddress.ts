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
