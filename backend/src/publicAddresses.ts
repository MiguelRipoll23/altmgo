import { database } from './database.js';

/** A character that has registered a peer endpoint. */
export type ConnectedCharacter = {
  id: number;
  name: string;
};

/**
 * The account's characters that have a connection row, which is the whole
 * condition for being published to.
 *
 * The connection table is the only thing consulted. A row there means the game
 * server has seen the client and written the address it saw, so there is a value
 * to correct; without one there is no endpoint anyone will read, and an address
 * written into nowhere is worse than none. Whether a room exists is not part of
 * the question — the row outlives the room, and a game started after signing in
 * is a reason to press the button, not a reason to have refused.
 */
export async function listConnectedCharactersOfAccount(
  accountIdentifier: number,
): Promise<ConnectedCharacter[]> {
  const rows = await database()`
    select character.id, character.name
    from characters character
    join character_connections connection on connection.character_id = character.id
    where character.account_id = ${accountIdentifier}
      and character.active
    order by character.id
  `;

  return rows as ConnectedCharacter[];
}

/**
 * Writes the address the game is reachable at from outside the tailnet. Only the
 * address is corrected: the port the client listens on is already right, because
 * the client reports that itself and only the address it was seen at was wrong.
 *
 * Answers whether the row was there *and* held something else, which is what makes
 * the answer worth having. Publishing is done on arrival rather than on request,
 * so it runs again on every visit; a caller that was told "corrected" for a row
 * that already held this address would be telling a player their game became
 * joinable when it already was, and the page would show it as a thing that had
 * just happened every single time they opened the dashboard.
 */
export async function publishAddress(
  characterIdentifier: number,
  address: string,
): Promise<boolean> {
  const rows = await database()`
    update character_connections
    set public_ip = ${address}, updated_at = now()
    where character_id = ${characterIdentifier}
      and public_ip is distinct from ${address}
    returning character_id
  `;

  return rows.length > 0;
}

/**
 * What one publish found, so the caller can tell the two apart.
 *
 * `connections` is how many of the account's characters have a row to write to at
 * all, and `published` is how many of those were holding a different address.
 * They are the same number on a first visit and never the same number again, and
 * the difference is the whole reason this is an object rather than a boolean: a
 * page that says "your game is discoverable" is making a claim about the account
 * having somewhere to be reached, not about a write having happened.
 */
export type PublishOutcome = {
  /** The characters that have a connection row, and so something to publish to. */
  connections: number;
  /** How many of those were holding an address other than this one. */
  published: { id: number; name: string }[];
};

/**
 * Publishes the address for every character of an account that has one to publish
 * to, and reports what it found.
 *
 * An account with no connection row is not an error and not a refusal: there is
 * no endpoint anybody would read, so there is nothing to write. It is the answer
 * "this account is not discoverable", which the sign-in reports rather than
 * turning into a failure the player did nothing to cause.
 */
export async function publishAccountAddress(
  accountIdentifier: number,
  address: string,
): Promise<PublishOutcome> {
  const connected = await listConnectedCharactersOfAccount(accountIdentifier);
  const published: { id: number; name: string }[] = [];

  for (const character of connected) {
    if (await publishAddress(character.id, address)) {
      published.push({ id: character.id, name: character.name });
    }
  }

  return { connections: connected.length, published };
}

/** The address one of the account's characters publishes, as the overview shows it. */
export type PublishedAddress = {
  characterId: number;
  characterName: string;
  /** The address on its own. The port is a property of the client's listener, not of where the player is. */
  publicIp: string;
  /** The port the client reported it is listening on. */
  publicPort: number;
};

/**
 * The address the account's most recently active character publishes.
 *
 * One figure rather than one per character, because the answer to "is my game
 * joinable from outside" is a single address: the connection row is written for
 * every character the account has, so the last one to have been active is the
 * one a player is currently playing, and that is the row anybody will read.
 *
 * The most recent activity is the character's own `last_seen_at` rather than the
 * connection row's `updated_at`: the connection row is written when a game
 * starts, so a character that played yesterday and is idle today would otherwise
 * be passed over for one that merely opened a lobby more recently.
 *
 * The address and the port are returned apart rather than joined into one string.
 * The port is fixed by the client's own listener and is the same for every host
 * on a deployment, so printing it beside every address says nothing and makes the
 * address itself harder to read off the page; a reader who needs the whole
 * endpoint is joining a number this table already holds.
 */
export async function readAccountPublicAddress(
  accountIdentifier: number,
): Promise<PublishedAddress | undefined> {
  const rows = await database()`
    select
      character.id as character_id,
      character.name as character_name,
      connection.public_ip,
      connection.public_port
    from characters character
    join character_connections connection on connection.character_id = character.id
    where character.account_id = ${accountIdentifier}
      and character.active
    order by character.last_seen_at desc nulls last, character.id desc
    limit 1
  `;

  const row = rows[0] as
    | { character_id: number; character_name: string; public_ip: string; public_port: number }
    | undefined;

  if (!row) {
    return undefined;
  }

  return {
    characterId: row.character_id,
    characterName: row.character_name,
    publicIp: row.public_ip,
    publicPort: row.public_port,
  };
}
