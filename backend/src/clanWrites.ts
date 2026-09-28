import { database, isUniqueViolation } from './database.js';

/**
 * The writes a manager makes on a clan.
 *
 * Only the clan's own text is editable, and only because of what the columns are:
 * a name, a short comment and a notice are things a leader types in the client, and
 * a dashboard that cannot correct one of them leaves a manager explaining in chat
 * what a form could have said.
 *
 * Everything else about a clan is not editable here and the reason is that it is
 * not a field, it is a relationship. The leader, the emblem holder, the roster and
 * the applications are rows other tables point at, and the game owns the rules that
 * move them — promoting somebody to leader, expelling a member, accepting an
 * application. A dashboard write that set `clans.leader_id` directly would produce
 * a clan whose leader is not in it, and no error would be raised, because the
 * foreign key is satisfied. That is a worse outcome than not offering the control.
 */

/** Longest clan name the column stores. */
const MaximumClanNameLength = 15;

/** Longest clan comment the column stores. */
const MaximumClanCommentLength = 128;

/** Longest clan notice the column stores. */
const MaximumClanNoticeLength = 512;

/** Why a clan write was refused, in terms the dashboard can show as they are. */
export type ClanRefusal =
  | { reason: 'name' }
  | { reason: 'comment' }
  | { reason: 'notice' }
  | { reason: 'name-taken' }
  | { reason: 'unknown-clan' };

/** The outcome of one clan write: what changed, or why it could not. */
export type ClanOutcome<T> = { ok: true; value: T } | { ok: false; refusal: ClanRefusal };

/** Refuses a write with the reason, so every caller reports refusals the same way. */
function refuse<T>(refusal: ClanRefusal): ClanOutcome<T> {
  return { ok: false, refusal };
}

/**
 * Corrects a clan's name, comment and notice in place.
 *
 * Each field is optional and absent means unchanged, so a caller correcting one
 * thing is not also asserting the other two — which matters here because the page
 * sending this is holding values it read some time ago, and a field it never
 * touched should not be rewritten from a stale copy of what it held when the page
 * was opened.
 *
 * The notice's timestamp moves with the notice, because `notice_at` is when the
 * notice was published and a corrected notice has been published again. Leaving it
 * where it was would leave the client showing a corrected notice as though it had
 * been up for as long as the original.
 */
export async function editClan(
  clanIdentifier: number,
  input: { name?: string; comment?: string; notice?: string; open?: boolean },
): Promise<ClanOutcome<{ id: number }>> {
  const name = input.name === undefined ? undefined : input.name.trim();

  if (name !== undefined && (name.length === 0 || name.length > MaximumClanNameLength)) {
    return refuse({ reason: 'name' });
  }

  const comment = input.comment === undefined ? undefined : input.comment.trim();

  if (comment !== undefined && comment.length > MaximumClanCommentLength) {
    return refuse({ reason: 'comment' });
  }

  const notice = input.notice === undefined ? undefined : input.notice.trim();

  if (notice !== undefined && notice.length > MaximumClanNoticeLength) {
    return refuse({ reason: 'notice' });
  }

  if (name === undefined && comment === undefined && notice === undefined && input.open === undefined) {
    return refuse({ reason: 'comment' });
  }

  // The column is an integer rather than a flag, so the value the game writes is
  // written back rather than a boolean being handed to a column that does not take
  // one.
  const open = input.open === undefined ? undefined : input.open ? 1 : 0;

  try {
    const rows = await database()`
      update clans
      set
        name = coalesce(${name ?? null}, clans.name),
        comment = coalesce(${comment ?? null}, clans.comment),
        notice = coalesce(${notice ?? null}, clans.notice),
        notice_at = case
          when ${notice ?? null} is null then clans.notice_at
          else now()
        end,
        open = coalesce(${open ?? null}, clans.open)
      where id = ${clanIdentifier}
      returning id
    `;

    if (rows.length === 0) {
      return refuse({ reason: 'unknown-clan' });
    }
  } catch (error) {
    // The name is indexed unique, so a rename onto a name already taken is a
    // violation the database would rather raise than have two clans answer to one
    // name in the client. It is reported as a refusal with a sentence, rather than
    // as a fault, because nothing is wrong: the operator asked for a name that is
    // spoken for.
    if (isUniqueViolation(error)) {
      return refuse({ reason: 'name-taken' });
    }

    throw error;
  }

  return { ok: true, value: { id: clanIdentifier } };
}

/**
 * Removes a clan, and with it the roster and the applications waiting on it.
 *
 * The four statements run in one transaction, and they have to. `clans.leader_id`,
 * `notice_writer_id` and `emblem_editor_id` are foreign keys into `clans_members`,
 * and `clans_members.clan_id` is a foreign key back into `clans`, so the two tables
 * point at each other and neither may be emptied while the other still holds the
 * row. The clan's own pointers are cleared first, which is what breaks the circle:
 * after that the roster is a child of a clan that no longer names anybody in it.
 *
 * The counts come back from the same transaction rather than from a read afterwards,
 * because a read afterwards counts nothing — the rows it would count are the rows
 * just deleted. The operator cannot otherwise see what the button did: removing a
 * clan looks like one line leaving a list, and the roster going with it is forty
 * people leaving theirs.
 *
 * The four results are typed as rows rather than as rows of a shape, because only
 * their number is used; naming a column the statements do not select would be a
 * claim about them that nothing checks.
 */
export async function removeClan(
  clanIdentifier: number,
): Promise<ClanOutcome<{ id: number; members: number; applications: number }>> {
  const [, applications, members, removed] = await database().transaction([
    database()`
      update clans
      set leader_id = null, notice_writer_id = null, emblem_editor_id = null
      where id = ${clanIdentifier}
      returning id
    `,
    database()`
      delete from clan_applications
      where clan_id = ${clanIdentifier}
      returning id
    `,
    database()`
      delete from clans_members
      where clan_id = ${clanIdentifier}
      returning id
    `,
    database()`
      delete from clans
      where id = ${clanIdentifier}
      returning id
    `,
  ]) as [unknown[], unknown[], unknown[], unknown[]];

  // The last statement is the one that proves the clan was there: the first only
  // clears pointers, which succeeds for a clan that is already gone and then leaves
  // nothing to say a refusal was owed.
  if (removed.length === 0) {
    return refuse({ reason: 'unknown-clan' });
  }

  return {
    ok: true,
    value: {
      id: clanIdentifier,
      members: members.length,
      applications: applications.length,
    },
  };
}
