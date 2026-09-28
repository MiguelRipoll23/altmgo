import { Hono } from 'hono';
import type { AppBindings } from '../authentication.js';
import { requireAccount } from '../authentication.js';
import {
  isCharacterSort,
  listEventSchedules,
  listEventTeams,
  listGames,
  listTournamentEntries,
  listTournamentFixtures,
  findCharacterDetail,
  findTournamentBracket,
  searchCharacters,
  isEventMode,
  SurvivalMode,
} from '../dashboardQueries.js';
import { listLobbyPresence, readPresenceTotals } from '../presence.js';
import { readAccountPublicAddress } from '../publicAddresses.js';
import { isClanBoard, isPlayerBoard, readClanBoard, readPlayerBoard } from '../rankingsQueries.js';

export const dashboardRoutes = new Hono<AppBindings>();

/** Largest window one page of results may hold. */
const MaximumWindow = 100;

/** Largest number of characters one search may return. */
const MaximumSearchResults = 200;

/** Reads a whole-number query parameter, clamped into a range. */
function readNumber(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, minimum), maximum);
}

/** Reads a boolean query parameter, where only `true` asks for the thing. */
function readFlag(value: string | undefined): boolean {
  return value === 'true';
}

/**
 * The overview: how many players are on the server, the gameplay lobbies they
 * are spread across, and the address the caller's own last character publishes.
 *
 * The lobby breakdown is what makes the count actionable — a server with forty
 * players spread over one lobby and a server with forty spread over eight are
 * the same number and a very different afternoon — and the published address is
 * the one thing on this page that is about the person reading it rather than
 * about the server: it is what another player would connect to in order to join
 * their game, and it is the figure that goes stale when their network changes.
 */
dashboardRoutes.get('/overview', requireAccount, async (context) => {
  const totals = await readPresenceTotals();
  const lobbies = await listLobbyPresence();
  const published = await readAccountPublicAddress(context.get('accountIdentifier'));

  return context.json({
    totals: { connectedPlayers: totals.players },
    lobbies: lobbies.map((lobby) => ({
      id: lobby.id,
      name: lobby.name,
      address: `${lobby.address}:${lobby.port}`,
      players: lobby.players,
    })),
    publishedAddress: published === undefined
      ? null
      : {
          characterId: published.characterId,
          characterName: published.characterName,
          address: published.publicAddress,
        },
  });
});

/** Searches the characters of every account, for the characters section. */
dashboardRoutes.get('/characters', requireAccount, async (context) => {
  const term = context.req.query('term')?.trim() ?? '';
  const requested = context.req.query('sort') ?? 'name';
  const sort = isCharacterSort(requested) ? requested : 'name';
  const limit = readNumber(context.req.query('limit'), 50, 1, MaximumSearchResults);

  const characters = await searchCharacters(term, sort, limit);

  return context.json({
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      accountName: character.account_name,
      rank: character.rank,
      experience: character.experience,
      totalRewards: character.total_rewards,
      lobbyName: character.lobby_name,
      publicAddress:
        character.public_ip && character.public_port
          ? `${character.public_ip}:${character.public_port}`
          : null,
      lastSeen: character.last_seen_at,
    })),
  });
});

/** One character's profile. */
dashboardRoutes.get('/characters/:identifier', requireAccount, async (context) => {
  const character = await findCharacterDetail(Number(context.req.param('identifier')));

  if (!character) {
    return context.json({ error: 'No such character.' }, 404);
  }

  return context.json({
    character: {
      id: character.id,
      name: character.name,
      previousName: character.old_name,
      accountName: character.account_name,
      comment: character.comment,
      rank: character.rank,
      experience: character.experience,
      totalRewards: character.total_rewards,
      lobbyName: character.lobby_name,
      publicAddress:
        character.public_ip && character.public_port
          ? `${character.public_ip}:${character.public_port}`
          : null,
      createdAt: character.created_at,
      lastSeenAt: character.last_seen_at,
    },
  });
});

/** The game rooms that are up right now. */
dashboardRoutes.get('/games', requireAccount, async (context) => {
  const games = await listGames();

  return context.json({
    games: games.map((game) => ({
      id: game.id,
      name: game.name,
      comment: game.comment,
      hostName: game.host_name,
      lobbyName: game.lobby_name,
      players: game.players,
      maximumPlayers: game.maximum_players,
      mode: game.current_game,
      status: game.status,
      hasPassword: game.has_password,
      updatedAt: game.updated_at,
    })),
  });
});

/** The Survival teams and the events they are played in. */
dashboardRoutes.get('/survival', requireAccount, async (context) => {
  const teams = await listEventTeams(SurvivalMode);
  const schedules = await listEventSchedules(SurvivalMode);

  return context.json({ teams, schedules });
});

/** One Tournament event: who registered, how the bracket was drawn, what was played. */
dashboardRoutes.get('/tournament', requireAccount, async (context) => {
  const eventIdentifier = Number(context.req.query('event'));
  if (!Number.isInteger(eventIdentifier) || eventIdentifier <= 0) {
    return context.json({ error: 'A tournament event must be named.' }, 400);
  }

  return context.json({
    event: eventIdentifier,
    entries: await listTournamentEntries(eventIdentifier),
    bracket: (await findTournamentBracket(eventIdentifier)) ?? null,
    fixtures: await listTournamentFixtures(eventIdentifier),
  });
});

/** The schedules of any event mode, for the sections that list them. */
dashboardRoutes.get('/events/:mode/schedules', requireAccount, async (context) => {
  const mode = Number(context.req.param('mode'));

  if (!isEventMode(mode)) {
    return context.json({ error: 'That lobby mode does not hold events.' }, 400);
  }

  return context.json({ schedules: await listEventSchedules(mode) });
});

/** A window of a player board. */
dashboardRoutes.get('/rankings/players', requireAccount, async (context) => {
  const requested = context.req.query('board') ?? 'gradePoint';

  if (!isPlayerBoard(requested)) {
    return context.json({ error: 'No such ranking board.' }, 400);
  }

  const page = await readPlayerBoard(
    requested,
    readNumber(context.req.query('mode'), 0, 0, 10),
    readFlag(context.req.query('month')),
    readNumber(context.req.query('from'), 0, 0, Number.MAX_SAFE_INTEGER),
    readNumber(context.req.query('limit'), 25, 1, MaximumWindow),
  );

  return context.json({ board: requested, ...page });
});

/** A window of a clan board. */
dashboardRoutes.get('/rankings/clans', requireAccount, async (context) => {
  const requested = context.req.query('board') ?? 'gradePoint';

  if (!isClanBoard(requested)) {
    return context.json({ error: 'No such ranking board.' }, 400);
  }

  const page = await readClanBoard(
    requested,
    readFlag(context.req.query('month')),
    readNumber(context.req.query('from'), 0, 0, Number.MAX_SAFE_INTEGER),
    readNumber(context.req.query('limit'), 25, 1, MaximumWindow),
  );

  return context.json({ board: requested, ...page });
});
