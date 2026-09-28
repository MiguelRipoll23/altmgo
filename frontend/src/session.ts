/**
 * Where the session token lives between visits. It is a bearer token with no
 * cookie behind it, so it cannot be marked httpOnly, and localStorage is the
 * only place a page can keep one across reloads.
 */
const storageKey = 'altmgo.session';

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
}
