import { database } from './database.js';

/**
 * The mail a player reads, as their inbox shows it.
 *
 * It is a module of its own because mail is the one thing this dashboard reads
 * that belongs to a person rather than to the server: the inbox is per account
 * and never open to staff, and the game master outbox a manager writes is a
 * different table entirely (`game_master_mail`, read in `staffQueries`). Keeping
 * the two apart is the point — the outbox holds what was said to everybody, the
 * inbox holds what was said to this account, and a reader of one has no reason
 * to be able to reach the other.
 *
 * Both reads are scoped to the caller's own characters. A mail row is addressed
 * to a character, an account holds several, and the scoping is done in the query
 * rather than after it, so there is no window in which another account's message
 * has been read and is merely not being drawn.
 */

/** One message in an inbox, as the player reads it. */
export type InboxMailRow = {
  id: number;
  subject: string;
  body: string;
  sender_name: string;
  sent_at: Date;
  is_read: boolean;
};

/**
 * One message of the game master outbox, which is addressed to no character and
 * is read by the manager who sent it.
 */
export type OutboxMailRow = {
  id: number;
  subject: string;
  body: string;
  sender_name: string;
  sent_at: Date;
};

/**
 * The messages sent to any of the account's characters, newest first.
 *
 * Deleted messages are left out. The row keeps both sides of the delivery, so a
 * message the recipient has deleted is still there for the sender's sent list,
 * and an inbox that showed it would show a letter the player threw away.
 */
export async function listInboxMail(
  accountIdentifier: number,
  limit: number,
): Promise<InboxMailRow[]> {
  const rows = await database()`
    select mail.id, mail.subject, mail.body, mail.sender_name, mail.sent_at, mail.is_read
    from mail
    join characters character on character.id = mail.recipient_character_id
    where character.account_id = ${accountIdentifier}
      and not mail.recipient_deleted
    order by mail.sent_at desc nulls last, mail.id desc
    limit ${limit}
  `;

  return rows as InboxMailRow[];
}

/**
 * One message of the account's own inbox, or nothing when the message is not
 * theirs or has been deleted.
 *
 * The account is part of the read rather than checked after it: an id in a URL is
 * guessable, and the only thing standing between a guess and somebody else's
 * inbox is that the query cannot return a row it was not asked for.
 */
export async function findInboxMail(
  accountIdentifier: number,
  mailIdentifier: number,
): Promise<InboxMailRow | undefined> {
  const rows = await database()`
    select mail.id, mail.subject, mail.body, mail.sender_name, mail.sent_at, mail.is_read
    from mail
    join characters character on character.id = mail.recipient_character_id
    where mail.id = ${mailIdentifier}
      and character.account_id = ${accountIdentifier}
      and not mail.recipient_deleted
    limit 1
  `;

  return rows[0] as InboxMailRow | undefined;
}

/** One message of the game master outbox, by id, for the manager's detail page. */
export async function findOutboxMail(mailIdentifier: number): Promise<OutboxMailRow | undefined> {
  const rows = await database()`
    select mail.id, mail.subject, mail.body, mail.sender_name, mail.sent_at
    from game_master_mail mail
    where mail.id = ${mailIdentifier}
    limit 1
  `;

  return rows[0] as OutboxMailRow | undefined;
}
