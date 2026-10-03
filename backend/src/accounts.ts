import { database } from './database.js';

/** An account row, as the login and registration paths read it. */
export type AccountRow = {
  id: number;
  display_name: string;
  password: string;
};

/**
 * Finds the account with a given login name.
 *
 * The comparison is case-insensitive because a name is a word rather than an
 * identifier: somebody who types their name in the wrong case has still typed
 * their name, and refusing them over the capitalisation of a letter is a login
 * that works or does not depending on how carefully it was copied. The client
 * sends the name as typed, so the row keeps the casing it was registered with
 * and this is the only place the two are made equal.
 *
 * Both sides go through `lower` rather than relying on a case-insensitive
 * collation, because the collation is the database's own configuration and the
 * unique index on the column is built from the raw bytes: a name folded to lower
 * case still has to reach exactly the one row that holds it.
 */
export async function findAccountByName(displayName: string): Promise<AccountRow | undefined> {
  const rows = await database()`
    select id, display_name, password
    from accounts
    where lower(display_name) = lower(${displayName})
    limit 1
  `;

  return rows[0] as AccountRow | undefined;
}

/** An account as the signed-in reader is told about itself: no password. */
export type AccountSummary = {
  id: number;
  display_name: string;
};

/**
 * Finds the account with a given id, without its password.
 *
 * It is how the dashboard says who is signed in. The token carries a display name
 * as a claim, but that claim is a snapshot taken when the token was issued: a
 * player who renames keeps being greeted by the old name until their session
 * expires, and a token that outlives the name it holds is a worse answer than a
 * read of the row. It is also a snapshot the browser can see and edit, so using it
 * would mean two answers to who this is — one the server is using and one a heading
 * is printing.
 */
export async function findAccountById(
  accountIdentifier: number,
): Promise<AccountSummary | undefined> {
  const rows = await database()`
    select id, display_name
    from accounts
    where id = ${accountIdentifier}
    limit 1
  `;

  return rows[0] as AccountSummary | undefined;
}

/**
 * Creates an account. The name is unique in the table, so a name taken between
 * the check and the insert is the database's refusal to answer, and the caller
 * turns the unique violation into the same conflict it would have reported.
 */
export async function createAccount(displayName: string, passwordHash: string): Promise<AccountRow> {
  const rows = await database()`
    insert into accounts (display_name, password)
    values (${displayName}, ${passwordHash})
    returning id, display_name, password
  `;

  return rows[0] as AccountRow;
}
