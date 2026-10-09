import { database } from './database.js';
import { GameStaleSeconds } from './dashboardQueries.js';

/**
 * The two figures the overview carries as a line rather than as cards.
 *
 * They are the two counts that answer whether the server is being used: how many
 * characters are connected, and how many games are up. Both are read over a live
 * window rather than from a total that only grows, because the question is about
 * now — a figure counting every room ever opened says nothing about whether
 * anybody is playing tonight.
 *
 * The games count reads the game server's own staleness window, the same one the
 * games list reads, so a room whose host stopped answering drops off the list and
 * out of the count together. The number above the cards is then the number of
 * cards, which is the whole of what makes it worth showing.
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

/** How many players are connected now, and how many games are up now. */
export type ServerFigures = {
  /** Characters with a presence row inside the freshness window. */
  connectedPlayers: number;
  /** Games whose last heartbeat is inside the staleness window, the ones still up. */
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
      (
        select count(*)::int
        from games game
        where game.updated_at >= now() - ${GameStaleSeconds} * interval '1 second'
      ) as total_games
  `;

  const row = rows[0] as { connected_players: number; total_games: number };

  return {
    connectedPlayers: row.connected_players,
    totalGames: row.total_games,
  };
}