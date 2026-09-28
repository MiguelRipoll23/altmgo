import { createHash } from 'node:crypto';
import { sign, verify } from 'hono/jwt';
import type { MiddlewareHandler } from 'hono';
import { readEnvironment } from './environment';

/** Variables a request carries once it has been authenticated. */
export type AppBindings = {
  Variables: {
    accountIdentifier: number;
    accountName: string;
  };
};

/** Days a session token stays valid. */
const SessionDays = 7;

/**
 * The one algorithm a token may be signed with. It is named on both sides
 * deliberately: a verifier that trusts the token to say how it was signed is the
 * algorithm-confusion hole, and the game server's own handler names it too.
 */
const SessionAlgorithm = 'HS256';

/**
 * Hashes a password the way the game client does, so an account registered here
 * signs in in game and an account made in game signs in here. The client sends
 * the digest rather than the password, so the digest is what the row holds and
 * the comparison never has the clear text to make.
 */
export function hashPassword(password: string): string {
  return createHash('md5').update(password, 'utf8').digest('hex');
}

/**
 * Issues the bearer token a signed-in browser sends back. It is signed with the
 * same secret the game server uses, which is what lets a token be checked
 * without a session table, and is also why the secret must not be published.
 */
export function issueSessionToken(accountIdentifier: number, accountName: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SessionDays * 24 * 60 * 60;

  return sign(
    { sub: String(accountIdentifier), name: accountName, exp: expiresAt },
    readEnvironment().jwtSecret,
    SessionAlgorithm,
  );
}

/** Rejects a request that carries no valid token, and records who sent it. */
export const requireAccount: MiddlewareHandler<AppBindings> = async (context, next) => {
  const header = context.req.header('authorization');
  const token = header?.toLowerCase().startsWith('bearer ') ? header.slice('bearer '.length).trim() : undefined;

  if (!token) {
    return context.json({ error: 'Sign in to continue.' }, 401);
  }

  try {
    const payload = await verify(token, readEnvironment().jwtSecret, SessionAlgorithm);
    const identifier = Number(payload.sub);

    if (!Number.isInteger(identifier) || identifier <= 0) {
      return context.json({ error: 'Sign in to continue.' }, 401);
    }

    context.set('accountIdentifier', identifier);
    context.set('accountName', typeof payload.name === 'string' ? payload.name : '');
  } catch {
    return context.json({ error: 'Your session has expired. Sign in again.' }, 401);
  }

  await next();
};
