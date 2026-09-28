import { database, raw } from './database.js';

/**
 * The clan directory and the record of any one clan.
 *
 * These read the same three tables the game writes — `clans`, `clans_members` and
 * `clan_applications` — and add nothing of their own: a roster, a notice and a
 * pending application are all facts the server already stores, and a dashboard
 * section that derived a fourth thing from them would be a second place to keep
 * correct.
 */

/** How a clan search is ordered. */
export type ClanSort = 'name' | 'members' | 'recent';

/** Every ordering a clan search can be asked for, so an unknown one is refused. */
export const ClanSorts: readonly ClanSort[] = ['name', 'members', 'recent'];

/** Whether a name is one of the orderings. */
export function isClanSort(name: string): name is ClanSort {
  return (ClanSorts as readonly string[]).includes(name);
}

/** One clan as the directory lists it. */
export type ClanSummaryRow = {
  id: number;
  name: string;
  comment: string;
  notice: string;
  notice_at: Date | null;
  /** Whether the clan accepts open applications. Stored as an integer, not a flag. */
  open: number;
  leader_name: string | null;
  member_count: number;
  application_count: number;
  created_at: Date | null;
};

/** One member of a clan, as the roster shows it. */
export type ClanMemberRow = {
  character_id: number;
  name: string;
  rank: number;
  is_leader: boolean;
};

/** One pending application to join a clan. */
export type ClanApplicationRow = {
  id: number;
  character_id: number;
  character_name: string;
  applied_at: Date;
};

/** One clan in full: its record, its roster and the applications waiting on it. */
export type ClanDetail = {
  clan: ClanSummaryRow;
  members: ClanMemberRow[];
  applications: ClanApplicationRow[];
};

/**
 * Runs a query and types its rows.
 *
 * The driver answers `Record<string, any>[]`, which describes no shape at all and
 * so would let a renamed column arrive as a silently `undefined` value. Naming the
 * row type once, here, is what keeps the clan reads honest without repeating a cast
 * down each query.
 */
async function readRows<T>(rows: Promise<Record<string, unknown>[]>): Promise<T[]> {
  return (await rows) as unknown as T[];
}

/**
 * Lists the clans a search matched, ordered by name unless the caller asked for
 * something else.
 *
 * The term is matched against the clan name alone. An operator looking for a clan
 * usually knows its name; the roster and the notice are what the list then offers to
 * show, and neither is a word anybody types to find it.
 *
 * The leader is reached through the membership row rather than through a character
 * id, because `clans.leader_id` points at `clans_members.id` — joining it straight to
 * `characters` would name whoever happened to hold that character id. The two counts
 * are correlated subqueries rather than grouped joins, because joining both child
 * tables at once multiplies the two counts into each other: a clan with four members
 * and two applications would otherwise report eight of each.
 */
export async function searchClans(term: string, sort: ClanSort, limit: number): Promise<ClanSummaryRow[]> {
  const pattern = `%${term}%`;

  // The ordering is a fixed expression per sort rather than a column name, so it
  // cannot be spliced from anything a request carried: `order by` takes no bind
  // parameter, and the caller never names a column anyway — the three orderings
  // below are the whole vocabulary.
  const orderings: Record<ClanSort, ReturnType<typeof raw>> = {
    name: raw('clan.name'),
    members: raw('member_count desc, clan.name'),
    recent: raw('clan.created_at desc nulls last, clan.name'),
  };

  return readRows<ClanSummaryRow>(database()`
    select
      clan.id,
      clan.name,
      clan.comment,
      clan.notice,
      clan.notice_at,
      clan.open,
      clan.created_at,
      leader_character.name as leader_name,
      (
        select count(*)::bigint
        from clans_members member
        where member.clan_id = clan.id
      ) as member_count,
      (
        select count(*)::bigint
        from clan_applications application
        where application.clan_id = clan.id
      ) as application_count
    from clans clan
    left join clans_members leader on leader.id = clan.leader_id
    left join characters leader_character on leader_character.id = leader.character_id
    where ${term} = '' or clan.name ilike ${pattern}
    order by ${orderings[sort]}
    limit ${limit}
  `);
}

/** Reads one clan with its roster and its pending applications. */
export async function findClanDetail(clanIdentifier: number): Promise<ClanDetail | undefined> {
  const clans = await readRows<ClanSummaryRow>(database()`
    select
      clan.id,
      clan.name,
      clan.comment,
      clan.notice,
      clan.notice_at,
      clan.open,
      clan.created_at,
      leader_character.name as leader_name,
      (
        select count(*)::bigint
        from clans_members member
        where member.clan_id = clan.id
      ) as member_count,
      (
        select count(*)::bigint
        from clan_applications application
        where application.clan_id = clan.id
      ) as application_count
    from clans clan
    left join clans_members leader on leader.id = clan.leader_id
    left join characters leader_character on leader_character.id = leader.character_id
    where clan.id = ${clanIdentifier}
  `);

  const clan = clans[0];

  if (!clan) {
    return undefined;
  }

  // The roster is ordered by the member's own rank rather than by name, because rank
  // is the order the clan itself chose and a dashboard that re-sorted it would show a
  // roster in an order its leader did not set. The leader is pinned to the top
  // regardless: `clans.leader_id` is authoritative, and a member row whose rank does
  // not agree with it should not move the clan leader out of first place.
  const members = await readRows<ClanMemberRow>(database()`
    select
      character.id as character_id,
      character.name,
      member.rank,
      (member.id = clan.leader_id) as is_leader
    from clans_members member
    join characters character on character.id = member.character_id
    where member.clan_id = ${clanIdentifier}
    order by (member.id = clan.leader_id) desc, member.rank, character.name
  `);

  // An application is a character waiting to be let in, so the whole queue is read:
  // it is the answer to "who is asking", and a paged queue would hide the tail of it
  // from exactly the leader who has to act on it.
  const applications = await readRows<ClanApplicationRow>(database()`
    select
      application.id,
      character.id as character_id,
      character.name as character_name,
      application.applied_at
    from clan_applications application
    join characters character on character.id = application.character_id
    where application.clan_id = ${clanIdentifier}
    order by application.applied_at, application.id
  `);

  return { clan, members, applications };
}
