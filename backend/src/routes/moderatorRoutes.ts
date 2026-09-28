import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../authentication.js';
import { requireModerator, requireManager } from '../authentication.js';
import { isEventMode } from '../dashboardQueries.js';
import { isDiscordConfigured, sendChannelMessage } from '../discord.js';
import {
  addTeamMember,
  createEventSchedule,
  createEventTeam,
  isMemberState,
  isTeamState,
  setMemberState,
  setTeamState,
  withdrawEventSchedule,
  type ModerationRefusal,
} from '../moderationWrites.js';
import { editEventSchedule, removeEventTeam, renameEventTeam, type EditRefusal } from '../teamEdits.js';
import {
  assignServerCharacter,
  ensureServerCharacters,
  listServerCharacters,
  type ServerCharacterOutcome,
  type ServerCharacterRefusal,
} from '../serverCharacters.js';

export const moderatorRoutes = new Hono<AppBindings>();

/** Reads a JSON body, or nothing when the request does not carry one. */
async function readBody(context: Context<AppBindings>): Promise<Record<string, unknown>> {
  return ((await context.req.json().catch(() => undefined)) ?? {}) as Record<string, unknown>;
}

/** Reads a string field, or nothing when it is absent or not a string. */
function readText(body: Record<string, unknown>, name: string): string | undefined {
  return typeof body[name] === 'string' ? (body[name] as string) : undefined;
}

/** Reads a whole-number field, or nothing when it is absent or not one. */
function readInteger(body: Record<string, unknown>, name: string): number | undefined {
  const value = body[name];

  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

/** Reads a boolean field, or nothing when it is absent or not one. */
function readBoolean(body: Record<string, unknown>, name: string): boolean | undefined {
  return typeof body[name] === 'boolean' ? (body[name] as boolean) : undefined;
}

/**
 * What each refusal means to the person who pressed the button. The reasons are
 * written here rather than in the write layer because they are written for a
 * player of the dashboard, not for a caller of the module — the layer that
 * touches the database reports what it could not do, and this is where that
 * becomes a sentence.
 */
const refusalMessages: Record<ModerationRefusal['reason'], string> = {
  name: 'That name cannot be used. Check it is not empty and not too long.',
  'unknown-character': 'No active character has that name.',
  'duplicate-member': 'That character is already on this team.',
  'roster-full': 'That team has no room left.',
  'unknown-team': 'That team no longer exists.',
  'duplicate-event-name': 'An event with that name already exists.',
  'invalid-window': 'The publication window does not make sense. It has to open before it closes.',
  'invalid-mode': 'That lobby mode does not hold events.',
};

/**
 * The sentences the team and character writes answer a refusal with. They are
 * separate from the event writes' because the two sets of reasons are separate:
 * a caller of this module never sees a reason the other one owns.
 */
const editRefusalMessages: Record<EditRefusal['reason'], string> = {
  name: 'That name cannot be used. Check it is not empty and not too long.',
  'unknown-team': 'That team or event no longer exists.',
  'duplicate-event-name': 'Another team or event already has that name.',
  'invalid-window': 'The publication window does not make sense. It has to open before it closes.',
  'in-use': 'That team is already in a drawn bracket, so it cannot be removed.',
};

const serverCharacterRefusalMessages: Record<ServerCharacterRefusal, string> = {
  'pool-full': 'The server character pool is full.',
  'unknown-account': 'This deployment has no "server" account for the server characters to belong to.',
  'name-taken': 'A character already has that name.',
  'unknown-team': 'That team no longer exists, or it has no room left.',
};

/** Answers a team or event write with either its result or the sentence for why it failed. */
function answerEdit<T>(context: Context<AppBindings>, outcome: { ok: true; value: T } | { ok: false; refusal: EditRefusal }) {
  if (outcome.ok) {
    return context.json(outcome.value, 200);
  }

  return context.json({ error: editRefusalMessages[outcome.refusal.reason] }, 400);
}

/** Answers a server character write with either its result or the sentence for why it failed. */
function answerCharacters<T>(
  context: Context<AppBindings>,
  outcome: ServerCharacterOutcome<T>,
) {
  if (outcome.ok) {
    return context.json(outcome.value, 200);
  }

  return context.json({ error: serverCharacterRefusalMessages[outcome.refusal] }, 400);
}

/** Answers a write with either its result or the sentence for why it failed. */
function answer<T>(context: Context<AppBindings>, outcome: { ok: true; value: T } | { ok: false; refusal: ModerationRefusal }) {
  if (outcome.ok) {
    return context.json(outcome.value, 200);
  }

  // A refusal is a bad request rather than a fault: the caller asked for
  // something the data does not allow, and the message is written for them.
  return context.json({ error: refusalMessages[outcome.refusal.reason] }, 400);
}

/** Creates a team in a Survival or Tournament lobby. */
moderatorRoutes.post('/moderator/teams', requireModerator, async (context) => {
  const body = await readBody(context);
  const mode = readInteger(body, 'mode');
  const name = readText(body, 'name');
  const ownerName = readText(body, 'ownerName');

  if (mode === undefined || !isEventMode(mode) || name === undefined || ownerName === undefined) {
    return context.json({ error: 'A team needs a lobby mode, a name and an owner.' }, 400);
  }

  return answer(
    context,
    await createEventTeam(mode, name, readText(body, 'comment') ?? '', ownerName),
  );
});

/** Puts a character on a team by name, which is how a `server-` character joins. */
moderatorRoutes.post('/moderator/teams/:identifier/members', requireModerator, async (context) => {
  const body = await readBody(context);
  const characterName = readText(body, 'characterName');

  if (characterName === undefined) {
    return context.json({ error: 'A member needs a character name.' }, 400);
  }

  return answer(context, await addTeamMember(Number(context.req.param('identifier')), characterName));
});

/** Puts one member of a team into a state. */
moderatorRoutes.put('/moderator/teams/:identifier/members/:slot', requireModerator, async (context) => {
  const body = await readBody(context);
  const requested = readText(body, 'state');

  if (requested === undefined || !isMemberState(requested)) {
    return context.json({ error: 'A member can only be pending or ready.' }, 400);
  }

  return answer(
    context,
    await setMemberState(
      Number(context.req.param('identifier')),
      Number(context.req.param('slot')),
      requested,
    ),
  );
});

/** Puts a team into a state, which is how a joinable team is queued. */
moderatorRoutes.put('/moderator/teams/:identifier/state', requireModerator, async (context) => {
  const body = await readBody(context);
  const requested = readText(body, 'state');

  if (requested === undefined || !isTeamState(requested)) {
    return context.json({ error: 'A team can only be joinable or queued.' }, 400);
  }

  return answer(context, await setTeamState(Number(context.req.param('identifier')), requested));
});

/** Publishes a new event, which is what makes it enterable. */
moderatorRoutes.post('/moderator/schedules', requireModerator, async (context) => {
  const body = await readBody(context);
  const mode = readInteger(body, 'mode');
  const name = readText(body, 'name');
  const teamCapacity = readInteger(body, 'teamCapacity');
  const publishStart = readInteger(body, 'publishStart');
  const publishEnd = readInteger(body, 'publishEnd');

  if (
    mode === undefined ||
    name === undefined ||
    teamCapacity === undefined ||
    publishStart === undefined ||
    publishEnd === undefined
  ) {
    return context.json({ error: 'An event needs a mode, a name, a capacity and a window.' }, 400);
  }

  return answer(
    context,
    await createEventSchedule({
      mode,
      name,
      teamCapacity,
      publishStart,
      publishEnd,
      enabled: readBoolean(body, 'enabled') ?? true,
    }),
  );
});

/** Withdraws a schedule, which closes the event. */
moderatorRoutes.delete('/moderator/schedules/:identifier', requireModerator, async (context) =>
  answer(context, await withdrawEventSchedule(Number(context.req.param('identifier')))),
);

/**
 * Renames a team and rewrites its comment. The state is not editable here: the
 * event subsystem owns it, and a value written by hand is one it is about to
 * overwrite.
 */
moderatorRoutes.put('/moderator/teams/:identifier', requireModerator, async (context) => {
  const body = await readBody(context);
  const name = readText(body, 'name');
  const comment = readText(body, 'comment');

  if (name === undefined || comment === undefined) {
    return context.json({ error: 'A team needs a name and a comment.' }, 400);
  }

  return answerEdit(context, await renameEventTeam(Number(context.req.param('identifier')), name, comment));
});

/** Removes a team, refusing one a bracket has already drawn. */
moderatorRoutes.delete('/moderator/teams/:identifier', requireModerator, async (context) =>
  answerEdit(context, await removeEventTeam(Number(context.req.param('identifier')))),
);

/** Edits a published event's name, window, field size and whether it is published. */
moderatorRoutes.put('/moderator/schedules/:identifier', requireModerator, async (context) => {
  const body = await readBody(context);
  const name = readText(body, 'name');
  const teamCapacity = readInteger(body, 'teamCapacity');
  const publishStart = readInteger(body, 'publishStart');
  const publishEnd = readInteger(body, 'publishEnd');

  if (name === undefined || teamCapacity === undefined || publishStart === undefined || publishEnd === undefined) {
    return context.json({ error: 'An event needs a name, a capacity and a window.' }, 400);
  }

  return answerEdit(
    context,
    await editEventSchedule(Number(context.req.param('identifier')), {
      name,
      teamCapacity,
      publishStart,
      publishEnd,
      enabled: readBoolean(body, 'enabled') ?? true,
    }),
  );
});

/**
 * Every server character there is, with the team each is on.
 *
 * The list is what a moderator fills a team from, so it is a moderator route:
 * a player has no business reading the characters the dedicated match rooms are
 * named after.
 */
moderatorRoutes.get('/moderator/server-characters', requireModerator, async (context) =>
  context.json({ characters: await listServerCharacters() }),
);

/**
 * Creates the server characters that are missing, up to the number asked for.
 *
 * This is the on-demand half of the pool: a moderator asking for six gets six,
 * and the rest are made when they are next asked for. Asking for a number the
 * pool already holds is not a failure — it names the pool.
 */
moderatorRoutes.post('/moderator/server-characters', requireModerator, async (context) => {
  const body = await readBody(context);
  const wanted = readInteger(body, 'count') ?? 0;

  return answerCharacters(context, await ensureServerCharacters(wanted));
});

/**
 * Moves a server character onto a team, or off every team when none is named.
 *
 * Moving rather than adding is the whole point: a server character fills one
 * slot on one team at a time, so putting it on a second team has to take it off
 * the first.
 */
moderatorRoutes.put('/moderator/server-characters/:identifier', requireModerator, async (context) => {
  const body = await readBody(context);
  const team = readInteger(body, 'teamId');

  return answerCharacters(
    context,
    await assignServerCharacter(Number(context.req.param('identifier')), team === undefined ? undefined : team),
  );
});

/**
 * Writes a message from the bot into a channel of the guild.
 *
 * This is the one write that reaches outside the game, which is why it needs the
 * manager role and not the moderator one: a moderator runs the events, and a
 * manager speaks for the server.
 */
export const managerRoutes = new Hono<AppBindings>();

managerRoutes.get('/manager/discord', requireManager, (context) =>
  context.json({ configured: isDiscordConfigured() }),
);

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
  // request was well formed and the upstream that could not carry it out is
  // what said no.
  return context.json({ error: 'Discord did not accept that message.' }, outcome.refusal.reason === 'invalid-channel' ? 400 : 502);
});
