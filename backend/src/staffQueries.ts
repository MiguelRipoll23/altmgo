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
 * One account, with everything the account's own page shows about it.
 *
 * The slots are the account's own column rather than something counted from the
 * roster, because they are what the game compares a character count against: an
 * account with four characters and three slots is over its limit, and a page that
 * showed only the count would make that look like four and a spare.
 */
export type StaffAccountDetailRow = {
  id: number;
  display_name: string;
  slots: number;
  banned_until: Date | null;
  ban_reason: string | null;
  main_character_id: number | null;
  main_character_name: string | null;
  current_character_id: number | null;
  current_character_name: string | null;
  character_count: number;
  roles: HeldRole[];
};

/** One character belonging to an account, as its owner's page lists it. */
export type AccountCharacterRow = {
  id: number;
  name: string;
  rank: number;
  experience: number;
  total_rewards: number;
  created_at: Date;
  last_seen_at: Date | null;
  lobby_name: string | null;
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

/**
 * Reads one account, or nothing when there is no such account.
 *
 * It is the listing's own query narrowed to a single row rather than a new
 * shape: the page it answers for is the listing's row opened, so the two have to
 * agree about what an account is, and a second query would be a second answer.
 * The ids of the main and current characters come with the names because the
 * page links each of them to the character's own page, and a link built from a
 * name would have to search for the id it already has.
 */
export async function findStaffAccount(
  accountIdentifier: number,
): Promise<StaffAccountDetailRow | undefined> {
  const rows = await readRows<StaffAccountDetailRow>(database()`
    select
      account.id,
      account.display_name,
      account.slots,
      account.banned_until,
      account.ban_reason,
      main_character.id as main_character_id,
      main_character.name as main_character_name,
      current_character.id as current_character_id,
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
    where account.id = ${accountIdentifier}
    limit 1
  `);

  return rows[0];
}

/**
 * The characters an account owns, most active first.
 *
 * The lobby comes from the presence table rather than being asked of the account,
 * so a character sitting in a room is drawn where the staff characters page would
 * draw it: a character that is somewhere is a character somebody can be asked
 * about, and one that is nowhere is one they cannot.
 */
export async function listAccountCharacters(
  accountIdentifier: number,
): Promise<AccountCharacterRow[]> {
  return readRows<AccountCharacterRow>(database()`
    select
      character.id,
      character.name,
      character.rank,
      character.experience,
      character.total_rewards,
      character.created_at,
      character.last_seen_at,
      lobby.name as lobby_name
    from characters character
    left join character_presence presence on presence.character_id = character.id
    left join lobbies lobby on lobby.id = presence.lobby_id
    where character.account_id = ${accountIdentifier} and character.active
    order by character.last_seen_at desc nulls last, character.name
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
