import { neon } from '@neondatabase/serverless';
import { readEnvironment } from './environment';

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

/** Whether an error is the unique-violation the account table raises on a taken name. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
