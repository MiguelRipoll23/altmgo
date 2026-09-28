import { createHash } from 'node:crypto';
import { sign, verify } from 'hono/jwt';
import type { Context, MiddlewareHandler } from 'hono';
import { readEnvironment } from './environment.js';
import { isManager, isModerator, listRolesOfAccount } from './roles.js';

/** Variables a request carries once it has been authenticated. */
export type AppBindings = {
  Variables: {
    accountIdentifier: number;
    accountName: string;
    accountRoles: string[];
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
 * Issues the bearer token a signed-in browser sends back. It is signed with a
 * secret only this deployment holds, which is what lets a token be checked
 * without a session table, and is also why the secret must not be published.
 * Nothing outside this app verifies these tokens.
 *
 * The token names the account and nothing else about its permissions: the roles
 * are read from the database on every request, so a revoked role stops working
 * immediately rather than whenever the token it was minted into happens to
 * expire. A role written into the token would be a claim the account could keep
 * presenting for a week after being demoted.
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
    context.set('accountRoles', await listRolesOfAccount(identifier));
  } catch {
    return context.json({ error: 'Your session has expired. Sign in again.' }, 401);
  }

  await next();
};

/**
 * Rejects a request from somebody who is not staff, naming the one role that
 * would have opened it.
 *
 * A signed-in player who reaches a moderator route is answered 403 rather than
 * 404: the route exists and the token was good, so there is nothing to hide, and
 * a player who has been demoted deserves to be told that rather than left
 * wondering why the page 404s.
 */
function requireRole(allowed: (roles: readonly string[]) => boolean, role: string): MiddlewareHandler<AppBindings> {
  return async (context: Context<AppBindings>, next) => {
    if (!allowed(context.get('accountRoles'))) {
      return context.json({ error: `This action needs the ${role} role.` }, 403);
    }

    await next();
  };
}

/**
 * Requires the moderator permissions, which a manager also holds: creating a
 * team, adding a player to one, changing a player's state and scheduling an
 * event.
 */
export const requireModerator: MiddlewareHandler<AppBindings> = requireRole(isModerator, 'moderator');

/**
 * Requires the manager permissions, which a moderator does not hold: the
 * actions that reach outside the game, such as writing a Discord message.
 */
export const requireManager: MiddlewareHandler<AppBindings> = requireRole(isManager, 'manager');
