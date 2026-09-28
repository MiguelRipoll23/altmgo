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
 * Answers whether a row was there to correct, which is false for a character that
 * has never registered a peer endpoint.
 */
export async function publishAddress(
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
