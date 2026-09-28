import { database } from './database';

/** An account row, as the login and registration paths read it. */
export type AccountRow = {
  id: number;
  display_name: string;
  password: string;
};

/** Finds the account with a given login name. */
export async function findAccountByName(displayName: string): Promise<AccountRow | undefined> {
  const rows = await database()`
    select id, display_name, password
    from accounts
    where display_name = ${displayName}
    limit 1
  `;

  return rows[0] as AccountRow | undefined;
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
