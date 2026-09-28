import { database } from './database.js';

/**
 * The staff roles an account can hold. They are names rather than a ladder of
 * integers, because the alternative is every reader having to agree what each
 * number meant — which is the thing that made the single `accounts.role` column
 * impossible to read without a lookup table nobody had written down.
 *
 * A manager holds every permission a moderator holds. That is a deliberate
 * choice: a manager is somebody who has been trusted with the moderation work
 * as well, so making them re-approve the same actions in a second role would be
 * ceremony rather than safety. The two names are checked for separately
 * wherever the distinction is the point — the UI shows which one an account
 * holds, and granting one does not grant the other.
 */
export const ModeratorRole = 'moderator';
export const ManagerRole = 'manager';

/** Every role this deployment understands, in the order the dashboard lists them. */
export const KnownRoles = [ModeratorRole, ManagerRole] as const;

/** A role name, once it has been checked against {@link KnownRoles}. */
export type StaffRole = (typeof KnownRoles)[number];

/** Whether a name is one of the roles this deployment understands. */
export function isKnownRole(name: string): name is StaffRole {
  return (KnownRoles as readonly string[]).includes(name);
}

/**
 * Reads the roles one account holds. An account with no row is a player, which
 * is the same answer as a row whose name is not a role this deployment knows:
 * neither grants anything.
 *
 * Roles are read from the database on every sign-in rather than trusted from
 * the token, so revoking somebody takes effect the next time they sign in
 * rather than whenever their token happens to expire.
 */
export async function listRolesOfAccount(accountIdentifier: number): Promise<StaffRole[]> {
  const rows = await database()`
    select role
    from account_roles
    where account_id = ${accountIdentifier}
  `;

  return rows.map((row) => String(row.role)).filter(isKnownRole);
}

/** Whether the roles include one specific role. */
export function holdsRole(roles: readonly string[], role: StaffRole): boolean {
  return roles.includes(role);
}

/** Whether the roles grant the moderator permissions, which a manager also does. */
export function isModerator(roles: readonly string[]): boolean {
  return holdsRole(roles, ModeratorRole) || holdsRole(roles, ManagerRole);
}

/** Whether the roles grant the manager permissions. */
export function isManager(roles: readonly string[]): boolean {
  return holdsRole(roles, ManagerRole);
}
