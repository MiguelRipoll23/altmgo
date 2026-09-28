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
  signedInAs = null;
}

/**
 * What the last sign-in answered about the address, and when it was asked.
 *
 * It is a variable in this module and not a second entry in localStorage, on
 * purpose. The sign-in's answer is about the moment it happened — "your game is
 * discoverable *now*", which a tile shows for fifteen seconds and then stops — so
 * keeping it across a reload would show a reader the state of a sign-in that
 * happened an hour ago, and keeping it anywhere durable would be the same
 * staleness the token's own display-name claim had. Reloading the page is
 * precisely a reader saying they are no longer looking at the moment they arrived
 * at, and losing this with it is the behaviour rather than a limitation.
 */
let signedInAs: { discoverable: boolean; at: number } | null = null;

/** Records what a sign-in answered about the account's published address. */
export function rememberSignIn(discoverable: boolean): void {
  signedInAs = { discoverable, at: Date.now() };
}

/**
 * How many seconds of the window a reader who has just signed in has left, or
 * nothing when there is no window to count down.
 *
 * Nothing comes back for an account the sign-in said was not discoverable, and
 * nothing comes back once the window has passed — so a tile that asks can go on
 * asking without having to decide when to stop.
 */
export function discoverableSecondsLeft(windowSeconds: number): number | null {
  if (signedInAs === null || !signedInAs.discoverable) {
    return null;
  }

  const left = windowSeconds - Math.floor((Date.now() - signedInAs.at) / 1000);

  return left > 0 ? left : null;
}
