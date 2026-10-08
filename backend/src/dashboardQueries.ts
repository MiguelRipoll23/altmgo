import { database, raw } from './database.js';

/** Lobby selector of Survival, as the event subsystem numbers them. */
export const SurvivalMode = 4;

/** Lobby selector of Tournament. */
export const TournamentMode = 3;

/** Lobby selector of the Tournament registration screen. */
export const TournamentRegistrationMode = 10;

/**
 * Kind of service a lobby row describes, as the game server's own `LobbyType`
 * numbers it: the gate is 0, the account server 1 and a gameplay lobby 2.
 *
 * Only the third is a place a game can be hosted in — the other two are
 * permanent endpoints the client dials before it has a character — so the lobby
 * list is the third alone.
 */
const GameplayLobbyType = 2;

/**
 * How long a gameplay lobby's row stays on the list after its last heartbeat,
 * as the game server counts it: two heartbeats at the sixty-minute default of
 * its `LobbiesRefreshIntervalMinutes`. A deployment that beats more often (the
 * live one beats every five minutes) only makes the server's own window narrower
 * than this.
 *
 * Deliberately wider than the games window below. A game row goes stale in a
 * minute because it is what somebody joins from, and the failure there is a
 * room left on the page that nobody can join. The lobby row is read by a filter,
 * where the failure is the other way round: a window narrower than the server's
 * own would drop a lobby that is still running in the gap between two of its
 * heartbeats, and a reader could then no longer filter for a room that is right
 * there on the page. The cost of the wider window is a lobby whose server
 * stopped staying on the filter as an option matching nothing, for at most this
 * long — and the game server deletes the row itself in its daily cleanup anyway.
 */
const LobbyStaleSeconds = 2 * 60 * 60;

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
  host_id: number;
  lobby_id: number;
  name: string;
  comment: string;
  host_name: string | null;
  host_clan_id: number | null;
  host_clan_name: string | null;
  host_clan_has_emblem: boolean | null;
  lobby_name: string | null;
  /** The room's roster as it stands, which counts a dedicated host as a member. */
  members: number;
  /** The room's own `max_players`, aliased so the shape stays readable. */
  maximum_players: number;
  /**
   * Whether the room's host holds a connection without playing. Asked in SQL from
   * the room's name and the host's saved settings; the two branches are written
   * out on `listGames`.
   */
  dedicated: boolean;
  current_game: number;
  lobby_subtype: number;
  /** The room's stored rotation, as the `[rule, map, flag]` JSON the host stored. */
  games: string;
  stance: number;
  status: number;
  has_password: boolean;
  /** The ping the host's own client reported for itself. */
  ping: number;
  created_at: Date | null;
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
 *
 * The map is not a column of its own. A room stores a rotation of rounds as a
 * JSON array of `[rule, map, flag]` triples and a `current_game` index into it,
 * so the map the room is actually on is the map of the triple that index names —
 * the same pair the game server itself reads. It is parsed here rather than
 * selected, because the cast a SQL read would need raises on a rotation that is
 * not valid JSON, and one such row would take the whole list down with it. A
 * room whose rotation is empty, unparseable, or indexed past its end has no map
 * to report and reads as zero: it is still a room somebody can join, and
 * refusing to list it would hide a room that is up.
 *
 * The dedicated flag is asked in two parts, because there are two kinds of host
 * and only one of them keeps a settings row.
 *
 * The gameplay server hosts without playing, and it never opens a settings
 * screen: the room it publishes is built in `MatchService` from the host
 * *character's* name rather than from a settings push, so there is no
 * `characters_host_settings` row to ask and the room's own name is what marks
 * it. That name is `server-{port}`, hence the prefix test — spelled case-blind
 * because the name is typed rather than generated by a constant someone here
 * controls.
 *
 * Everyone else keeps one current settings row, and its `dedicated` column is the
 * client saying so directly: the Create Game row labelled "Dedicated Host
 * Settings", whose help text is "When enabled, the host can create games without
 * joining them." A host with no row at all never opened that screen, so it is a
 * host that is playing, and `coalesce` says so rather than the subquery's null
 * reading as false by accident.
 *
 * The reading is the host's *current* preference, not what the room was opened
 * as. The game server freezes a copy onto the room at creation
 * (`games.common`, read by its own `EventHostEligibilityUtils.IsDedicated`)
 * precisely because the saved row is the host's to change while the room is
 * open. So a dedicated host who unticks the box mid-session is counted as a
 * player here until they tick it again, and a player who ticks it is not counted
 * until they open the room. Both are the host's live intent, which is the thing
 * the question is about.
 */
const GameStaleSeconds = 60;

/**
 * The stored host-settings slot the client reads and writes, as the game server's
 * `HostSettingsType.Value` numbers it: the one current settings row of a
 * character. Every reader of that table filters on it, because the table is keyed
 * by character and the slot is what says which row is the live one.
 */
const HostSettingsSlot = 0;

/** Lists the game rooms that are still current. */
export async function listGames(): Promise<GameSummary[]> {
  return readGames();
}

/** One current game with the full stored rotation and live roster. */
export type GameDetails = GameSummary & {
  hostIdentifier: number;
  lobbyIdentifier: number;
  currentGame: number;
  lobbySubtype: number;
  stance: number;
  createdAt: Date | null;
  rotation: { rule: number; map: number; flag: number }[];
  hostSettings: GameHostSettings | null;
  roster: {
    characterId: number;
    name: string;
    experience: number;
    team: number;
    ping: number;
    joinedAt: Date;
    clan: { id: number; name: string; hasEmblem: boolean } | null;
  }[];
};

/** The host's named saved room settings; passwords and undocumented fields stay private. */
export type GameHostSettings = {
  stance: number;
  maximumPlayers: number;
  briefingTime: number;
  dedicated: boolean;
  nonStat: boolean;
  friendlyFire: boolean;
  autoAim: boolean;
  uniquesEnabled: boolean;
  enemyNametags: boolean;
  silentMode: boolean;
  autoAssign: boolean;
  teamsSwitch: boolean;
  ghosts: boolean;
  voiceChat: boolean;
  levelLimitEnabled: boolean;
  levelLimitBase: number;
  levelLimitTolerance: number;
  teamKillKick: number;
  idleKick: number;
  settingsLobbySubtype: number;
  rotationRules: number[] | null;
  rotationMaps: number[] | null;
  rotationFlags: number[] | null;
  weaponRestrictions: string | null;
  ruleTimers: number[] | null;
  uniqueRed: number;
  uniqueBlue: number;
  commonA: number;
  commonB: number;
  captureExtraTime: boolean;
  sneakingSnakeKills: number;
};

/** Reads one current game and the full roster stored by the game server. */
export async function findGameDetails(identifier: number): Promise<GameDetails | undefined> {
  const game = (await readGames(identifier))[0];

  if (game === undefined) {
    return undefined;
  }

  const [rows, settingsRows] = await Promise.all([
    database()`
      select
        character.id as character_id,
        character.name,
        character.experience,
        player.team,
        player.ping,
        player.joined_at,
        clan.id as clan_id,
        clan.name as clan_name,
        (clan.emblem is not null) as clan_has_emblem
      from game_players player
      join characters character on character.id = player.character_id
      left join clans_members membership on membership.character_id = character.id
      left join clans clan on clan.id = membership.clan_id
      where player.game_id = ${game.id}
      order by
        case when player.character_id = ${game.host_id} then 0 else 1 end,
        player.joined_at,
        character.id
    `,
    database()`
      select
        stance,
        max_players as maximum_players,
        briefing_time,
        dedicated,
        non_stat,
        friendly_fire,
        auto_aim,
        uniques_enabled,
        enemy_nametags,
        silent_mode,
        auto_assign,
        teams_switch,
        ghosts,
        voice_chat,
        level_limit_enabled,
        level_limit_base,
        level_limit_tolerance,
        team_kill_kick,
        idle_kick,
        settings_lobby_subtype,
        rotation_rules,
        rotation_maps,
        rotation_flags,
        encode(weapon_restrictions, 'hex') as weapon_restrictions,
        rule_timers,
        unique_red,
        unique_blue,
        common_a,
        common_b,
        capture_extra_time,
        sneaking_snake_kills
      from characters_host_settings
      where character_id = ${game.host_id}
        and type = ${HostSettingsSlot}
      limit 1
    `,
  ]);
  const savedSettings = settingsRows[0] as {
    stance: number;
    maximum_players: number;
    briefing_time: number;
    dedicated: boolean;
    non_stat: boolean;
    friendly_fire: boolean;
    auto_aim: boolean;
    uniques_enabled: boolean;
    enemy_nametags: boolean;
    silent_mode: boolean;
    auto_assign: boolean;
    teams_switch: boolean;
    ghosts: boolean;
    voice_chat: boolean;
    level_limit_enabled: boolean;
    level_limit_base: number;
    level_limit_tolerance: number;
    team_kill_kick: number;
    idle_kick: number;
    settings_lobby_subtype: number;
    rotation_rules: number[] | null;
    rotation_maps: number[] | null;
    rotation_flags: number[] | null;
    weapon_restrictions: string | null;
    rule_timers: number[] | null;
    unique_red: number;
    unique_blue: number;
    common_a: number;
    common_b: number;
    capture_extra_time: boolean;
    sneaking_snake_kills: number;
  } | undefined;

  return {
    ...game,
    hostIdentifier: game.host_id,
    lobbyIdentifier: game.lobby_id,
    currentGame: game.current_game,
    lobbySubtype: game.lobby_subtype,
    stance: game.stance,
    createdAt: game.created_at,
    rotation: parseRotation(game.games),
    hostSettings:
      savedSettings === undefined
        ? null
        : {
            stance: savedSettings.stance,
            maximumPlayers: savedSettings.maximum_players,
            briefingTime: savedSettings.briefing_time,
            dedicated: savedSettings.dedicated,
            nonStat: savedSettings.non_stat,
            friendlyFire: savedSettings.friendly_fire,
            autoAim: savedSettings.auto_aim,
            uniquesEnabled: savedSettings.uniques_enabled,
            enemyNametags: savedSettings.enemy_nametags,
            silentMode: savedSettings.silent_mode,
            autoAssign: savedSettings.auto_assign,
            teamsSwitch: savedSettings.teams_switch,
            ghosts: savedSettings.ghosts,
            voiceChat: savedSettings.voice_chat,
            levelLimitEnabled: savedSettings.level_limit_enabled,
            levelLimitBase: savedSettings.level_limit_base,
            levelLimitTolerance: savedSettings.level_limit_tolerance,
            teamKillKick: savedSettings.team_kill_kick,
            idleKick: savedSettings.idle_kick,
            settingsLobbySubtype: savedSettings.settings_lobby_subtype,
            rotationRules: savedSettings.rotation_rules,
            rotationMaps: savedSettings.rotation_maps,
            rotationFlags: savedSettings.rotation_flags,
            weaponRestrictions: savedSettings.weapon_restrictions,
            ruleTimers: savedSettings.rule_timers,
            uniqueRed: savedSettings.unique_red,
            uniqueBlue: savedSettings.unique_blue,
            commonA: savedSettings.common_a,
            commonB: savedSettings.common_b,
            captureExtraTime: savedSettings.capture_extra_time,
            sneakingSnakeKills: savedSettings.sneaking_snake_kills,
          },
    roster: (rows as {
      character_id: number;
      name: string;
      experience: number;
      team: number;
      ping: number;
      joined_at: Date;
      clan_id: number | null;
      clan_name: string | null;
      clan_has_emblem: boolean | null;
    }[]).map((player) => ({
      characterId: player.character_id,
      name: player.name,
      experience: player.experience,
      team: player.team,
      ping: player.ping,
      joinedAt: player.joined_at,
      clan:
        player.clan_id === null || player.clan_name === null
          ? null
          : {
              id: player.clan_id,
              name: player.clan_name,
              hasEmblem: player.clan_has_emblem ?? false,
            },
    })),
  };
}

/** Reads current games, or one requested room, using the server's staleness window. */
async function readGames(identifier?: number): Promise<GameSummary[]> {
  const rows = await database()`
    select
      game.id,
      game.host_id,
      game.lobby_id,
      game.name,
      game.comment,
      host.name as host_name,
      host_clan.id as host_clan_id,
      host_clan.name as host_clan_name,
      (host_clan.emblem is not null) as host_clan_has_emblem,
      lobby.name as lobby_name,
      (
        select count(*)::int
        from game_players player
        where player.game_id = game.id
      ) as members,
      game.max_players as maximum_players,
      (
        case
          when lower(game.name) like 'server%' then true
          else coalesce(
            (
              select settings.dedicated
              from characters_host_settings settings
              where settings.character_id = game.host_id
                and settings.type = ${HostSettingsSlot}
              limit 1
            ),
            false
          )
        end
      ) as dedicated,
      game.current_game,
      game.lobby_subtype,
      game.games,
      game.stance,
      game.status,
      (game.password <> '') as has_password,
      game.ping,
      game.created_at,
      game.updated_at
    from games game
    left join characters host on host.id = game.host_id
    left join clans_members host_membership on host_membership.character_id = host.id
    left join clans host_clan on host_clan.id = host_membership.clan_id
    left join lobbies lobby on lobby.id = game.lobby_id
    where game.updated_at >= now() - ${GameStaleSeconds} * interval '1 second'
      and (${identifier === undefined} or game.id = ${identifier ?? 0})
    order by game.updated_at desc
  `;

  return (rows as GameSummaryRow[]).map((game) => ({
    ...game,
    players: playingCount(game),
    map: roomMap(game),
    rule: roomRule(game),
  }));
}

/** One room as the list reports it, which is the row plus what it is playing. */
export type GameSummary = GameSummaryRow & { players: number; map: number; rule: number };

/** Reads the room's whole `[rule, map, flag]` rotation without trusting stored JSON. */
function parseRotation(games: string): { rule: number; map: number; flag: number }[] {
  try {
    const parsed: unknown = JSON.parse(games);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((value) => {
      const round = Array.isArray(value) ? value : [];

      return {
        rule: roundEntry(round, 0),
        map: roundEntry(round, 1),
        flag: roundEntry(round, 2),
      };
    });
  } catch {
    return [];
  }
}

/**
 * How many characters are playing in a room.
 *
 * The roster counts the host, because the host is a member of the room: the game
 * puts them there when the room is created, and the room list shows them. A
 * dedicated host is the exception — it hosts a game it never joins, so it holds a
 * connection without holding a playing slot. The client's own Create Game screen
 * draws it the same way, drawing the maximum one lower while the flag is set
 * (`subf r0,r0,r5` at `0x8A51A8`, documented on `0x4313`'s `dedicated` field),
 * because the host's own slot is the one the flag takes away. Counting it as a
 * player is a room that reads "1 of 8 playing" when nobody is playing.
 *
 * Whether the host is one is asked in SQL rather than here, because answering it
 * needs the host's saved settings — a second table, reached by the host — and
 * that belongs in the same read as the roster it adjusts rather than in a second
 * query per room. The two branches it asks are written out on `listGames`.
 *
 * A host the roster does not hold subtracts nothing: there is no member to take
 * out, and a count below zero would say less than the roster the game itself
 * reports.
 */
function playingCount(game: GameSummaryRow): number {
  return game.dedicated ? Math.max(0, game.members - 1) : game.members;
}

/**
 * The triple a room's current round names, or null when it names none.
 *
 * A port of the game server's own `ResolveGameMode`, in `RoundStatisticsHandlers`:
 * the rotation is a list of `[rule, map, flag]` triples and `current_game` is an
 * index into it. Null rather than a throw for every way the pair can fail,
 * because a room the dashboard cannot read its round out of is a room that is
 * still being hosted and still worth listing.
 *
 * The two readers below share it because they read the same triple, and two
 * copies of the same four checks is four checks that can drift into disagreeing
 * about whether a room has a readable round.
 */
function currentRound(game: GameSummaryRow): unknown[] | null {
  try {
    const rounds: unknown = JSON.parse(game.games);

    if (!Array.isArray(rounds) || game.current_game < 0 || game.current_game >= rounds.length) {
      return null;
    }

    const entry: unknown = rounds[game.current_game];

    return Array.isArray(entry) ? entry : null;
  } catch {
    // A rotation that is not JSON is a room whose round this page cannot read. It
    // is not a reason to fail the list the room belongs to.
    return null;
  }
}

/** Reads one integer out of the current round's triple, or zero for anything else. */
function roundEntry(round: unknown[] | null, index: number): number {
  const entry: unknown = round?.[index];

  return typeof entry === 'number' && Number.isInteger(entry) ? entry : 0;
}

/** The map a room is on, which is the second entry of its current round. */
function roomMap(game: GameSummaryRow): number {
  return roundEntry(currentRound(game), 1);
}

/**
 * The rule a room is playing, which is the first entry of its current round.
 *
 * This was not sent before, and the field that carried it in its place was
 * `current_game` — the *index* of the round in the rotation, not the rule. A
 * room on its first round therefore reported itself as Deathmatch whatever it
 * was actually playing, which is why the index and the rule are kept apart here.
 *
 * Zero is both a real rule and the fallback for an unreadable one, exactly as it
 * is for the map. The rotation stores the rule as a plain byte with no sentinel,
 * so the stored data cannot tell "Deathmatch" from "no rule named" and the
 * commoner reading is the one to fall back on.
 */
function roomRule(game: GameSummaryRow): number {
  return roundEntry(currentRound(game), 0);
}

/**
 * Every gameplay lobby the server is serving, in the order the client is sent them.
 *
 * The order is the row's own id, which is the order the gate hands the list to a
 * client in — so the filter reads the way the game's own lobby-select screen
 * does, rather than alphabetically, which would scatter the lobbies a player
 * moves between (Free Battle, then the training lobbies) into an order they have
 * never seen.
 *
 * Names rather than ids, because a name is what the reader recognises and what
 * the games page groups by; the id is a row number from another table that a
 * reader has never seen. A name shared by two rows is one option, since two
 * rows of the same name are one kind of place to the reader.
 *
 * A lobby with no game in it is still listed. That is the point of reading the
 * table rather than the games: the question is which lobbies the server has,
 * not which have something running in them right now, and an empty result for a
 * quiet lobby is the truth rather than the filter being broken.
 */
export async function listLobbies(): Promise<string[]> {
  const rows = await database()`
    select name
    from lobbies
    where type_id = ${GameplayLobbyType}
      and updated_at >= now() - ${LobbyStaleSeconds} * interval '1 second'
    order by id
  `;

  return (rows as { name: string }[]).map((lobby) => lobby.name);
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
