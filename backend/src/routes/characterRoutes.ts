import { Hono } from 'hono';
import type { AppBindings } from '../authentication';
import { requireAccount } from '../authentication';
import { listCharactersForAccount } from '../characters';

export const characterRoutes = new Hono<AppBindings>();

/**
 * The signed-in account and its characters, each with the address it published.
 * The address is what the host link corrects, so it is the figure the dashboard
 * exists to show.
 */
characterRoutes.get('/characters', requireAccount, async (context) => {
  const characters = await listCharactersForAccount(context.get('accountIdentifier'));

  return context.json({
    account: {
      id: context.get('accountIdentifier'),
      displayName: context.get('accountName'),
    },
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      rank: character.rank,
      experience: character.experience,
      publicAddress: character.public_ip,
      publicPort: character.public_port,
    })),
  });
});
