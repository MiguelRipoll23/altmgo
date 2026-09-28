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
import { listNews, findNews } from '../newsQueries.js';
import { findAccountMail, isMailBox, listAccountMail } from '../mailQueries.js';
import { listLobbyPresence, readPresenceTotals, readServerTotals } from '../presence.js';
import { readAccountPublicAddress } from '../publicAddresses.js';
import { isClanBoard, isPlayerBoard, readClanBoard, readPlayerBoard } from '../rankingsQueries.js';

export const dashboardRoutes = new Hono<AppBindings>();

/** Largest window one page of results may hold. */
const MaximumWindow = 100;

/** Largest number of characters one search may return. */
const MaximumSearchResults = 200;

/**
 * Largest number of news items one read returns.
 *
 * The login screen shows a fixed handful and has no way to ask for more, so a longer
 * list would be pages nobody scrolls to rather than news anybody missed.
 */
const MaximumNewsItems = 50;

/**
 * Largest number of messages one inbox read returns.
 *
 * The client shows a fixed handful in the inbox and has no control over it, so a
 * longer list would be letters the game itself never reaches.
 */
const MaximumMailItems = 50;

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
 * The overview: how many players the server has, how many are on it, how many
 * games it has hosted, the gameplay lobbies they are spread across, and the
 * address the caller's own last character publishes.
 *
 * The three counts are read as three questions rather than as one figure with two
 * faces. How many players exist says whether the server is being used, how many
 * are connected says whether it is busy right now, and how many games have been
 * hosted says whether it is being played at all — a server with a thousand
 * characters and nothing open is a very different server from a busy one, and the
 * three are only legible beside each other.
 *
 * The lobby breakdown is what makes the connected count actionable — a server with
 * forty players spread over one lobby and a server with forty spread over eight
 * are the same number and a very different afternoon — and it carries each
 * lobby's own restrictions, because "is this lobby one I can send a beginner to"
 * is the question the list exists to answer. The published address is the one
 * thing on this page that is about the person reading rather than the server: it
 * is what another player would connect to in order to join their game, and it
 * goes stale when their network changes.
 *
 * The address is deliberately not in the lobby list. Every lobby shows the same
 * host in a deployment behind one address, so a column of identical values
 * spends width on saying nothing, and the one address that has to be correct is
 * the caller's own — which is above the table for that reason.
 *
 * Both frames read this one route, so the admin overview and the player overview
 * cannot disagree about the figures: they are the same reading of the same
 * moment, drawn for a different reader.
 */
dashboardRoutes.get('/overview', requireAccount, async (context) => {
  const totals = await readPresenceTotals();
  const server = await readServerTotals();
  const lobbies = await listLobbyPresence();
  const published = await readAccountPublicAddress(context.get('accountIdentifier'));

  return context.json({
    totals: {
      totalPlayers: server.players,
      connectedPlayers: totals.players,
      totalGames: server.games,
    },
    lobbies: lobbies.map((lobby) => ({
      id: lobby.id,
      name: lobby.name,
      players: lobby.players,
      restrictions: {
        beginnersOnly: lobby.beginnersOnly,
        expansionRequired: lobby.expansionRequired,
        noHeadshots: lobby.noHeadshots,
        replaysOnly: lobby.replaysOnly,
      },
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

/**
 * The teams of any event mode.
 *
 * Survival has a section of its own that reads the same rows, but the event
 * operations page works across all three modes from one selector, and a moderator
 * forming a Tournament team should not have to leave the page to see what is
 * already there.
 */
dashboardRoutes.get('/events/:mode/teams', requireAccount, async (context) => {
  const mode = Number(context.req.param('mode'));

  if (!isEventMode(mode)) {
    return context.json({ error: 'That lobby mode does not hold events.' }, 400);
  }

  return context.json({ teams: await listEventTeams(mode) });
});

/** The schedules of any event mode, for the sections that list them. */
dashboardRoutes.get('/events/:mode/schedules', requireAccount, async (context) => {
  const mode = Number(context.req.param('mode'));

  if (!isEventMode(mode)) {
    return context.json({ error: 'That lobby mode does not hold events.' }, 400);
  }

  return context.json({ schedules: await listEventSchedules(mode) });
});

/**
 * The news the client shows on the login screen.
 *
 * Open to any signed-in account rather than to staff, because it is the one page of
 * this app a player cannot see any other way: the same rows are drawn by the client
 * before the lobby list, and a dashboard that hid them would only be a second,
 * worse copy of something already on their screen. It is the same query the manager
 * reads to publish; only the permission differs, and nothing here writes.
 */
dashboardRoutes.get('/news', requireAccount, async (context) => {
  const news = await listNews(MaximumNewsItems);

  return context.json({
    news: news.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      important: item.important,
      publishedAt: item.time,
    })),
  });
});

/**
 * One news item, for the page the list opens.
 *
 * The same item the list above carries, read on its own: the detail page is a
 * link somebody can be sent by another account, and a page that had to be handed
 * the body through a query string would break the moment it was shared.
 */
dashboardRoutes.get('/news/:identifier', requireAccount, async (context) => {
  const item = await findNews(Number(context.req.param('identifier')));

  if (!item) {
    return context.json({ error: 'That news item has been withdrawn.' }, 404);
  }

  return context.json({
    news: {
      id: item.id,
      title: item.title,
      body: item.body,
      important: item.important,
      publishedAt: item.time,
    },
  });
});

/**
 * The caller's own mail, newest first, on the side asked for.
 *
 * Open to any signed-in account and scoped to it, because a mailbox is the one
 * list on this dashboard that is about the person reading it rather than the
 * server. The box is `inbox` unless another is named, and an unknown one is
 * refused rather than answered with a list the caller did not ask for — the three
 * names are the whole vocabulary, and a fourth would be a list nobody has drawn.
 *
 * The window is the same as the news: the client shows a fixed handful and has no
 * way to ask for more, so a longer list would be letters the game itself never
 * reaches.
 */
dashboardRoutes.get('/mail', requireAccount, async (context) => {
  const requested = context.req.query('box') ?? 'inbox';

  if (!isMailBox(requested)) {
    return context.json({ error: 'There is no such mailbox.' }, 400);
  }

  const mail = await listAccountMail(
    context.get('accountIdentifier'),
    requested,
    MaximumMailItems,
  );

  return context.json({
    box: requested,
    mail: mail.map((message) => ({
      id: message.id,
      subject: message.subject,
      body: message.body,
      senderName: message.sender_name,
      recipientName: message.recipient_name,
      sentAt: message.sent_at,
      isRead: message.is_read,
      received: message.received,
    })),
  });
});

/** One message of the caller's own mail, from either side of it. */
dashboardRoutes.get('/mail/:identifier', requireAccount, async (context) => {
  const message = await findAccountMail(
    context.get('accountIdentifier'),
    Number(context.req.param('identifier')),
  );

  if (!message) {
    return context.json({ error: 'That message is not in your mailbox.' }, 404);
  }

  return context.json({
    mail: {
      id: message.id,
      subject: message.subject,
      body: message.body,
      senderName: message.sender_name,
      recipientName: message.recipient_name,
      sentAt: message.sent_at,
      isRead: message.is_read,
      received: message.received,
    },
  });
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
