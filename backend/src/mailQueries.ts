import { database } from './database.js';

/**
 * The mail a player reads and writes, as the client's inbox and sent list show
 * them.
 *
 * It is a module of its own because mail is the one thing this dashboard reads
 * that belongs to a person rather than to the server: the inbox and the sent
 * list are per account and never open to staff, and the game master outbox a
 * manager writes is a different table entirely (`game_master_mail`, read in
 * `staffQueries`). Keeping the two apart is the point — the game master outbox
 * holds what was said to everybody, the mail here holds what was said between
 * characters, and a reader of one has no reason to be able to reach the other.
 *
 * A mail row is one delivery seen from both ends, with a read and a deleted flag
 * per side, so a message the account both sent and received is a single row that
 * answers to both lists. The reads below therefore ask which side the account was
 * on rather than filtering to one side, and a message in the "all" box is that
 * one row rather than two.
 *
 * Every read is scoped to the caller's own characters, inside the query rather
 * than after it, so there is no window in which another account's message has
 * been read and is merely not being drawn.
 */

/** Which side of the delivery a listing is about. */
export type MailBox = 'inbox' | 'outbox' | 'all';

/** Every box a listing may name, so an unknown one is refused rather than guessed. */
export const MailBoxes: readonly MailBox[] = ['inbox', 'outbox', 'all'];

/** Whether a name is one of the boxes. */
export function isMailBox(name: string): name is MailBox {
  return (MailBoxes as readonly string[]).includes(name);
}

/** One message, as either side of the delivery sees it. */
export type AccountMailRow = {
  id: number;
  subject: string;
  body: string;
  sender_name: string;
  recipient_name: string;
  sent_at: Date;
  is_read: boolean;
  /** Whether the account's own character received it rather than sent it. */
  received: boolean;
};

/**
 * The messages on one side of the account's mail, newest first.
 *
 * The box is asked for rather than inferred from which column matched, because
 * "all" is a real question a player asks — what has this account said and been
 * said to it, in one list — and it is answered by the same query widening its
 * condition rather than by two calls the page then merges.
 *
 * A deleted message is left out of the side that deleted it, so a letter the
 * player threw away does not reappear in the "all" box through the other end of
 * the same row: the row is still there for the sender's list, which is what the
 * flags are for.
 */
export async function listAccountMail(
  accountIdentifier: number,
  box: MailBox,
  limit: number,
): Promise<AccountMailRow[]> {
  const rows = await database()`
    select
      mail.id,
      mail.subject,
      mail.body,
      mail.sender_name,
      mail.recipient_name,
      mail.sent_at,
      mail.is_read,
      (
        mail.recipient_character_id in (
          select character.id
          from characters character
          where character.account_id = ${accountIdentifier}
        )
      ) as received
    from mail
    where (
        (
          ${box} <> 'outbox'
          and mail.recipient_character_id in (
            select character.id
            from characters character
            where character.account_id = ${accountIdentifier}
          )
          and not mail.recipient_deleted
        )
        or (
          ${box} <> 'inbox'
          and mail.sender_character_id in (
            select character.id
            from characters character
            where character.account_id = ${accountIdentifier}
          )
          and not mail.sender_deleted
        )
      )
    order by mail.sent_at desc nulls last, mail.id desc
    limit ${limit}
  `;

  return rows as AccountMailRow[];
}

/**
 * One message of the account's own mail, or nothing when the message is not
 * theirs on either side or has been deleted from the side they are reading.
 *
 * The account is part of the read rather than checked after it: an id in a URL is
 * guessable, and the only thing standing between a guess and somebody else's
 * mail is that the query cannot return a row it was not asked for.
 */
export async function findAccountMail(
  accountIdentifier: number,
  mailIdentifier: number,
): Promise<AccountMailRow | undefined> {
  const rows = await database()`
    select
      mail.id,
      mail.subject,
      mail.body,
      mail.sender_name,
      mail.recipient_name,
      mail.sent_at,
      mail.is_read,
      (
        mail.recipient_character_id in (
          select character.id
          from characters character
          where character.account_id = ${accountIdentifier}
        )
      ) as received
    from mail
    where mail.id = ${mailIdentifier}
      and (
        (
          mail.recipient_character_id in (
            select character.id
            from characters character
            where character.account_id = ${accountIdentifier}
          )
          and not mail.recipient_deleted
        )
        or (
          mail.sender_character_id in (
            select character.id
            from characters character
            where character.account_id = ${accountIdentifier}
          )
          and not mail.sender_deleted
        )
      )
    limit 1
  `;

  return rows[0] as AccountMailRow | undefined;
}

/** One message of the game masters' mailbox, which is addressed to no character. */
export type OutboxMailRow = {
  id: number;
  subject: string;
  body: string;
  sender_name: string;
  /** Who wrote it, or nothing for a letter the console wrote. */
  sender_character_id: number | null;
  /** The name of that character, where there is one. */
  sender_character_name: string | null;
  sent_at: Date;
};

/** One message of the game masters' mailbox, by id, for the manager's detail page. */
export async function findOutboxMail(mailIdentifier: number): Promise<OutboxMailRow | undefined> {
  const rows = await database()`
    select
      mail.id,
      mail.subject,
      mail.body,
      mail.sender_name,
      mail.sender_character_id,
      character.name as sender_character_name,
      mail.sent_at
    from game_master_mail mail
    left join characters character on character.id = mail.sender_character_id
    where mail.id = ${mailIdentifier}
    limit 1
  `;

  return rows[0] as OutboxMailRow | undefined;
}
