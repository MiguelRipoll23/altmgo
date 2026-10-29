import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import { readEnvironment } from './environment.js';

/**
 * One row as either driver answers it. The queries are written against this
 * shape, which is the one both Neon's HTTP driver and node-postgres produce.
 */
type Row = Record<string, unknown>;

/**
 * A trusted SQL fragment, spliced into a query rather than bound as a value.
 * node-postgres has no equivalent of Neon's `UnsafeRawSql`, so this marker is
 * what lets the adapted client tell the two apart.
 */
class RawSql {
  readonly sql: string;

  constructor(sql: string) {
    this.sql = sql;
  }
}

/**
 * The small surface every query in this folder uses: the driver as a tagged
 * template, and its raw-SQL escape hatch. `unsafe` returns a fragment that the
 * tagged template splices, which is how an `order by` clause reaches the query.
 */
type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]>;
  unsafe(rawSql: string): unknown;
};

/**
 * Neon's serverless driver speaks Neon's HTTP protocol, which is what makes it
 * right for a function invocation. A long-lived container talking to an
 * ordinary Postgres — the game's own database in the cluster — needs the wire
 * protocol instead, so the URL decides which client is built.
 */
function isNeon(databaseUrl: string): boolean {
  try {
    return new URL(databaseUrl).hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
}

/** Builds the Neon client, adapted to {@link SqlClient}. */
function createNeonClient(databaseUrl: string): SqlClient {
  const sql = neon(databaseUrl);

  const client = ((strings: TemplateStringsArray, ...values: unknown[]) =>
    sql(strings, ...values)) as unknown as SqlClient;

  client.unsafe = (rawSql: string) => sql.unsafe(rawSql);

  return client;
}

/**
 * Builds the node-postgres client, adapted to the same surface. The pool is
 * kept for the process's lifetime: a container serves many requests, and
 * opening a connection per query would be the expensive half of every read.
 */
function createPostgresClient(databaseUrl: string): SqlClient {
  const pool = new Pool({ connectionString: databaseUrl });

  const client = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    // Neon and node-postgres both number their placeholders `$1`, `$2`, ...
    // The difference is a raw fragment: Neon's driver recognises its own, and
    // here the marker is spliced into the text instead of being bound.
    const parameters: unknown[] = [];
    let text = strings[0] ?? '';

    for (const [index, value] of values.entries()) {
      if (value instanceof RawSql) {
        text += value.sql;
      } else {
        parameters.push(value);
        text += `$${parameters.length}`;
      }

      text += strings[index + 1] ?? '';
    }

    const result = await pool.query(text, parameters);

    return result.rows as Row[];
  }) as SqlClient;

  client.unsafe = (rawSql: string) => new RawSql(rawSql);

  return client;
}

let cached: SqlClient | undefined;

/** Returns the client, creating it on first use. */
export function database(): SqlClient {
  if (!cached) {
    const { databaseUrl } = readEnvironment();
    cached = isNeon(databaseUrl)
      ? createNeonClient(databaseUrl)
      : createPostgresClient(databaseUrl);
  }

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
