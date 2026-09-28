import { database, isUniqueViolation } from './database.js';

/**
 * The prefix a character's name carries when the deployment put it there rather
 * than a player choosing it. The dedicated match rooms are named `server-<n>` by
 * the gameplay server, and a moderator needs to be able to put one of those on
 * a team without a client sitting at the other end of the room to join from.
 */
export const ServerCharacterPrefix = 'server-';

/** The account the server characters belong to, which nobody signs in to. */
export const ServerAccountName = 'server';

/**
 * How many server characters there are to be.
 *
 * The pool is a fixed set of names rather than an open-ended creation, because
 * every one of them is a character row the game server will meet in a match:
 * a character created without a name anybody is going to ask for is a row that
 * costs a slot and appears nowhere. Sixteen is the size of a full field of
 * eight-a-side with a substitute for each side.
 */
export const ServerCharacterLimit = 16;

/** How long a character's name may be, which is the column's own limit. */
const MaximumNameLength = 16;

/** Why a provisioning write was refused, in terms the dashboard can show. */
export type ServerCharacterRefusal = 'pool-full' | 'unknown-account' | 'name-taken' | 'unknown-team';

/** The outcome of a provisioning write: what it produced, or why it could not. */
export type ServerCharacterOutcome<T> = { ok: true; value: T } | { ok: false; refusal: ServerCharacterRefusal };

/** One server character and the team it is on, if any. */
export type ServerCharacterRow = {
  id: number;
  name: string;
  team_id: number | null;
  team_name: string | null;
};

/**
 * The name the nth server character carries, or nothing when the index is
 * outside the pool.
 *
 * The number is zero-padded so the names sort in the order they were created in
 * as text: without it `server-10` sorts before `server-2` and a list of them
 * reads as though it were scrambled.
 */
export function serverCharacterName(index: number): string | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= ServerCharacterLimit) {
    return undefined;
  }

  return `${ServerCharacterPrefix}${String(index + 1).padStart(2, '0')}`;
}

/**
 * Reads the account the server characters belong to.
 *
 * It is looked up rather than created: the account is the game server's own, and
 * a deployment whose game server has not made it yet is a deployment whose
 * characters would have nothing to hang from. That is reported rather than
 * papered over with an account the game server would never read.
 */
async function findServerAccount(): Promise<number | undefined> {
  const rows = await database()`
    select id from accounts where display_name = ${ServerAccountName} limit 1
  `;

  return (rows[0] as { id: number } | undefined)?.id;
}

/**
 * Every server character that exists, with the team each is on.
 *
 * The roster is read rather than assumed, because the game server creates these
 * characters itself when a match room is opened: a name in the pool that is
 * already here is a character the game knows about, and making a second one
 * under the same name would be refused by the name index.
 */
export async function listServerCharacters(): Promise<ServerCharacterRow[]> {
  const rows = await database()`
    select
      character.id,
      character.name,
      member.team_id,
      team.name as team_name
    from characters character
    left join event_team_members member on member.character_id = character.id
    left join event_teams team on team.id = member.team_id
    where character.name like ${`${ServerCharacterPrefix}%`}
    order by character.name
  `;

  return rows as ServerCharacterRow[];
}

/**
 * Creates the server characters that are missing, up to `wanted` of them.
 *
 * This is the on-demand half of the pool: a moderator asking for six server
 * characters gets six, and the ten that follow are made when they are asked
 * for. Every name in the pool is walked, because a gap in the middle of the set
 * is a name that would otherwise be handed to a second character the next time
 * the pool is extended.
 *
 * A name the game server already took is skipped rather than refused: the row is
 * there, which is all the caller asked for.
 */
export async function ensureServerCharacters(
  wanted: number,
): Promise<ServerCharacterOutcome<{ names: string[]; created: string[] }>> {
  const target = Math.min(Math.max(wanted, 0), ServerCharacterLimit);
  if (target === 0) {
    return { ok: true, value: { names: [], created: [] } };
  }

  const accountIdentifier = await findServerAccount();
  if (accountIdentifier === undefined) {
    return { ok: false, refusal: 'unknown-account' };
  }

  const existing = new Set((await listServerCharacters()).map((row) => row.name));
  const created: string[] = [];
  const names: string[] = [];

  for (let index = 0; index < ServerCharacterLimit; index += 1) {
    const name = serverCharacterName(index);
    if (name === undefined || names.length >= target) {
      continue;
    }

    names.push(name);

    if (existing.has(name)) {
      continue;
    }

    const inserted = await insertServerCharacter(accountIdentifier, name);
    if (inserted) {
      created.push(name);
    }
  }

  return { ok: true, value: { names, created } };
}

/**
 * Writes one server character, or reports that the name is taken.
 *
 * The account's slots are raised before the insert rather than checked: the
 * characters are not players and are never created by signing in, so a slot
 * count that would refuse them is a limit on a thing that does not apply here.
 * The name index is still the authority on the name, which is why the unique
 * violation is caught rather than pre-checked.
 */
async function insertServerCharacter(accountIdentifier: number, name: string): Promise<boolean> {
  try {
    await database()`
      update accounts set slots = greatest(slots, ${ServerCharacterLimit}) where id = ${accountIdentifier}
    `;

    await database()`
      insert into characters (account_id, name, rank, comment, experience, total_rewards, created_at, active)
      values (${accountIdentifier}, ${name}, 0, '', 0, 0, now(), true)
    `;

    return true;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return false;
    }

    throw error;
  }
}

/**
 * Moves a server character onto a team, or off every team when none is named.
 *
 * Moving rather than adding is the point: a server character fills a slot on one
 * team at a time, so putting one on a second team has to take it off the first.
 * The row is deleted and rewritten in a single statement so a reader never sees
 * the character on both teams, even briefly.
 */
export async function assignServerCharacter(
  characterIdentifier: number,
  teamIdentifier: number | undefined,
): Promise<ServerCharacterOutcome<{ characterId: number; teamId: number | null }>> {
  const characters = await database()`
    select id, name, experience
    from characters
    where id = ${characterIdentifier} and name like ${`${ServerCharacterPrefix}%`} and active
    limit 1
  `;

  const character = characters[0] as { id: number; name: string; experience: number } | undefined;
  if (!character) {
    return { ok: false, refusal: 'unknown-team' };
  }

  let slot = 0;

  if (teamIdentifier !== undefined) {
    const teams = await database()`
      select id from event_teams where id = ${teamIdentifier} limit 1
    `;

    if (!teams[0]) {
      return { ok: false, refusal: 'unknown-team' };
    }

    const roster = await database()`
      select slot from event_team_members where team_id = ${teamIdentifier} order by slot
    `;

    const taken = new Set((roster as { slot: number }[]).map((row) => row.slot));
    slot = -1;
    for (let candidate = 0; candidate < 8; candidate += 1) {
      if (!taken.has(candidate)) {
        slot = candidate;
        break;
      }
    }

    if (slot < 0) {
      return { ok: false, refusal: 'unknown-team' };
    }
  }

  await database()`
    delete from event_team_members where character_id = ${characterIdentifier}
  `;

  if (teamIdentifier !== undefined && slot >= 0) {
    await database()`
      insert into event_team_members (team_id, slot, character_id, name, state, experience)
      values (${teamIdentifier}, ${slot}, ${characterIdentifier}, ${character.name}, 1, ${character.experience})
    `;
  }

  return { ok: true, value: { characterId: characterIdentifier, teamId: teamIdentifier ?? null } };
}

/** The longest server character name, which is the column's own limit. */
export { MaximumNameLength as ServerCharacterNameLimit };
