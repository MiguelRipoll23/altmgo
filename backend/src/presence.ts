import { database } from './database.js';

/**
 * The lobby type that is a gameplay lobby.
 *
 * The `lobbies` table holds three kinds of row — the gate, the account server
 * and the gameplay lobbies — and only the last of them is a place players are
 * on. Listing all three put a row on the overview for a service nobody is
 * playing on, and two of those rows are permanent: they would never leave the
 * list however long the deployment has been up.
 */
const GameLobbyType = 2;

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

/**
 * One lobby with what is connected to it right now.
 *
 * The four restriction flags are carried rather than summarised into a count:
 * a moderator reading a lobby is deciding whether a player can join it, and
 * "beginners only, expansion required" says something a single number of
 * restrictions would not. They are the lobby's own settings, not anything this
 * deployment infers, so the row reports them as the lobby stored them.
 */
export type LobbyPresenceRow = {
  id: number;
  name: string;
  type: number;
  subtype: number;
  address: string;
  port: number;
  players: number;
  beginnersOnly: boolean;
  expansionRequired: boolean;
  noHeadshots: boolean;
  replaysOnly: boolean;
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
    join lobbies lobby on lobby.id = presence.lobby_id
    where presence.last_seen >= now() - ${PresenceFreshSeconds} * interval '1 second'
      and lobby.type_id = ${GameLobbyType}
  `;

  return rows[0] as PresenceTotalsRow;
}

/**
 * Every gameplay lobby with a count of what is connected to it, including the
 * lobbies that currently hold nobody: a lobby that is up and empty is a fact
 * the overview should show rather than hide by omission.
 */
export async function listLobbyPresence(): Promise<LobbyPresenceRow[]> {
  const rows = await database()`
    select
      lobby.id,
      lobby.name,
      lobby.type_id as type,
      lobby.subtype_id as subtype,
      lobby.ip_address as address,
      lobby.port,
      lobby.begginers_only as beginnersOnly,
      lobby.expansion_required as expansionRequired,
      lobby.no_headshots as noHeadshots,
      lobby.replays_only as replaysOnly,
      (
        select count(*)::int
        from character_presence presence
        where presence.lobby_id = lobby.id
          and presence.last_seen >= now() - ${PresenceFreshSeconds} * interval '1 second'
      ) as players
    from lobbies lobby
    where lobby.type_id = ${GameLobbyType}
      and lobby.updated_at >= now() - interval '2 hours'
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
      and lobby.type_id = ${GameLobbyType}
    order by lobby.name, character.name
  `;

  return rows as ConnectedCharacterRow[];
}
