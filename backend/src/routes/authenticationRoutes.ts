import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../authentication.js';
import { hashPassword, issueSessionToken } from '../authentication.js';
import { createAccount, findAccountByName } from '../accounts.js';
import { readClientAddress } from '../clientAddress.js';
import { isUniqueViolation } from '../database.js';
import { publishAccountAddress } from '../publicAddresses.js';

export const authenticationRoutes = new Hono<AppBindings>();

/** Username shape the account table and the registration endpoint both accept. */
const DisplayNamePattern = /^[a-zA-Z0-9_-]+$/;

const MinimumDisplayNameLength = 3;
const MaximumDisplayNameLength = 32;
const MinimumPasswordLength = 6;
const MaximumPasswordLength = 128;

/** Credentials a request carried, once they have been found usable. */
type Credentials = {
  displayName: string;
  password: string;
};

/** Reads a JSON body, or nothing when the request does not carry one. */
async function readBody(context: Context): Promise<Record<string, unknown> | undefined> {
  return (await context.req.json().catch(() => undefined)) as Record<string, unknown> | undefined;
}

/**
 * Reads the credentials out of a body, or names the first reason they cannot be
 * used. The rules are the registration endpoint's, because the row it writes is
 * the game's own account row.
 */
function readCredentials(body: Record<string, unknown> | undefined): Credentials | { error: string } {
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : undefined;
  const password = body?.password;

  if (displayName === undefined || typeof password !== 'string') {
    return { error: 'A username and a password are required.' };
  }

  if (
    displayName.length < MinimumDisplayNameLength ||
    displayName.length > MaximumDisplayNameLength ||
    !DisplayNamePattern.test(displayName)
  ) {
    return {
      error: `The username must be ${MinimumDisplayNameLength} to ${MaximumDisplayNameLength} characters, letters, digits, _ and - only.`,
    };
  }

  if (password.length < MinimumPasswordLength || password.length > MaximumPasswordLength) {
    return {
      error: `The password must be ${MinimumPasswordLength} to ${MaximumPasswordLength} characters.`,
    };
  }

  return { displayName, password };
}

/**
 * Creates an account. It is the same row the game logs in against: the password
 * is stored as the digest the client sends, so signing in here and signing in in
 * game are the same credentials and neither has to know about the other.
 */
authenticationRoutes.post('/auth/register', async (context) => {
  const credentials = readCredentials(await readBody(context));
  if ('error' in credentials) {
    return context.json({ error: credentials.error }, 400);
  }

  try {
    const account = await createAccount(
      credentials.displayName,
      hashPassword(credentials.password),
    );

    return context.json({ account: { id: account.id, displayName: account.display_name } }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return context.json({ error: 'That username is already taken.' }, 409);
    }

    throw error;
  }
});

/** Signs in, answering with the bearer token every other route takes. */
authenticationRoutes.post('/auth/login', async (context) => {
  const credentials = readCredentials(await readBody(context));
  if ('error' in credentials) {
    return context.json({ error: credentials.error }, 400);
  }

  const account = await findAccountByName(credentials.displayName);

  // One message for both halves: which of the two was wrong is not the caller's
  // to learn here.
  if (!account || account.password !== hashPassword(credentials.password)) {
    return context.json({ error: 'That username and password do not match an account.' }, 401);
  }

  /*
   * Signing in is what makes a game joinable, so this is where the caller's
   * address is written: the host is already on the page, the request already
   * carries the address they are at, and a host who has to remember a button to
   * host for other people is a host whose game stays unreachable.
   *
   * The address is the one the request arrived from and the characters are the
   * account's own, so the token is the whole permission. An IPv6 visitor has
   * nowhere to publish — the game stores the address in a sixteen-byte field — and
   * that is not worth refusing a sign-in over: they are signed in either way, and
   * the tile will offer them the button rather than claim a game is discoverable
   * when it is not.
   */
  const token = await issueSessionToken(account.id, account.display_name);
  const address = readClientAddress(context);

  if (!address) {
    return context.json({ token, discoverable: false });
  }

  const outcome = await publishAccountAddress(account.id, address);

  return context.json({
    token,
    /*
     * True when the account has a character for a game to be reached on at all.
     * That is the question the page is really asking when it offers the tile a
     * "Discoverable" state rather than a button: not "did a write happen" — a
     * second sign-in in the same day writes nothing and is still perfectly
     * discoverable — but "is there an endpoint here", which is the thing a
     * player whose friends cannot connect cares about.
     */
    discoverable: outcome.connections > 0,
  });
});
