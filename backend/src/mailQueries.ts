import { database } from './database.js';

/**
 * The mail a player reads and writes, as the client's inbox and sent list show
 * them.
 *
 * Mail is the one thing this dashboard reads that belongs to a person rather than
 * to the server, so it lives in its own module. The game masters' mailbox is a
 * different table entirely (`game_master_mail`): that one holds what was said to
 * everybody, this holds what was said between characters, and the two are kept
 * apart rather than joined into one list a reader would have to filter.
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
export type MailBox = 'inbox' | 'outbox';

/** Every box a listing may name, so an unknown one is refused rather than guessed. */
export const MailBoxes: readonly MailBox[] = ['inbox', 'outbox'];

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
 * There is no third box holding both sides. A mail row is one message, so the
 * union of the two lists is the same rows a second time rather than a different
 * set, and a reader who wants both can read both; what a union does add is a
 * question the two lists already answer between them, and a third place for a
 * message to be in when somebody is looking for it.
 *
 * A deleted message is left out of the side that deleted it, so a letter the
 * player threw away does not reappear through the other end of the same row: the
 * row is still there for the sender's list, which is what the flags are for.
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
