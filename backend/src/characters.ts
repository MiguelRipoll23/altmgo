import { database } from './database.js';

/**
 * A character with the peer endpoint it has registered. The address is the one
 * the game server saw when the client last connected, which is the value signing
 * in at the site exists to correct.
 */
export type CharacterRow = {
  id: number;
  name: string;
  rank: number;
  experience: number;
  total_rewards: number;
  comment: string;
  last_seen_at: Date | null;
  public_ip: string | null;
  public_port: number | null;
};

/** One of those characters with the clan it belongs to, when it belongs to one. */
export type OwnedCharacterRow = CharacterRow & {
  clan_name: string | null;
  clan_rank: number | null;
};

/**
 * Lists the characters an account owns, each with the address it published.
 * A character that has never connected has no connection row, so the address is
 * absent rather than an empty string — the two are shown differently.
 *
 * A character's clan is carried on the same read rather than fetched per character:
 * the roster is a handful of rows and the join is a left join on the membership
 * they already have, so a character in no clan is one null rather than a second
 * round trip per row.
 */
export async function listCharactersForAccount(accountIdentifier: number): Promise<OwnedCharacterRow[]> {
  const rows = await database()`
    select character.id,
           character.name,
           character.rank,
           character.experience,
           character.total_rewards,
           character.comment,
           character.last_seen_at,
           connection.public_ip,
           connection.public_port,
           clan.name as clan_name,
           membership.rank as clan_rank
    from characters character
    left join character_connections connection on connection.character_id = character.id
    left join clans_members membership on membership.character_id = character.id
    left join clans clan on clan.id = membership.clan_id
    where character.account_id = ${accountIdentifier}
      and character.active
    order by character.id
  `;

  return rows as OwnedCharacterRow[];
}

/**
 * One of an account's own characters, in full.
 *
 * The account is part of the read rather than checked against the row afterwards,
 * so a character belonging to somebody else is not found at all. That is the whole
 * difference between a page that shows a reader their own character and a page
 * that shows a reader whatever identifier they happen to type.
 */
export async function findCharacterForAccount(
  accountIdentifier: number,
  characterIdentifier: number,
): Promise<OwnedCharacterRow | undefined> {
  const rows = await database()`
    select character.id,
           character.name,
           character.rank,
           character.experience,
           character.total_rewards,
           character.comment,
           character.last_seen_at,
           connection.public_ip,
           connection.public_port,
           clan.name as clan_name,
           membership.rank as clan_rank
    from characters character
    left join character_connections connection on connection.character_id = character.id
    left join clans_members membership on membership.character_id = character.id
    left join clans clan on clan.id = membership.clan_id
    where character.account_id = ${accountIdentifier}
      and character.active
      and character.id = ${characterIdentifier}
  `;

  return rows[0] as OwnedCharacterRow | undefined;
}
