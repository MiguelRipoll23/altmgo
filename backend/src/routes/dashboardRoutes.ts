import { Hono } from 'hono';
import type { AppBindings } from '../authentication.js';
import { requireAccount } from '../authentication.js';
import {
  listEventSchedules,
  listEventTeams,
  listGames,
  listTournamentEntries,
  listTournamentFixtures,
  findTournamentBracket,
  isEventMode,
  SurvivalMode,
} from '../dashboardQueries.js';
import { listNews, findNews } from '../newsQueries.js';
import { findAccountMail, isMailBox, listAccountMail } from '../mailQueries.js';
import { findAccountById } from '../accounts.js';
import { readServerFigures } from '../statsQueries.js';
import { isClanBoard, isPlayerBoard, readClanBoard, readPlayerBoard } from '../rankingsQueries.js';

export const dashboardRoutes = new Hono<AppBindings>();

/** Largest window one page of results may hold. */
const MaximumWindow = 100;

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
 * Who the caller is.
 *
 * One account, named by the token, read from the row. The token already carries a
 * display name, and the dashboard could have taken it from there — but that claim
 * is a snapshot from whenever the token was issued, so a player who renames would
 * be greeted by the old name until their session expired, and the browser could
 * print a name the server had never heard of. Reading the row makes the heading and
 * the permission the same answer.
 *
 * It is here beside the overview rather than with the sign-in routes because the
 * sign-in is the only moment this was true before: the name was fetched once, kept
 * in the browser for the life of the tab, and gone by the time somebody opened a
 * second tab or followed a pasted link. The token outlives both.
 */
dashboardRoutes.get('/account', requireAccount, async (context) => {
  const account = await findAccountById(context.get('accountIdentifier'));

  if (!account) {
    // A token that verifies against a row that is not there is a session for an
    // account that has since been removed, which is the same thing as no session.
    return context.json({ error: 'That account no longer exists.' }, 401);
  }

  return context.json({
    account: { id: account.id, displayName: account.display_name },
  });
});

/**
 * The two figures the overview carries as a line rather than as cards.
 *
 * They are on a route of their own rather than folded into the news or the games
 * read because they are the only two numbers on that page that are not about the
 * moment: everything else on it is what the server has just said or is just
 * running, and these are how big the server is. A page that fetched them as part
 * of one of those reads would be asking for a whole list in order to draw a
 * figure, and would fail the figure along with the list if either query threw.
 */
dashboardRoutes.get('/server-figures', requireAccount, async (context) => {
  const figures = await readServerFigures();

  return context.json({
    connectedPlayers: figures.connectedPlayers,
    totalGames: figures.totalGames,
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
      rule: game.rule,
      map: game.map,
      status: game.status,
      hasPassword: game.has_password,
      ping: game.ping,
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
 * Survival and Tournament each have a section that reads the same rows, but both
 * need the ladder of a mode the page is not about — a bracket draws every entrant,
 * not only the ones on a named tournament — so the mode is part of the address
 * rather than chosen by a selector on the page.
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
 * It is the one page of this app a reader cannot see any other way: the same rows
 * are drawn by the client before the lobby list, and a dashboard that hid them
 * would only be a second, worse copy of something already on their screen.
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
