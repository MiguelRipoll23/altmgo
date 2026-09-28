import { database } from './database.js';

/**
 * The boards the dashboard can show. They are the same five the in-game
 * Rankings screens read, derived from the same stored data by the same rules —
 * there is no ranking table in this schema, so every board is a projection and
 * has to be queried as one.
 *
 * A board is named rather than numbered here because nothing on this side has to
 * agree with the client's `skey` values: the dashboard is not the client, and
 * sending a browser a "sort key" it has to decode would only move the mapping
 * somewhere less readable.
 */
export const PlayerBoards = {
  /** Score in one game mode, which the caller names. */
  score: 'Score in a game mode',
  /** Time played, lifetime or this month. */
  activeness: 'Time played',
  /** Grade points, which is accumulated experience. */
  gradePoint: 'Grade points',
  /** Average star rating a character received as a host. */
  hostRating: 'Host rating',
  /** Average star rating a character's students gave them. */
  instructorRating: 'Instructor rating',
} as const;

/** A player board the dashboard can show. */
export type PlayerBoard = keyof typeof PlayerBoards;

/** Whether a name is one of the player boards. */
export function isPlayerBoard(name: string): name is PlayerBoard {
  return Object.hasOwn(PlayerBoards, name);
}

/** One unranked row of a board, as the board query produces it. */
type BoardRow = { identifier: number; name: string; value: number };

/** One row of a board, once it has been given its position. */
export type RankingRow = BoardRow & { rank: number };

/**
 * Ratings are carried as 8.8 fixed point, matching the gauge the client draws
 * them on. A dashboard that showed the raw average instead would print a host
 * rating of 4.6 as `1178`, which is what the column holds and not what it means.
 */
const FixedPointScale = 256;

/** Highest game mode a board can be asked for, matching the client's own limit. */
const MaximumGameMode = 10;

/** A window of one board. */
export type RankingPage = {
  entries: RankingRow[];
  total: number;
};

/**
 * Runs a board query and types its rows.
 *
 * The driver answers `Record<string, any>[]`, which describes no shape at all and
 * so would let a renamed column arrive as a silently `undefined` value. Naming
 * the row type once, here, is what keeps every board honest without repeating a
 * cast down each query.
 */
async function readRows(rows: Promise<Record<string, unknown>[]>): Promise<BoardRow[]> {
  return (await rows) as unknown as BoardRow[];
}

/**
 * Ranks a board and cuts a window out of it.
 *
 * The rank is assigned over the whole board rather than inside the window, so
 * the first row of page three carries the position it actually holds. Ties break
 * on the identifier, which is what makes paging stable: two characters with the
 * same score must not swap places between two requests for two pages of the
 * same board.
 */
function buildPage(rows: BoardRow[], from: number, limit: number): RankingPage {
  const ranked = [...rows]
    .sort((left, right) => right.value - left.value || left.identifier - right.identifier)
    .map((row, index) => ({ rank: index + 1, ...row }));

  return { entries: ranked.slice(from, from + limit), total: ranked.length };
}

/** Reads one player board as a window of it. */
export async function readPlayerBoard(
  board: PlayerBoard,
  mode: number,
  currentMonth: boolean,
  from: number,
  limit: number,
): Promise<RankingPage> {
  if (board === 'score' && (mode < 0 || mode > MaximumGameMode)) {
    // A mode with no statistics would otherwise be answered from the deathmatch
    // column, which would mislabel one board as another.
    return { entries: [], total: 0 };
  }

  return buildPage(await readPlayerRows(board, mode, currentMonth), from, limit);
}

/** Reads the whole player board, before it is ranked or windowed. */
function readPlayerRows(
  board: PlayerBoard,
  mode: number,
  currentMonth: boolean,
): Promise<BoardRow[]> {
  if (board === 'score') {
    return readRows(database()`
      select character.id as identifier, character.name, sum(report.score)::bigint as value
      from round_reports report
      join characters character on character.id = report.target_character_id
      where report.rule = ${mode} and character.active
      group by character.id, character.name
    `);
  }

  if (board === 'gradePoint') {
    return readRows(database()`
      select character.id as identifier, character.name, character.experience::bigint as value
      from characters character
      where character.active
    `);
  }

  if (board === 'activeness') {
    return currentMonth
      ? readRows(database()`
          select character.id as identifier, character.name, sum(report.seconds)::bigint as value
          from round_reports report
          join characters character on character.id = report.target_character_id
          where report.created_at >= date_trunc('month', now()) and character.active
          group by character.id, character.name
        `)
      : readRows(database()`
          select character.id as identifier, character.name, sum(report.seconds)::bigint as value
          from round_reports report
          join characters character on character.id = report.target_character_id
          where character.active
          group by character.id, character.name
        `);
  }

  return board === 'hostRating' ? readHostRatingRows(currentMonth) : readInstructorRatingRows(currentMonth);
}

/**
 * A star-rating board, which is the average of the reviews rather than a sum: a
 * character with one five-star review and a character with fifty are not the
 * same host, and adding their ratings together would say they were.
 *
 * The two boards are the same query over a different table, but they are
 * written out rather than parameterised over a table name: a table name cannot
 * be a bind parameter, so the alternative is splicing one into the query text,
 * and a fixed pair of written-out queries has nothing to splice.
 */
function readHostRatingRows(currentMonth: boolean): Promise<BoardRow[]> {
  return readRows(database()`
    select
      character.id as identifier,
      character.name,
      round(avg(review.rating) * ${FixedPointScale})::bigint as value
    from host_reviews review
    join characters character on character.id = review.host_character_id
    where character.active
      and (not ${currentMonth} or review.reviewed_at >= date_trunc('month', now()))
    group by character.id, character.name
  `);
}

/** Instructor rating, the average of the reviews a character's students left. */
function readInstructorRatingRows(currentMonth: boolean): Promise<BoardRow[]> {
  return readRows(database()`
    select
      character.id as identifier,
      character.name,
      round(avg(review.rating) * ${FixedPointScale})::bigint as value
    from instructor_reviews review
    join characters character on character.id = review.instructor_character_id
    where character.active
      and (not ${currentMonth} or review.reviewed_at >= date_trunc('month', now()))
    group by character.id, character.name
  `);
}

/** The clan boards the dashboard can show. */
export const ClanBoards = {
  /** Combined score of the clan's members. */
  score: 'Clan score',
  /** Time its members played. */
  activeness: 'Time played',
  /** Grade points of its members. */
  gradePoint: 'Grade points',
} as const;

/** A clan board the dashboard can show. */
export type ClanBoard = keyof typeof ClanBoards;

/** Whether a name is one of the clan boards. */
export function isClanBoard(name: string): name is ClanBoard {
  return Object.hasOwn(ClanBoards, name);
}

/** Reads one clan board as a window of it. */
export async function readClanBoard(
  board: ClanBoard,
  currentMonth: boolean,
  from: number,
  limit: number,
): Promise<RankingPage> {
  return buildPage(await readClanRows(board, currentMonth), from, limit);
}

/** Reads the whole clan board, before it is ranked or windowed. */
function readClanRows(board: ClanBoard, currentMonth: boolean): Promise<BoardRow[]> {
  if (board === 'gradePoint') {
    return readRows(database()`
      select clan.id as identifier, clan.name, sum(character.experience)::bigint as value
      from clans clan
      join clans_members member on member.clan_id = clan.id
      join characters character on character.id = member.character_id
      where character.active
      group by clan.id, clan.name
    `);
  }

  if (board === 'activeness') {
    return currentMonth
      ? readRows(database()`
          select clan.id as identifier, clan.name, sum(report.seconds)::bigint as value
          from round_reports report
          join clans_members member on member.character_id = report.target_character_id
          join clans clan on clan.id = member.clan_id
          where report.created_at >= date_trunc('month', now())
          group by clan.id, clan.name
        `)
      : readRows(database()`
          select clan.id as identifier, clan.name, sum(report.seconds)::bigint as value
          from round_reports report
          join clans_members member on member.character_id = report.target_character_id
          join clans clan on clan.id = member.clan_id
          group by clan.id, clan.name
        `);
  }

  return readRows(database()`
    select clan.id as identifier, clan.name, sum(report.score)::bigint as value
    from round_reports report
    join clans_members member on member.character_id = report.target_character_id
    join clans clan on clan.id = member.clan_id
    group by clan.id, clan.name
  `);
}
