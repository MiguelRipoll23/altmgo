import { Hono } from 'hono';
import type { AppBindings } from '../authentication.js';
import { requireAccount } from '../authentication.js';
import { readClientAddress } from '../clientAddress.js';
import { listConnectedCharactersOfAccount, publishAddress } from '../publicAddresses.js';

export const addressRoutes = new Hono<AppBindings>();

/**
 * Publishes the caller's address for each of their own characters that has a
 * connection row, which is what makes that game joinable from outside the network
 * the players share.
 *
 * It is a POST because it writes. The token is the whole permission: the characters
 * written are the account's own, and the only fact recorded is the address the
 * request arrived from.
 *
 * Nothing to publish to is not a failure — a character that has never connected has
 * no row to correct — so the page can publish silently on load and let the button
 * report the reason when the player asks for it.
 */
addressRoutes.post('/addresses', requireAccount, async (context) => {
  const address = readClientAddress(context);
  if (!address) {
    return context.json(
      {
        error:
          'Your address could not be read. The game only serves IPv4, so an IPv6 connection has nowhere to publish.',
      },
      400,
    );
  }

  const connected = await listConnectedCharactersOfAccount(context.get('accountIdentifier'));
  const published: { id: number; name: string }[] = [];

  for (const character of connected) {
    if (await publishAddress(character.id, address)) {
      published.push({ id: character.id, name: character.name });
    }
  }

  return context.json({ address, published });
});
