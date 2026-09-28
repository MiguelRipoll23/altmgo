import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../authentication';
import { readEnvironment } from '../environment';
import { parseForwardedIpv4, parseHostLinkCode } from '../hostLinkCode';
import { recordPublicAddress, resolveHostLink } from '../hostLinks';

export const magicLinkRoutes = new Hono<AppBindings>();

/** Reads the visitor's public address off the request the browser made.
 *
 * Vercel terminates TLS in front of the function, so the socket address is the
 * edge's; the forwarded header is the one that names the visitor. */
function clientAddress(context: Context): string | undefined {
  const forwarded = context.req.header('x-forwarded-for')?.split(',')[0];

  return parseForwardedIpv4(forwarded ?? context.req.header('x-real-ip'));
}

/** Reads the code out of the path, answering the request when it is not one. */
function readCode(context: Context): string | { error: string } {
  const code = parseHostLinkCode(context.req.param('code') ?? '');

  return code ?? { error: 'That link does not carry a host code.' };
}

/**
 * Names the character a link belongs to, without writing anything. The page uses
 * this to show who is about to be updated and to refuse a code that names
 * nobody or names two hosts at once.
 */
magicLinkRoutes.get('/magic-link/:code', async (context) => {
  const code = readCode(context);
  if (typeof code !== 'string') {
    return context.json({ error: code.error }, 400);
  }

  const resolution = await resolveHostLink(readEnvironment().jwtSecret, code);

  if (resolution.kind === 'unknown') {
    return context.json(
      { error: 'This link is not valid any more. Open a game in the lobby to get a new one.' },
      404,
    );
  }

  if (resolution.kind === 'ambiguous') {
    return context.json(
      { error: 'Two hosts share this code right now. Close the other game and try again.' },
      409,
    );
  }

  return context.json({ character: { id: resolution.character.id, name: resolution.character.name } });
});

/**
 * Publishes the visitor's address for the character the link names, which is the
 * whole purpose of the link. It is a POST rather than a GET because it writes,
 * and because a link that changes something by being prefetched or crawled would
 * be a link that acts without being opened.
 */
magicLinkRoutes.post('/magic-link/:code', async (context) => {
  const code = readCode(context);
  if (typeof code !== 'string') {
    return context.json({ error: code.error }, 400);
  }

  const address = clientAddress(context);
  if (!address) {
    return context.json(
      {
        error:
          'Your address could not be read. The game only serves IPv4, so an IPv6 connection has nowhere to publish.',
      },
      400,
    );
  }

  const resolution = await resolveHostLink(readEnvironment().jwtSecret, code);

  if (resolution.kind === 'unknown') {
    return context.json(
      { error: 'This link is not valid any more. Open a game in the lobby to get a new one.' },
      404,
    );
  }

  if (resolution.kind === 'ambiguous') {
    return context.json(
      { error: 'Two hosts share this code right now. Close the other game and try again.' },
      409,
    );
  }

  const recorded = await recordPublicAddress(resolution.character.id, address);
  if (!recorded) {
    return context.json(
      {
        error:
          'That character has not registered a peer endpoint yet. Join a lobby in game once, then open this link again.',
      },
      409,
    );
  }

  return context.json({
    character: { id: resolution.character.id, name: resolution.character.name },
    address,
  });
});
