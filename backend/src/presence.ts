import { database } from './database.js';

/**
 * How long a presence row is trusted. A row is a live connection rather than
 * durable state, and a client that vanishes without disconnecting leaves one
 * behind — so a reader has to decide when a row has gone stale, and the daily
 * sweep that deletes them uses the same window.
 *
 * This is the same window the game server's own presence service uses, copied
 * here so the two agree about who is connected. If they ever disagree the
 * dashboard is the one that would look wrong, which is why the value is stated
 * in both places rather than only here.
 */
const PresenceFreshSeconds = 60;

/** One lobby with what is connected to it right now. */
export type LobbyPresenceRow = {
  id: number;
  name: string;
  type: number;
  subtype: number;
  address: string;
  port: number;
  players: number;
};

/** One connected player and the lobby they are in. */
export type ConnectedCharacterRow = {
  id: number;
  name: string;
  lobby_id: number;
  lobby_name: string;
  last_seen: Date;
};

/** The count every reader of the overview leads with. */
export type PresenceTotalsRow = {
  players: number;
  lobbies: number;
};

/**
 * How many characters are connected, and how many lobbies have somebody on
 * them. The two are counted separately on purpose: a lobby with nobody on it
 * is a lobby that is up, and the difference between the two figures is the
 * number of empty ones, which is what an operator reading the overview wants to
 * know before anything else.
 */
export async function readPresenceTotals(): Promise<PresenceTotalsRow> {
  const rows = await database()`
    select
      count(distinct presence.character_id)::int as players,
      count(distinct presence.lobby_id)::int as lobbies
    from character_presence presence
    where presence.last_seen >= now() - ${PresenceFreshSeconds} * interval '1 second'
  `;

  return rows[0] as PresenceTotalsRow;
}

/**
 * Every lobby with a count of what is connected to it, including the lobbies
 * that currently hold nobody: a lobby that is up and empty is a fact the
 * overview should show rather than hide by omission.
 */
export async function listLobbyPresence(): Promise<LobbyPresenceRow[]> {
  const rows = await database()`
    select
      lobby.id,
      lobby.name,
      lobby.type,
      lobby.subtype_id,
      lobby.ip_address as address,
      lobby.port,
      (
        select count(*)::int
        from character_presence presence
        where presence.lobby_id = lobby.id
          and presence.last_seen >= now() - ${PresenceFreshSeconds} * interval '1 second'
      ) as players
    from lobbies lobby
    where lobby.updated_at >= now() - interval '2 hours'
    order by players desc, lobby.name
  `;

  return rows as LobbyPresenceRow[];
}

/** Everyone currently connected, with the lobby each of them is in. */
export async function listConnectedCharacters(): Promise<ConnectedCharacterRow[]> {
  const rows = await database()`
    select
      character.id,
      character.name,
      presence.lobby_id,
      lobby.name as lobby_name,
      presence.last_seen
    from character_presence presence
    join characters character on character.id = presence.character_id
    join lobbies lobby on lobby.id = presence.lobby_id
    where presence.last_seen >= now() - ${PresenceFreshSeconds} * interval '1 second'
    order by lobby.name, character.name
  `;

  return rows as ConnectedCharacterRow[];
}
