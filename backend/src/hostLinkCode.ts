import { createHmac } from 'node:crypto';
import { isIPv4 } from 'node:net';

/** Number of digits a host-link code occupies. */
export const CodeDigits = 4;

/** Number of distinct codes a host-link code can take. */
export const CodeSpace = 10_000;

/**
 * Derives the code a host link carries, exactly as the game server does:
 * HMAC-SHA256 with the UTF-8 secret bytes as the key and the UTF-8 character
 * name as the message, the first four digest bytes read big-endian, that value
 * modulo 10000, rendered with leading zeros. The name is taken as it is stored,
 * case included. Changing any of that breaks every link already handed out.
 */
export function buildHostLinkCode(secret: string, characterName: string): string {
  const digest = createHmac('sha256', secret).update(characterName, 'utf8').digest();
  const value = digest.readUInt32BE(0) % CodeSpace;

  return String(value).padStart(CodeDigits, '0');
}

/**
 * Reads the code out of a URL segment: four digits, and nothing else. The lobby
 * sends the host to `/{code}`, so a segment that is not exactly that is a
 * mistyped path rather than a link.
 */
export function parseHostLinkCode(segment: string): string | undefined {
  const trimmed = segment.trim();

  return /^\d{4}$/.test(trimmed) ? trimmed : undefined;
}

/**
 * Reads the visitor's address out of a forwarded header. Only IPv4 is accepted:
 * the game stores the public address in a sixteen-byte field, so a v6 address
 * has nowhere to go, and storing half of one would be worse than refusing.
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
