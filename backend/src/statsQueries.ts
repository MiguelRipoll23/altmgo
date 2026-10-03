import { database } from './database.js';

/**
 * The two figures the overview carries as a line rather than as cards.
 *
 * They are the counts that describe the server itself rather than the moment:
 * how many characters are connected, and how many games have been hosted on it
 * ever. The page that shows them is a page about what is happening now, and these
 * are the two numbers about the size of the thing doing it.
 *
 * They are read from the rows rather than from totals the server keeps, because a
 * kept total is right until the process that kept it stops, and a dashboard that
 * disagrees with the game about how many players there are is worse than one that
 * is slow to answer.
 *
 * The connected count is over `character_presence` and not over games or lobbies,
 * because a player is on the server whether or not anybody has opened a room for
 * them. A player who is connected and idle is still a player, and counting only
 * the ones inside a room would report a busy lobby as a nearly empty server.
 *
 * The freshness window is the game server's own presence window, two client ping
 * beats, rather than something wider. A presence row is a live connection and not
 * durable state: a client that vanishes without disconnecting leaves one behind,
 * so a reader has to decide when a row has gone stale, and a wider window than
 * the server's own would count players who left while the server had already
 * stopped counting them.
 */
const PresenceFreshSeconds = 60;

/** How many players are connected now, and how many games have ever been hosted. */
export type ServerFigures = {
  /** Characters with a presence row inside the freshness window. */
  connectedPlayers: number;
  /** Every game row the server has written, whether the room is up or not. */
  totalGames: number;
};

/**
 * Reads both figures in one query.
 *
 * One query rather than two because they appear on the same line of the same page,
 * and two round trips to Postgres for two counts is one round trip of waiting that
 * the reader can see as the figures arriving a moment apart from each other.
 */
export async function readServerFigures(): Promise<ServerFigures> {
  const rows = await database()`
    select
      (
        select count(distinct presence.character_id)::int
        from character_presence presence
        where presence.last_seen >= now() - ${PresenceFreshSeconds} * interval '1 second'
      ) as connected_players,
      (select count(*)::int from games game) as total_games
  `;

  const row = rows[0] as { connected_players: number; total_games: number };

  return {
    connectedPlayers: row.connected_players,
    totalGames: row.total_games,
  };
}