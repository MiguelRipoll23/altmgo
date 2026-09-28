import { Hono } from 'hono';
import type { AppBindings } from '../authentication.js';
import { requireAccount } from '../authentication.js';
import { findClanDetail, isClanSort, isClanStatus, searchClans } from '../clanQueries.js';

/**
 * The clan directory and the record of any one clan.
 *
 * It is open to any signed-in account, on the same reasoning as Survival: a roster
 * and a notice are things a player can already read in the client, and the
 * applications waiting on a clan are the clan's own business to publish. The page
 * draws what is there and writes nothing — a clan's name, roster and leader are the
 * game's own state, and a second place to correct them would be one more thing to
 * disagree with the client.
 */
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
