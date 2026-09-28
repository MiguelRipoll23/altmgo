import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../authentication.js';
import { hashPassword, issueSessionToken } from '../authentication.js';
import { createAccount, findAccountByName } from '../accounts.js';
import { isUniqueViolation } from '../database.js';

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

  // The token is the whole answer. Nothing else about the session is worth
  // carrying: the dashboard asks the server who it is whenever it needs to know,
  // and a second copy of anything here would be one that can go stale.
  return context.json({ token: await issueSessionToken(account.id, account.display_name) });
});
