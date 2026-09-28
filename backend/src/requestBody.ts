import type { Context } from 'hono';
import type { AppBindings } from './authentication.js';

/**
 * The readers every route that takes a JSON body uses.
 *
 * A request body is `unknown` until it has been looked at, and each of these answers
 * the only question a route ever asks of it: is this field present, and is it the
 * shape the route needs? None of them coerces, because a field that arrived as the
 * wrong type is a caller error rather than something to guess at — `"4"` is not a
 * team identifier, and reading it as one would let a mode nobody plays reach the
 * event subsystem.
 */

/** Reads a JSON body, or nothing when the request does not carry one. */
export async function readBody(context: Context<AppBindings>): Promise<Record<string, unknown>> {
  return ((await context.req.json().catch(() => undefined)) ?? {}) as Record<string, unknown>;
}

/** Reads a string field, or nothing when it is absent or not a string. */
export function readText(body: Record<string, unknown>, name: string): string | undefined {
  return typeof body[name] === 'string' ? (body[name] as string) : undefined;
}

/** Reads a whole-number field, or nothing when it is absent or not one. */
export function readInteger(body: Record<string, unknown>, name: string): number | undefined {
  const value = body[name];

  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

/** Reads a boolean field, or nothing when it is absent or not one. */
export function readBoolean(body: Record<string, unknown>, name: string): boolean | undefined {
  return typeof body[name] === 'boolean' ? (body[name] as boolean) : undefined;
}
