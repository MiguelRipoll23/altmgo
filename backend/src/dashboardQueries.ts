import { database, raw } from './database.js';

/** Lobby selector of Survival, as the event subsystem numbers them. */
export const SurvivalMode = 4;

/** Lobby selector of Tournament. */
export const TournamentMode = 3;

/** Lobby selector of the Tournament registration screen. */
export const TournamentRegistrationMode = 10;

/** The three lobby modes an event can be played in. */
export const EventModes = [SurvivalMode, TournamentMode, TournamentRegistrationMode] as const;

/** A mode a dashboard section can be about. */
export type EventMode = (typeof EventModes)[number];

/** Whether a lobby mode is one an event can be played in. */
export function isEventMode(mode: number): mode is EventMode {
  return (EventModes as readonly number[]).includes(mode);
}

/** One game room with what is known about it. */
export type GameSummaryRow = {
  id: number;
  name: string;
  comment: string;
  host_name: string | null;
  lobby_name: string | null;
  players: number;
  /** The room's own `max_players`, aliased so the shape stays readable. */
  maximum_players: number;
  current_game: number;
  status: number;
  has_password: boolean;
  updated_at: Date;
};

/**
 * Lists the game rooms that are still current. A room is a live thing: a host
 * that closes its game stops writing, and a room left behind would otherwise sit
 * on the page for ever looking like somebody could join it.
 *
 * The window is the game server's own `GameStaleSeconds`, which is two client
 * ping beats rather than something wider. It has to be that narrow for the same
 * reason it is there: the list is what somebody joins from, so a room that is
 * still shown is a room that can be joined, and a window any wider lists hosts
 * that stopped answering.
 */
const GameStaleSeconds = 60;

/** Lists the game rooms that are still current. */
export async function listGames(): Promise<GameSummaryRow[]> {
  const rows = await database()`
    select
      game.id,
      game.name,
      game.comment,
      host.name as host_name,
      lobby.name as lobby_name,
      (
        select count(*)::int
        from game_players player
        where player.game_id = game.id
      ) as players,
      game.max_players as maximum_players,
      game.current_game,
      game.status,
      (game.password <> '') as has_password,
      game.updated_at
    from games game
    left join characters host on host.id = game.host_id
    left join lobbies lobby on lobby.id = game.lobby_id
    where game.updated_at >= now() - ${GameStaleSeconds} * interval '1 second'
    order by game.updated_at desc
  `;

  return rows as GameSummaryRow[];
}

/** One event team with the roster it holds. */
export type EventTeamRow = {
  id: number;
  name: string;
  comment: string;
  state: number;
  match_type: number;
  lobby_name: string | null;
  consecutive_wins: number;
  paid_reward: number;
  created_at: Date;
  members: { slot: number; character_id: number; name: string; state: number }[];
};

/** Reads the teams of one event mode, newest first. */
export async function listEventTeams(mode: EventMode): Promise<EventTeamRow[]> {
  const rows = await database()`
    select
      team.id,
      team.name,
      team.comment,
      team.state,
      team.match_type,
      lobby.name as lobby_name,
      team.consecutive_wins,
      team.paid_reward,
      team.created_at,
      coalesce(
        (
          select json_agg(
            json_build_object(
              'slot', member.slot,
              'character_id', member.character_id,
              'name', member.name,
              'state', member.state
            ) order by member.slot
          )
          from event_team_members member
          where member.team_id = team.id
        ),
        '[]'::json
      ) as members
    from event_teams team
    left join lobbies lobby on lobby.id = team.lobby_id
    where team.match_type = ${mode}
    order by team.created_at desc
  `;

  return rows as EventTeamRow[];
}

/** One event schedule, which is what makes an event enterable. */
export type EventScheduleRow = {
  id: number;
  name: string;
  lobby_subtype: number;
  enabled: boolean;
  publish_start: number;
  publish_end: number;
  team_capacity: number;
};

/** Reads the schedules of one event mode, which is the list its screen shows. */
export async function listEventSchedules(mode: EventMode): Promise<EventScheduleRow[]> {
  const rows = await database()`
    select id, name, lobby_subtype, enabled, publish_start, publish_end, team_capacity
    from event_schedules
    where lobby_subtype = ${mode}
    order by id
  `;

  return rows as EventScheduleRow[];
}

/** One registered Tournament place. */
export type TournamentEntryRow = {
  event_id: number;
  character_id: number;
  character_name: string;
  team_id: number | null;
  /** The name of the team the place belongs to, or nothing when it is unassigned. */
  team_name: string | null;
  slot_index: number;
  reserved_at: Date;
};

/**
 * Reads the places taken in one Tournament event, in the order they were taken.
 *
 * The team is joined for its name rather than left as the id the column holds: a
 * registration list is read by people who are looking for their own character and
 * the team it is in, and a number is neither of those things.
 */
export async function listTournamentEntries(eventIdentifier: number): Promise<TournamentEntryRow[]> {
  const rows = await database()`
    select
      registration.event_id,
      registration.character_id,
      character.name as character_name,
      registration.team_id,
      team.name as team_name,
      registration.slot_index,
      registration.reserved_at
    from tournament_registrations registration
    join characters character on character.id = registration.character_id
    left join event_teams team on team.id = registration.team_id
    where registration.event_id = ${eventIdentifier}
    order by registration.reserved_at, registration.character_id
  `;

  return rows as TournamentEntryRow[];
}

/** One played Tournament fixture. */
export type TournamentFixtureRow = {
  id: number;
  event_id: number;
  match_id: number;
  round_index: number;
  first_team_id: number;
  second_team_id: number;
  winner_team_id: number;
  first_team_name: string | null;
  second_team_name: string | null;
  reported_at: Date;
};

/** Reads the fixtures played in one Tournament event, round by round. */
export async function listTournamentFixtures(eventIdentifier: number): Promise<TournamentFixtureRow[]> {
  const rows = await database()`
    select
      result.id,
      result.event_id,
      result.match_id,
      result.round_index,
      result.first_team_id,
      result.second_team_id,
      result.winner_team_id,
      first_team.name as first_team_name,
      second_team.name as second_team_name,
      result.reported_at
    from tournament_results result
    left join event_teams first_team on first_team.id = result.first_team_id
    left join event_teams second_team on second_team.id = result.second_team_id
    where result.event_id = ${eventIdentifier}
    order by result.round_index, result.id
  `;

  return rows as TournamentFixtureRow[];
}

/** The state of one Tournament bracket. */
export type TournamentBracketRow = {
  event_id: number;
  status: number;
  current_round: number;
  champion_team_id: number | null;
  champion_team_name: string | null;
  seeds: { seed_index: number; team_id: number; team_name: string | null }[];
};

/** Reads the bracket of one Tournament event, or nothing when it has not been drawn. */
export async function findTournamentBracket(
  eventIdentifier: number,
): Promise<TournamentBracketRow | undefined> {
  const brackets = await database()`
    select
      bracket.event_id,
      bracket.status,
      bracket.current_round,
      bracket.champion_team_id,
      champion.name as champion_team_name
    from tournament_brackets bracket
    left join event_teams champion on champion.id = bracket.champion_team_id
    where bracket.event_id = ${eventIdentifier}
    limit 1
  `;

  const bracket = brackets[0] as Omit<TournamentBracketRow, 'seeds'> | undefined;
  if (!bracket) {
    return undefined;
  }

  const seeds = await database()`
    select seed.seed_index, seed.team_id, team.name as team_name
    from tournament_seeds seed
    left join event_teams team on team.id = seed.team_id
    where seed.event_id = ${eventIdentifier}
    order by seed.seed_index
  `;

  return { ...bracket, seeds: seeds as TournamentBracketRow['seeds'] };
}
