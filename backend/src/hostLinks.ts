import { database } from './database';
import { buildHostLinkCode } from './hostLinkCode';

/** A character that is hosting a game right now. */
export type HostCandidate = {
  id: number;
  name: string;
};

/** What a code turned out to name. */
export type HostLinkResolution =
  | { readonly kind: 'resolved'; readonly character: HostCandidate }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'ambiguous' };

/**
 * Characters hosting a game that is still published.
 *
 * The window is the game server's own staleness rule: a room stops being listed
 * an hour after its host last wrote to it. Resolving against this set rather
 * than against every character is the whole reason four digits are enough — a
 * handful of concurrent hosts is a handful of codes, where the whole character
 * table would collide constantly and a code would stop naming one character.
 */
export async function listCurrentHosts(): Promise<HostCandidate[]> {
  const rows = await database()`
    select room.host_id as id, character.name
    from games room
    join characters character on character.id = room.host_id
    where room.updated_at > now() - interval '1 hour'
  `;

  return rows as HostCandidate[];
}

/**
 * Folds a code back to the character it was issued for by recomputing it. Two
 * matches is a refusal rather than a guess: a code is a public address write,
 * and picking one of two characters is worse than asking the host to try again
 * once the other room is gone.
 */
export async function resolveHostLink(secret: string, code: string): Promise<HostLinkResolution> {
  const hosts = await listCurrentHosts();
  const matches = hosts.filter((host) => buildHostLinkCode(secret, host.name) === code);

  if (matches.length === 0) {
    return { kind: 'unknown' };
  }

  if (matches.length > 1) {
    return { kind: 'ambiguous' };
  }

  return { kind: 'resolved', character: matches[0] as HostCandidate };
}

/**
 * Writes the address the game is reachable at from outside the tailnet. Only the
 * address is corrected: the port the client listens on is already right, because
 * the client reports that itself and only the address it was seen at was wrong.
 */
export async function recordPublicAddress(
  characterIdentifier: number,
  address: string,
): Promise<boolean> {
  const rows = await database()`
    update character_connections
    set public_ip = ${address}, updated_at = now()
    where character_id = ${characterIdentifier}
    returning character_id
  `;

  return rows.length > 0;
}
