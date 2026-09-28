import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../authentication.js';
import { requireAccount, requireManager } from '../authentication.js';
import { findClanDetail, isClanSort, isClanStatus, searchClans } from '../clanQueries.js';
import { editClan, removeClan, type ClanOutcome, type ClanRefusal } from '../clanWrites.js';
import { readBody, readBoolean, readText } from '../requestBody.js';

/**
 * The clan directory and the record of any one clan.
 *
 * It is open to any signed-in account rather than to staff, on the same reasoning as
 * Survival: a roster and a notice are things a player can already read in the client,
 * and the applications waiting on a clan are the clan's own business to publish. The
 * page draws what is there.
 *
 * The two writes at the foot are the exception, and they are manager rather than
 * moderator because a clan is not an event: running the events is a moderator's
 * work, while a clan's name and notice are things players see in the client and are
 * the server's own business to put right. They are the same shape as the manager's
 * news and mail writes — a correction, and a removal — and the refusals are worded
 * here for the same reason: the layer that touches the database reports what it
 * could not do, and this is where that becomes a sentence.
 */

/**
 * What each refusal means to the person who pressed the button.
 *
 * The length messages name the field rather than the column, because an operator
 * correcting a notice needs to know which of the three fields was refused, and
 * "character varying(15)" is a sentence about the database.
 */
const refusalMessages: Record<ClanRefusal['reason'], string> = {
  name: 'That name cannot be used. A clan name is empty or longer than fifteen characters.',
  comment: 'That comment is longer than a clan comment can be.',
  notice: 'That notice is longer than a clan notice can be.',
  'name-taken': 'Another clan already has that name.',
  'unknown-clan': 'That clan no longer exists.',
};

/** Answers a clan write with either its result or the sentence for why it failed. */
function answer(context: Context<AppBindings>, outcome: ClanOutcome<unknown>) {
  if (outcome.ok) {
    return context.json(outcome.value, 200);
  }

  return context.json({ error: refusalMessages[outcome.refusal.reason] }, 400);
}

export const clanRoutes = new Hono<AppBindings>();

/** Largest number of clans one search may return. */
const MaximumSearchResults = 200;

clanRoutes.get('/clans', requireAccount, async (context) => {
  const term = context.req.query('term')?.trim() ?? '';
  const requested = context.req.query('sort') ?? 'name';
  const sort = isClanSort(requested) ? requested : 'name';

  // The status is narrowed here rather than in the page, so the list that arrives is
  // the list the filter asked for rather than the first page of it. An unknown one
  // falls back to both sides rather than being refused, the same as an unknown
  // ordering: a stale link should still open the directory.
  const askedStatus = context.req.query('status') ?? 'all';
  const status = isClanStatus(askedStatus) ? askedStatus : 'all';

  const parsed = Number(context.req.query('limit') ?? MaximumSearchResults);
  const limit = Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), MaximumSearchResults) : MaximumSearchResults;

  const clans = await searchClans(term, sort, limit, status);

  return context.json({
    clans: clans.map((clan) => ({
      id: clan.id,
      name: clan.name,
      comment: clan.comment,
      notice: clan.notice,
      noticeAt: clan.notice_at,
      open: clan.open !== 0,
      leaderName: clan.leader_name,
      memberCount: clan.member_count,
      applicationCount: clan.application_count,
      createdAt: clan.created_at,
    })),
  });
});

/** One clan: its record, its roster and the applications waiting on its leader. */
clanRoutes.get('/clans/:identifier', requireAccount, async (context) => {
  const identifier = Number(context.req.param('identifier'));

  if (!Number.isInteger(identifier) || identifier <= 0) {
    return context.json({ error: 'No such clan.' }, 404);
  }

  const detail = await findClanDetail(identifier);

  if (!detail) {
    return context.json({ error: 'No such clan.' }, 404);
  }

  return context.json({
    clan: {
      id: detail.clan.id,
      name: detail.clan.name,
      comment: detail.clan.comment,
      notice: detail.clan.notice,
      noticeAt: detail.clan.notice_at,
      open: detail.clan.open !== 0,
      leaderName: detail.clan.leader_name,
      memberCount: detail.clan.member_count,
      applicationCount: detail.clan.application_count,
      createdAt: detail.clan.created_at,
    },
    members: detail.members.map((member) => ({
      characterId: member.character_id,
      name: member.name,
      rank: member.rank,
      isLeader: member.is_leader,
    })),
    applications: detail.applications.map((application) => ({
      id: application.id,
      characterId: application.character_id,
      characterName: application.character_name,
      appliedAt: application.applied_at,
    })),
  });
});

/** Corrects a clan's name, comment, notice, or whether it is taking applications. */
clanRoutes.put('/clans/:identifier', requireManager, async (context) => {
  const body = await readBody(context);
  const identifier = Number(context.req.param('identifier'));

  if (!Number.isInteger(identifier) || identifier <= 0) {
    return context.json({ error: 'No such clan.' }, 404);
  }

  return answer(
    context,
    await editClan(identifier, {
      name: readText(body, 'name'),
      comment: readText(body, 'comment'),
      notice: readText(body, 'notice'),
      open: readBoolean(body, 'open'),
    }),
  );
});

/**
 * Removes a clan, and says what went with it.
 *
 * The sentence names the roster and the applications because that is the part of
 * the action the operator cannot see: the clan leaving the directory is one line,
 * and forty characters leaving their clan is the half that reaches people.
 */
clanRoutes.delete('/clans/:identifier', requireManager, async (context) => {
  const identifier = Number(context.req.param('identifier'));

  if (!Number.isInteger(identifier) || identifier <= 0) {
    return context.json({ error: 'No such clan.' }, 404);
  }

  const outcome = await removeClan(identifier);

  if (!outcome.ok) {
    return answer(context, outcome);
  }

  const { id, members, applications } = outcome.value;

  return context.json({
    id,
    members,
    applications,
    message:
      `The clan was removed with ${members} member${members === 1 ? '' : 's'} and ` +
      `${applications} waiting application${applications === 1 ? '' : 's'}.`,
  });
});
