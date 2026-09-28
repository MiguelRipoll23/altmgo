import { Hono } from 'hono';
import type { AppBindings } from '../authentication.js';
import { requireAccount } from '../authentication.js';
import { findCharacterForAccount, listCharactersForAccount, type OwnedCharacterRow } from '../characters.js';

export const characterRoutes = new Hono<AppBindings>();

/**
 * The signed-in account's own characters, and one of them in full.
 *
 * They are under `/account` rather than at `/characters` because that path is
 * already the staff search: the dashboard searches every account's characters,
 * answers with an account name beside each row, and is registered after this one.
 * A bare `/api/characters` was therefore answered by whichever matched first, and
 * the staff page was quietly being given the reader's own two characters however
 * many terms and orderings it asked for. Naming these by what they are settles
 * both: the staff search is the staff search again, and a page about a reader's
 * own characters is not built on a route another frame can widen.
 *
 * The figures sent back are the ones the game already stores — the rank and
 * experience the client derives its level and title from, the reward total its
 * card prints, and the address the game server last saw. The level itself is
 * derived where it is drawn rather than here, because that derivation is the
 * client's own and belongs next to the table it walks.
 */
characterRoutes.get('/account/characters', requireAccount, async (context) => {
  const characters = await listCharactersForAccount(context.get('accountIdentifier'));

  return context.json({
    account: {
      id: context.get('accountIdentifier'),
      displayName: context.get('accountName'),
    },
    characters: characters.map(describe),
  });
});

/** One of the caller's own characters, or nothing at all if it is not theirs. */
characterRoutes.get('/account/characters/:identifier', requireAccount, async (context) => {
  const identifier = Number(context.req.param('identifier'));

  if (!Number.isInteger(identifier) || identifier <= 0) {
    return context.json({ error: 'No such character.' }, 404);
  }

  const character = await findCharacterForAccount(context.get('accountIdentifier'), identifier);

  if (!character) {
    // The same answer as a character that does not exist, because a reader who
    // typed somebody else's identifier should not be able to tell the two apart.
    return context.json({ error: 'No such character.' }, 404);
  }

  return context.json({ character: describe(character) });
});

/**
 * One character as the pages read it.
 *
 * The address is `null` rather than a half-built string when either half is
 * missing: a connection row with a port and no address cannot be joined by
 * another player, and printing `1.2.3.4:` beside a missing address reads as an
 * address that can be pasted.
 */
function describe(character: OwnedCharacterRow) {
  return {
    id: character.id,
    name: character.name,
    rank: character.rank,
    experience: character.experience,
    totalRewards: character.total_rewards,
    comment: character.comment,
    lastSeenAt: character.last_seen_at,
    publicAddress:
      character.public_ip && character.public_port
        ? `${character.public_ip}:${character.public_port}`
        : null,
    clan:
      character.clan_name === null
        ? null
        : { name: character.clan_name, rank: character.clan_rank ?? 0 },
  };
}
