/**
 * Where the session token lives between visits. It is a bearer token with no
 * cookie behind it, so it cannot be marked httpOnly, and localStorage is the
 * only place a page can keep one across reloads.
 */
const storageKey = 'altmgo.session';
const rolesKey = 'altmgo.roles';
const accountKey = 'altmgo.account';

/** The staff roles a signed-in account holds. */
export type StaffRole = 'moderator' | 'manager';

/** Returns the stored token, or nothing when nobody is signed in. */
export function readSessionToken(): string | undefined {
  return window.localStorage.getItem(storageKey) ?? undefined;
}

/** Stores the token a sign-in answered with. */
export function writeSessionToken(token: string): void {
  window.localStorage.setItem(storageKey, token);
}

/** Forgets the token, signing the browser out. */
export function clearSessionToken(): void {
  window.localStorage.removeItem(storageKey);
  window.localStorage.removeItem(rolesKey);
  window.sessionStorage.removeItem(accountKey);
}

/**
 * Stores the name the sign-in answered with, so the layout can say who is
 * signed in before any request has run.
 *
 * It is a display name and nothing else. The token is the only thing that
 * authorises a request, and every route reads the account from the token rather
 * than from here, so a name edited in the browser changes one heading and
 * nothing an account may do.
 */
export function writeSessionAccount(displayName: string): void {
  window.sessionStorage.setItem(accountKey, displayName);
}

/** The name stored at the last sign-in, or a placeholder when there was none. */
export function readSessionAccount(): string {
  return window.sessionStorage.getItem(accountKey) ?? 'your account';
}

/**
 * Stores the roles the sign-in answered with, so the sidebar can show the
 * sections this account may open without a first call to find out.
 *
 * They are a hint and nothing more. Every route reads the roles again, so an
 * account that was demoted after signing in keeps seeing a section until a
 * request is refused — and a role list edited in the browser opens nothing,
 * because the answer to that request is the one that counts.
 */
export function writeSessionRoles(roles: readonly string[]): void {
  window.localStorage.setItem(rolesKey, JSON.stringify(roles));
}

/** The roles stored at the last sign-in, which is empty when there were none. */
export function readSessionRoles(): StaffRole[] {
  const stored = window.localStorage.getItem(rolesKey);

  if (!stored) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed.filter((role): role is StaffRole => role === 'moderator' || role === 'manager') : [];
  } catch {
    return [];
  }
}

/** Whether the stored roles include the moderator permissions, which a manager also has. */
export function isModerator(roles: readonly string[]): boolean {
  return roles.includes('moderator') || roles.includes('manager');
}

/** Whether the stored roles include the manager permissions. */
export function isManager(roles: readonly string[]): boolean {
  return roles.includes('manager');
}
