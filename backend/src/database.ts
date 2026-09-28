import { neon } from '@neondatabase/serverless';
import { readEnvironment } from './environment.js';

/**
 * The client every query runs through. Neon's HTTP driver is a plain fetch, so
 * nothing has to be opened or drained per request — which is what makes it safe
 * to keep one for the lifetime of the function instance.
 */
function createClient() {
  return neon(readEnvironment().databaseUrl);
}

let cached: ReturnType<typeof createClient> | undefined;

/** Returns the client, creating it on first use. */
export function database() {
  cached ??= createClient();
  return cached;
}

/**
 * The client's raw-SQL escape hatch, for the one place a query cannot be written
 * with bind parameters alone: an `order by` clause, which takes none.
 *
 * Only ever called with a literal from this repository. A caller cannot reach it
 * with anything a request carried, because every ordering is chosen from a fixed
 * set before it gets here.
 */
export function raw(rawSql: string) {
  return database().unsafe(rawSql);
}

/** Whether an error is the unique-violation the account table raises on a taken name. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
