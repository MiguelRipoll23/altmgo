import { database } from './database.js';
import { isKnownRole, ManagerRole } from './roles.js';

/**
 * The writes a manager makes on the server's behalf: granting and revoking a staff
 * role, publishing a news item, and sending a game master mail.
 *
 * The lengths are the ones the columns declare, checked here rather than left to
 * the database. Postgres would refuse a longer value with a message about a
 * character varying column, which is a worse sentence to hand an operator than one
 * that says which field was too long, and the dashboard cannot show a field that is
 * too long without a refusal to read.
 */

/** Longest news title the column stores. */
const MaximumNewsTitleLength = 128;

/** Longest mail subject the column stores. */
const MaximumMailSubjectLength = 128;

/** Longest mail body the column stores. */
const MaximumMailBodyLength = 708;

/** Longest sender name the column stores. */
const MaximumSenderNameLength = 16;

/** Why a write was refused, in terms the dashboard can show as they are. */
export type StaffRefusal =
  | { reason: 'unknown-account' }
  | { reason: 'unknown-role' }
  | { reason: 'role-held' }
  | { reason: 'role-not-held' }
  | { reason: 'last-manager' }
  | { reason: 'title' }
  | { reason: 'body' }
  | { reason: 'sender' }
  | { reason: 'unknown-news' };

/** The outcome of one manager write: what changed, or why it could not. */
export type StaffOutcome<T> = { ok: true; value: T } | { ok: false; refusal: StaffRefusal };

/** Refuses a write with the reason, so every caller reports refusals the same way. */
function refuse<T>(refusal: StaffRefusal): StaffOutcome<T> {
  return { ok: false, refusal };
}

/** Whether an account exists, which every role write needs to know before it acts. */
async function accountExists(accountIdentifier: number): Promise<boolean> {
  const rows = await database()`
    select 1
    from accounts
    where id = ${accountIdentifier}
  `;

  return rows.length > 0;
}

/** Grants a staff role to an account. */
export async function grantRole(
  accountIdentifier: number,
  role: string,
): Promise<StaffOutcome<{ accountId: number; role: string }>> {
  if (!isKnownRole(role)) {
    return refuse({ reason: 'unknown-role' });
  }

  if (!(await accountExists(accountIdentifier))) {
    return refuse({ reason: 'unknown-account' });
  }

  // Granting a role the account already holds is refused rather than ignored: the
  // key is the pair, so the insert would raise a unique violation and turn a
  // harmless repeat into an error the operator has to read twice to understand.
  const held = await database()`
    select 1
    from account_roles
    where account_id = ${accountIdentifier} and role = ${role}
  `;

  if (held.length > 0) {
    return refuse({ reason: 'role-held' });
  }

  await database()`
    insert into account_roles (account_id, role)
    values (${accountIdentifier}, ${role})
  `;

  return { ok: true, value: { accountId: accountIdentifier, role } };
}

/**
 * Revokes a staff role from an account.
 *
 * The last manager cannot be demoted. Every manager-only action on this dashboard —
 * the roles page itself, the Discord composer, the news and mail below — is refused
 * to whoever holds no manager role, so removing the final one would lock the
 * deployment out of its own administration with nothing left to grant it back
 * through. The guard counts the managers before it removes one, which is why it
 * refuses on a count of one rather than on the account being the only staff.
 */
export async function revokeRole(
  accountIdentifier: number,
  role: string,
): Promise<StaffOutcome<{ accountId: number; role: string }>> {
  if (!isKnownRole(role)) {
    return refuse({ reason: 'unknown-role' });
  }

  const held = await database()`
    select 1
    from account_roles
    where account_id = ${accountIdentifier} and role = ${role}
  `;

  if (held.length === 0) {
    return refuse({ reason: 'role-not-held' });
  }

  if (role === ManagerRole) {
    const managers = await database()`
      select count(*)::bigint as total
      from account_roles
      where role = ${ManagerRole}
    `;

    if (Number(managers[0]?.total ?? 0) <= 1) {
      return refuse({ reason: 'last-manager' });
    }
  }

  await database()`
    delete from account_roles
    where account_id = ${accountIdentifier} and role = ${role}
  `;

  return { ok: true, value: { accountId: accountIdentifier, role } };
}

/**
 * Publishes a news item.
 *
 * The timestamp is written rather than left to a default because `news.time` has
 * none: the column is not nullable and nothing generates it, so an insert that
 * omitted it would fail rather than record when the item was published.
 */
export async function publishNews(input: {
  title: string;
  body: string;
  important: boolean;
}): Promise<StaffOutcome<{ id: number }>> {
  const title = input.title.trim();

  if (title.length === 0 || title.length > MaximumNewsTitleLength) {
    return refuse({ reason: 'title' });
  }

  const body = input.body.trim();

  if (body.length === 0) {
    return refuse({ reason: 'body' });
  }

  const rows = await database()`
    insert into news (title, body, important, time)
    values (${title}, ${body}, ${input.important}, now())
    returning id
  `;

  return { ok: true, value: { id: Number(rows[0]?.id ?? 0) } };
}

/** Withdraws a news item. */
export async function removeNews(newsIdentifier: number): Promise<StaffOutcome<{ id: number }>> {
  const rows = await database()`
    delete from news
    where id = ${newsIdentifier}
    returning id
  `;

  if (rows.length === 0) {
    return refuse({ reason: 'unknown-news' });
  }

  return { ok: true, value: { id: newsIdentifier } };
}

/**
 * Sends a game master mail to every character's inbox.
 *
 * The sender name is the figure a player sees in the inbox list, so it is length
 * checked like the subject rather than left to be whatever the deployment is called.
 * The sender character is left null: the mail is written by the server rather than
 * by a player, and the column allows that.
 */
export async function sendGameMasterMail(input: {
  subject: string;
  body: string;
  senderName: string;
}): Promise<StaffOutcome<{ id: number }>> {
  const subject = input.subject.trim();

  if (subject.length === 0 || subject.length > MaximumMailSubjectLength) {
    return refuse({ reason: 'title' });
  }

  const body = input.body.trim();

  if (body.length === 0 || body.length > MaximumMailBodyLength) {
    return refuse({ reason: 'body' });
  }

  const senderName = input.senderName.trim();

  if (senderName.length === 0 || senderName.length > MaximumSenderNameLength) {
    return refuse({ reason: 'sender' });
  }

  const rows = await database()`
    insert into game_master_mail (subject, body, sender_name, sent_at)
    values (${subject}, ${body}, ${senderName}, now())
    returning id
  `;

  return { ok: true, value: { id: Number(rows[0]?.id ?? 0) } };
}
