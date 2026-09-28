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
 * a reader deciding whether they can join a lobby is told "beginners only,
 * expansion required", which says something a number of restrictions would not.
 * They are the lobby's own settings, not anything this deployment infers, so the
 * row reports them as the lobby stored them.
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

/** The count every reader of the overview leads with. */
export type PresenceTotalsRow = {
  players: number;
  lobbies: number;
};

/**
 * How many players the server has ever had, as opposed to how many are on it now.
 *
 * The ever figure is the count of active characters rather than of accounts: a
 * player is a character, and an account is a login that may hold three of them.
 * Inactive characters are excluded because a deleted character is not a player
 * anybody can be missing, and leaving them in would make the number only ever
 * grow.
 *
 * The games figure counts every row the game server has written rather than the
 * rooms that are up, because "total games" is a figure about the server's whole
 * life and the live rooms are already on the overview as a list. A game row is
 * written when a room is created, so the two would agree at this moment and
 * diverge the moment a room closes.
 */
export type ServerTotalsRow = {
  players: number;
  games: number;
};

/** How many players the server has, and how many games have been hosted on it. */
export async function readServerTotals(): Promise<ServerTotalsRow> {
  const rows = await database()`
    select
      (select count(*)::int from characters character where character.active) as players,
      (select count(*)::int from games game) as games
  `;

  return rows[0] as ServerTotalsRow;
}

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
 *
 * The four restriction flags are quoted, and they are the only camelCase aliases
 * in this repository, because an unquoted identifier is folded to lower case by
 * Postgres. Written unquoted, "as beginnersOnly" names a column "beginnersonly",
 * the driver builds its row with that key, and the row cast to a
 * LobbyPresenceRow arrives holding four undefineds that no assertion can catch:
 * the query succeeds, the route sends "restrictions": {}, and every lobby reports
 * no restrictions. That is not a rare edge — Basic Training sets beginners_only
 * and Replays sets replays_only on a stock deployment, so two of the nine lobbies
 * on the overview were lying about themselves for as long as this was unquoted.
 *
 * Everything else this file aliases is snake_case or a single lower-case word,
 * which is what folding to lower case does not change.
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
      lobby.begginers_only as "beginnersOnly",
      lobby.expansion_required as "expansionRequired",
      lobby.no_headshots as "noHeadshots",
      lobby.replays_only as "replaysOnly",
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
