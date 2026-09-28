import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../authentication.js';
import { requireManager } from '../authentication.js';
import { isDiscordConfigured, sendChannelMessage } from '../discord.js';
import { readBody, readBoolean, readInteger, readText } from '../requestBody.js';
import { listNews, findNews } from '../newsQueries.js';
import { findOutboxMail } from '../mailQueries.js';
import { isGameMasterMailBox, listGameMasterMail, listStaffAccounts } from '../staffQueries.js';
import {
  editGameMasterMail,
  editNews,
  grantRole,
  publishNews,
  removeGameMasterMail,
  removeNews,
  revokeRole,
  sendGameMasterMail,
  type StaffOutcome,
  type StaffRefusal,
} from '../staffWrites.js';

/**
 * The manager routes: everything that speaks for the server rather than for its
 * events.
 *
 * They are a file of their own because a manager's work is a different shape from a
 * moderator's. A moderator runs the rooms — teams, rosters, schedules — and every
 * action is about the game as it is being played. A manager decides who may act at
 * all and what the server says to its players, and none of that is visible in the
 * game world. Each route checks the role itself, so a route added to the wrong
 * group is refused rather than opened.
 */
export const managerRoutes = new Hono<AppBindings>();

/** Largest number of news items or messages one read returns. */
const MaximumListedRows = 200;

/**
 * What each refusal means to the person who pressed the button.
 *
 * The reasons are written here rather than in the write layer because they are
 * written for an operator of the dashboard, not for a caller of the module: the
 * layer that touches the database reports what it could not do, and this is where
 * that becomes a sentence.
 */
const refusalMessages: Record<StaffRefusal['reason'], string> = {
  'unknown-account': 'No account has that id.',
  'unknown-role': 'That is not a role this deployment knows.',
  'role-held': 'That account already holds that role.',
  'role-not-held': 'That account does not hold that role.',
  'last-manager': 'This is the last manager, so the role cannot be taken away.',
  title: 'That title or subject cannot be used. Check it is not empty and not too long.',
  body: 'That message body cannot be used. Check it is not empty and not too long.',
  sender: 'That sender name cannot be used. Check it is not empty and not too long.',
  'unknown-news': 'That news item has already been withdrawn.',
  'unknown-mail': 'That message has already been removed.',
};

/** Answers a manager write with either its result or the sentence for why it failed. */
function answer<T>(context: Context<AppBindings>, outcome: StaffOutcome<T>) {
  if (outcome.ok) {
    return context.json(outcome.value, 200);
  }

  // A refusal is a bad request rather than a fault: the caller asked for something
  // the data does not allow, and the message is written for them.
  return context.json({ error: refusalMessages[outcome.refusal.reason] }, 400);
}

/** Whether the guild tools can reach Discord at all. */
managerRoutes.get('/manager/discord', requireManager, (context) =>
  context.json({ configured: isDiscordConfigured() }),
);

/**
 * Writes a message from the bot into a channel of the guild.
 *
 * This is the one write that reaches outside the game, which is why it needs the
 * manager role and not the moderator one: a moderator runs the events, and a manager
 * speaks for the server.
 */
managerRoutes.post('/manager/discord/messages', requireManager, async (context) => {
  const body = await readBody(context);
  const channelIdentifier = readText(body, 'channelId');
  const content = readText(body, 'content');

  if (channelIdentifier === undefined || content === undefined) {
    return context.json({ error: 'A message needs a channel and some text.' }, 400);
  }

  const outcome = await sendChannelMessage(channelIdentifier, content);

  if (outcome.ok) {
    return context.json({ sent: true });
  }

  // Discord answering a refusal is a bad gateway rather than a bad request: the
  // request was well formed and the upstream that could not carry it out is what
  // said no.
  return context.json(
    { error: 'Discord did not accept that message.' },
    outcome.refusal.reason === 'invalid-channel' ? 400 : 502,
  );
});

/** Every account, with the staff roles it holds. */
managerRoutes.get('/manager/roles', requireManager, async (context) => {
  const accounts = await listStaffAccounts();

  return context.json({
    accounts: accounts.map((account) => ({
      id: account.id,
      displayName: account.display_name,
      mainCharacterName: account.main_character_name,
      currentCharacterName: account.current_character_name,
      characterCount: account.character_count,
      bannedUntil: account.banned_until,
      banReason: account.ban_reason,
      roles: account.roles.map((held) => ({
        role: held.role,
        grantedAt: held.granted_at,
      })),
    })),
  });
});

/** Grants a staff role to an account. */
managerRoutes.post('/manager/roles', requireManager, async (context) => {
  const body = await readBody(context);
  const accountIdentifier = readInteger(body, 'accountId');
  const role = readText(body, 'role');

  if (accountIdentifier === undefined || role === undefined) {
    return context.json({ error: 'A role grant needs an account and a role.' }, 400);
  }

  return answer(context, await grantRole(accountIdentifier, role));
});

/** Revokes a staff role from an account. */
managerRoutes.delete('/manager/roles', requireManager, async (context) => {
  const body = await readBody(context);
  const accountIdentifier = readInteger(body, 'accountId');
  const role = readText(body, 'role');

  if (accountIdentifier === undefined || role === undefined) {
    return context.json({ error: 'A role revoke needs an account and a role.' }, 400);
  }

  return answer(context, await revokeRole(accountIdentifier, role));
});

/** The news items the client shows on the login screen. */
managerRoutes.get('/manager/news', requireManager, async (context) => {
  const news = await listNews(MaximumListedRows);

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
 * One news item, for the page the published list opens.
 *
 * It is the same read the player dashboard answers with, reached from a list
 * that has just been written, so withdrawing an item and then following an old
 * link says the item is gone rather than showing the last body it had.
 */
managerRoutes.get('/manager/news/:identifier', requireManager, async (context) => {
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

/** Publishes a news item. */
managerRoutes.post('/manager/news', requireManager, async (context) => {
  const body = await readBody(context);
  const title = readText(body, 'title');
  const article = readText(body, 'body');

  if (title === undefined || article === undefined) {
    return context.json({ error: 'A news item needs a title and a body.' }, 400);
  }

  return answer(
    context,
    await publishNews({ title, body: article, important: readBoolean(body, 'important') ?? false }),
  );
});

/** Corrects a published news item in place. */
managerRoutes.put('/manager/news/:identifier', requireManager, async (context) => {
  const body = await readBody(context);
  const identifier = Number(context.req.param('identifier'));

  if (!Number.isInteger(identifier) || identifier <= 0) {
    return context.json({ error: 'That news item has been withdrawn.' }, 404);
  }

  return answer(
    context,
    await editNews(identifier, {
      title: readText(body, 'title'),
      body: readText(body, 'body'),
      important: readBoolean(body, 'important'),
    }),
  );
});

/** Withdraws a news item. */
managerRoutes.delete('/manager/news/:identifier', requireManager, async (context) =>
  answer(context, await removeNews(Number(context.req.param('identifier')))),
);

/**
 * The game masters' mailbox, on one side of it or the other.
 *
 * The side is asked for rather than answered with everything, because the two are
 * not the same list: a player writes a letter to the game masters and the game
 * stores it here, and that letter has been read by nobody until somebody opens
 * this page. The other side is what the console has written into the same mailbox
 * with no sender on it. One table, two questions, and a manager answering a
 * player should not have to read their own letters to find the letter.
 */
managerRoutes.get('/manager/mail', requireManager, async (context) => {
  const asked = context.req.query('box') ?? 'inbox';
  const box = isGameMasterMailBox(asked) ? asked : 'inbox';
  const mail = await listGameMasterMail(box, MaximumListedRows);

  return context.json({
    box,
    mail: mail.map((message) => ({
      id: message.id,
      subject: message.subject,
      body: message.body,
      senderName: message.sender_name,
      senderCharacterId: message.sender_character_id,
      senderCharacterName: message.sender_character_name,
      sentAt: message.sent_at,
    })),
  });
});

/**
 * One game master message, for the page the sent list opens.
 *
 * The outbox rather than an inbox: a manager reads back what was said to
 * everybody, and there is no single character it was addressed to.
 */
managerRoutes.get('/manager/mail/:identifier', requireManager, async (context) => {
  const message = await findOutboxMail(Number(context.req.param('identifier')));

  if (!message) {
    return context.json({ error: 'There is no sent message with that id.' }, 404);
  }

  return context.json({
    mail: {
      id: message.id,
      subject: message.subject,
      body: message.body,
      senderName: message.sender_name,
      senderCharacterId: message.sender_character_id,
      senderCharacterName: message.sender_character_name,
      sentAt: message.sent_at,
    },
  });
});

/** Sends a game master mail to every character's inbox. */
managerRoutes.post('/manager/mail', requireManager, async (context) => {
  const body = await readBody(context);
  const subject = readText(body, 'subject');
  const article = readText(body, 'body');
  const senderName = readText(body, 'senderName');

  if (subject === undefined || article === undefined || senderName === undefined) {
    return context.json({ error: 'A message needs a sender, a subject and a body.' }, 400);
  }

  return answer(context, await sendGameMasterMail({ subject, body: article, senderName }));
});

/** Corrects a game master letter in place. */
managerRoutes.put('/manager/mail/:identifier', requireManager, async (context) => {
  const body = await readBody(context);
  const identifier = Number(context.req.param('identifier'));

  if (!Number.isInteger(identifier) || identifier <= 0) {
    return context.json({ error: 'No such message.' }, 404);
  }

  return answer(
    context,
    await editGameMasterMail(identifier, {
      subject: readText(body, 'subject'),
      body: readText(body, 'body'),
      senderName: readText(body, 'senderName'),
    }),
  );
});

/**
 * Removes a game master letter.
 *
 * The sentence it answers with names how many inboxes the letter was withdrawn
 * from, because that is the part of the action the operator cannot see: the row
 * leaving this table is one line in a list, and the copies leaving every player's
 * inbox is the half that actually reaches people.
 */
managerRoutes.delete('/manager/mail/:identifier', requireManager, async (context) => {
  const identifier = Number(context.req.param('identifier'));

  if (!Number.isInteger(identifier) || identifier <= 0) {
    return context.json({ error: 'No such message.' }, 404);
  }

  const outcome = await removeGameMasterMail(identifier);

  if (!outcome.ok) {
    return answer(context, outcome);
  }

  return context.json({
    id: outcome.value.id,
    withdrawn: outcome.value.withdrawn,
    message:
      outcome.value.withdrawn === 0
        ? 'The letter was removed. It had not been delivered to any inbox.'
        : `The letter was removed and withdrawn from ${outcome.value.withdrawn} inboxes.`,
  });
});
