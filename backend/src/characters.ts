import { database } from './database';

/**
 * A character with the peer endpoint it has registered. The address is the one
 * the game server saw when the client last connected, which is the value a host
 * link exists to correct.
 */
export type CharacterRow = {
  id: number;
  name: string;
  rank: number;
  experience: number;
  public_ip: string | null;
  public_port: number | null;
};

/**
 * Lists the characters an account owns, each with the address it published.
 * A character that has never connected has no connection row, so the address is
 * absent rather than an empty string — the two are shown differently.
 */
export async function listCharactersForAccount(accountIdentifier: number): Promise<CharacterRow[]> {
  const rows = await database()`
    select character.id,
           character.name,
           character.rank,
           character.experience,
           connection.public_ip,
           connection.public_port
    from characters character
    left join character_connections connection on connection.character_id = character.id
    where character.account_id = ${accountIdentifier}
      and character.active
    order by character.id
  `;

  return rows as CharacterRow[];
}
