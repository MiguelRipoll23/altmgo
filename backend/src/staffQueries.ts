import { database } from './database.js';

/**
 * What a manager reads: the accounts and the roles they hold, and the game
 * masters' own mailbox.
 *
 * None of it is derived. A role is a row in `account_roles` and a letter is a row
 * in `game_master_mail`, both written by the game and readable here; the dashboard
 * draws them and, for a role, changes it. The news is not in this file because a
 * player reads it too — that read is in `newsQueries`.
 */

/** One role an account holds, with when it was granted. */
export type HeldRole = {
  role: string;
  granted_at: Date;
};

/** One account, as the accounts and roles section lists it. */
export type StaffAccountRow = {
  id: number;
  display_name: string;
  banned_until: Date | null;
  ban_reason: string | null;
  main_character_name: string | null;
  current_character_name: string | null;
  character_count: number;
  roles: HeldRole[];
};

/**
 * Which side of the game masters' mailbox a listing is about.
 *
 * The table is one mailbox with two kinds of letter in it: what a player wrote to
 * the game masters, which the game writes and only the game masters have ever
 * read, and what the console wrote there with no sender, which is the console's
 * own side of the same box. They are not one list, because the two are not the
 * same thing: one is mail arriving and the other is mail leaving, and an operator
 * answering a player and an operator checking what they have said are two
 * different questions asked of one table.
 */
export type GameMasterMailBox = 'inbox' | 'outbox';

/** Every box a listing may name, so an unknown one is refused rather than guessed. */
export const GameMasterMailBoxes: readonly GameMasterMailBox[] = ['inbox', 'outbox'];

/** Whether a name is one of the boxes. */
export function isGameMasterMailBox(name: string): name is GameMasterMailBox {
  return (GameMasterMailBoxes as readonly string[]).includes(name);
}

/** One game master mail message, as it sits in the game masters' mailbox. */
export type GameMasterMailRow = {
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

/**
 * Runs a query and types its rows.
 *
 * The driver answers `Record<string, any>[]`, which describes no shape at all and
 * so would let a renamed column arrive as a silently `undefined` value.
 */
async function readRows<T>(rows: Promise<Record<string, unknown>[]>): Promise<T[]> {
  return (await rows) as unknown as T[];
}

/**
 * Lists every account with the roles it holds.
 *
 * The roles are gathered in a correlated subquery rather than joined and grouped,
 * because the join that would produce them in one pass is the same one that has to
 * be counted twice over: an account with two characters and two roles arrives from
 * a grouped join as four rows, and the character count would double with it. The
 * coalesce is what makes an account with no roles come back as an empty list rather
 * than as nothing at all, which the page would otherwise have to tell apart from a
 * query that failed.
 */
export async function listStaffAccounts(): Promise<StaffAccountRow[]> {
  return readRows<StaffAccountRow>(database()`
    select
      account.id,
      account.display_name,
      account.banned_until,
      account.ban_reason,
      main_character.name as main_character_name,
      current_character.name as current_character_name,
      (
        select count(*)::bigint
        from characters character
        where character.account_id = account.id
      ) as character_count,
      coalesce(
        (
          select json_agg(
            json_build_object('role', held.role, 'granted_at', held.granted_at)
            order by held.role
          )
          from account_roles held
          where held.account_id = account.id
        ),
        '[]'::json
      ) as roles
    from accounts account
    left join characters main_character on main_character.id = account.main_character_id
    left join characters current_character on current_character.id = account.current_character_id
    order by account.display_name, account.id
  `);
}

/** The most recent game master mail, newest first. */
export async function listGameMasterMail(
  box: GameMasterMailBox,
  limit: number,
): Promise<GameMasterMailRow[]> {
  return readRows<GameMasterMailRow>(database()`
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
    where (
      (${box} <> 'inbox' and mail.sender_character_id is null)
      or (${box} <> 'outbox' and mail.sender_character_id is not null)
    )
    order by mail.sent_at desc nulls last, mail.id desc
    limit ${limit}
  `);
}
