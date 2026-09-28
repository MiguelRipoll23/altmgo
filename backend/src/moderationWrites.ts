import { database, isUniqueViolation } from './database.js';

/**
 * The prefix a character's name carries when it is one the deployment put there
 * rather than one a player chose. The dedicated match rooms are named
 * `server-<port>` by the gameplay server, and a moderator needs to be able to
 * put one of those on a team by typing its name.
 */
export const ServerCharacterPrefix = 'server-';

/** Team states, copied from the event subsystem the game server owns. */
export const TeamStates = {
  /** The team appears in the joinable list. */
  joinable: 1,
  /** The team has decided to play and is waiting for an opponent. */
  queued: 9,
} as const;

/** The states a team can be put into from the dashboard. */
export type TeamState = keyof typeof TeamStates;

/** Whether a name is one of the team states. */
export function isTeamState(name: string): name is TeamState {
  return Object.hasOwn(TeamStates, name);
}

/** Member states, copied from the event subsystem. */
export const MemberStates = {
  /** The member has not decided yet. */
  pending: 1,
  /** The member is ready to play. */
  ready: 2,
} as const;

/** The states a member can be put into from the dashboard. */
export type MemberState = keyof typeof MemberStates;

/** Whether a name is one of the member states. */
export function isMemberState(name: string): name is MemberState {
  return Object.hasOwn(MemberStates, name);
}

/** Slots in a team roster, of which the first is the leader. */
export const TeamRosterSize = 8;

/** Largest roster a team may actually fill. */
export const TeamMemberLimit = 6;

/** Longest team name the column stores. */
const MaximumTeamNameLength = 16;

/** Longest team comment the column stores. */
const MaximumCommentLength = 128;

/** Longest event schedule name the column stores. */
const MaximumEventNameLength = 64;

/** Largest field a bracket can hold, which is the client's own limit. */
const BracketMaximumEntrants = 8;

/** The event identifier the transient, always-open event record carries. */
const TransientEventIdentifier = 1;

/** Why a write was refused, in terms the dashboard can show as they are. */
export type ModerationRefusal =
  | { reason: 'name' }
  | { reason: 'unknown-character' }
  | { reason: 'duplicate-member' }
  | { reason: 'roster-full' }
  | { reason: 'unknown-team' }
  | { reason: 'duplicate-event-name' }
  | { reason: 'invalid-window' }
  | { reason: 'invalid-mode' };

/** The outcome of one moderator write: what changed, or why it could not. */
export type ModerationOutcome<T> = { ok: true; value: T } | { ok: false; refusal: ModerationRefusal };

/** Refuses a write with the reason, so every caller reports refusals the same way. */
function refuse<T>(refusal: ModerationRefusal): ModerationOutcome<T> {
  return { ok: false, refusal };
}

/** A team as the dashboard reads it back after a write. */
export type WrittenTeam = { id: number; name: string; state: number };

/**
 * Creates a team in one lobby mode.
 *
 * The lobby is found rather than named: a team belongs to the lobby it was
 * formed in, and the dashboard is not the client, so it has no lobby id to
 * send. The one lobby of that mode that is up is the one the team joins, and
 * with no lobby of that mode running there is nothing to form a team in.
 */
export async function createEventTeam(
  mode: number,
  name: string,
  comment: string,
  ownerName: string,
): Promise<ModerationOutcome<WrittenTeam>> {
  const teamName = name.trim();
  const owner = ownerName.trim();

  if (teamName.length === 0 || teamName.length > MaximumTeamNameLength) {
    return refuse({ reason: 'name' });
  }

  if (owner.length === 0) {
    return refuse({ reason: 'unknown-character' });
  }

  const lobbies = await database()`
    select id
    from lobbies
    where subtype_id = ${mode}
    order by updated_at desc
    limit 1
  `;

  const lobby = lobbies[0] as { id: number } | undefined;
  if (!lobby) {
    return refuse({ reason: 'unknown-team' });
  }

  const owners = await database()`
    select id
    from characters
    where name = ${owner} and active
    limit 1
  `;

  const ownerRow = owners[0] as { id: number } | undefined;
  if (!ownerRow) {
    return refuse({ reason: 'unknown-character' });
  }

  // Survival and the Tournament registration lobby differ in which event a team
  // belongs to: the transient record is the standing one, while a registration
  // lobby holds specific scheduled events. The dashboard forms the standing
  // kind, because that is the one a name and a lobby are enough to place.
  const eventIdentifier = TransientEventIdentifier;

  const created = await database()`
    insert into event_teams (
      owner_character_id, lobby_id, event_id, match_type,
      name, comment, state, created_at, updated_at
    )
    values (
      ${ownerRow.id}, ${lobby.id}, ${eventIdentifier}, ${mode},
      ${teamName}, ${comment.slice(0, MaximumCommentLength)}, ${TeamStates.joinable},
      now(), now()
    )
    returning id, name, state
  `;

  const team = created[0] as WrittenTeam;

  // The leader occupies slot zero. The row is what the roster push is built
  // from, so a team whose leader is not in the roster would render as a team
  // with nobody in it.
  await database()`
    insert into event_team_members (team_id, slot, character_id, name, state)
    values (${team.id}, 0, ${ownerRow.id}, ${teamName}, ${MemberStates.ready})
  `;

  return { ok: true, value: team };
}

/**
 * Puts a character on a team by name.
 *
 * This is the path that admits a `server-` prefixed character. Those belong to
 * the dedicated match rooms rather than to a player, so they are placed by a
 * moderator typing the name rather than by joining from the client — there is no
 * client on the other end of a room nobody is sitting at.
 *
 * Whether a member is one of those is reported back rather than checked, so the
 * dashboard can mark it. It is not refused: a name carrying the prefix is a
 * statement about who runs the character, not a claim about what it may be put
 * on, and the game server already decided what that name is when it created the
 * character.
 */
export async function addTeamMember(
  teamIdentifier: number,
  characterName: string,
): Promise<ModerationOutcome<{ slot: number; serverControlled: boolean }>> {
  const wanted = characterName.trim();
  if (wanted.length === 0) {
    return refuse({ reason: 'unknown-character' });
  }

  const characters = await database()`
    select id, name, experience
    from characters
    where name = ${wanted} and active
    limit 1
  `;

  const character = characters[0] as { id: number; name: string; experience: number } | undefined;
  if (!character) {
    return refuse({ reason: 'unknown-character' });
  }

  const teams = await database()`
    select id from event_teams where id = ${teamIdentifier} limit 1
  `;

  if (!teams[0]) {
    return refuse({ reason: 'unknown-team' });
  }

  const alreadyOn = await database()`
    select 1
    from event_team_members
    where team_id = ${teamIdentifier} and character_id = ${character.id}
    limit 1
  `;

  if (alreadyOn[0]) {
    return refuse({ reason: 'duplicate-member' });
  }

  const roster = await database()`
    select slot
    from event_team_members
    where team_id = ${teamIdentifier}
    order by slot
  `;

  const taken = new Set((roster as { slot: number }[]).map((row) => row.slot));

  // The lowest free slot rather than the roster's length, so a team whose roster
  // has a gap in it does not grow a second leader at the end.
  let slot = -1;
  for (let candidate = 0; candidate < TeamRosterSize; candidate += 1) {
    if (!taken.has(candidate)) {
      slot = candidate;
      break;
    }
  }

  if (slot < 0 || (roster as unknown[]).length >= TeamMemberLimit) {
    return refuse({ reason: 'roster-full' });
  }

  await database()`
    insert into event_team_members (team_id, slot, character_id, name, state, experience)
    values (${teamIdentifier}, ${slot}, ${character.id}, ${character.name}, ${MemberStates.pending}, ${character.experience})
  `;

  return {
    ok: true,
    value: {
      slot,
      serverControlled: character.name
        .toLowerCase()
        .startsWith(ServerCharacterPrefix.toLowerCase()),
    },
  };
}

/**
 * Puts one member of a team into a state — the "ready" the team screens show,
 * which is what a team needs before it can be queued.
 */
export async function setMemberState(
  teamIdentifier: number,
  memberSlot: number,
  state: MemberState,
): Promise<ModerationOutcome<{ slot: number; state: number }>> {
  const written = await database()`
    update event_team_members
    set state = ${MemberStates[state]}
    where team_id = ${teamIdentifier} and slot = ${memberSlot}
    returning slot, state
  `;

  const member = written[0] as { slot: number; state: number } | undefined;
  if (!member) {
    return refuse({ reason: 'unknown-team' });
  }

  return { ok: true, value: member };
}

/** Puts a team into a state, which is how a joinable team is queued to play. */
export async function setTeamState(
  teamIdentifier: number,
  state: TeamState,
): Promise<ModerationOutcome<{ id: number; state: number }>> {
  const written = await database()`
    update event_teams
    set state = ${TeamStates[state]}, updated_at = now()
    where id = ${teamIdentifier}
    returning id, state
  `;

  const team = written[0] as { id: number; state: number } | undefined;
  if (!team) {
    return refuse({ reason: 'unknown-team' });
  }

  return { ok: true, value: team };
}

/** A schedule as the dashboard reads it back after writing one. */
export type WrittenSchedule = {
  id: number;
  name: string;
  lobby_subtype: number;
  enabled: boolean;
  publish_start: number;
  publish_end: number;
  team_capacity: number;
};

/**
 * Publishes a new event, which is what makes it enterable at all.
 *
 * The name is the handle the lobby announces and a moderator types, so a
 * duplicate is refused here rather than caught as a constraint: two events
 * sharing a name would make the name address two of them.
 */
export async function createEventSchedule(input: {
  mode: number;
  name: string;
  teamCapacity: number;
  publishStart: number;
  publishEnd: number;
  enabled: boolean;
}): Promise<ModerationOutcome<WrittenSchedule>> {
  if (![3, 4, 10].includes(input.mode)) {
    return refuse({ reason: 'invalid-mode' });
  }

  const name = input.name.trim();
  if (name.length === 0 || name.length > MaximumEventNameLength) {
    return refuse({ reason: 'name' });
  }

  // A window that closes must close after it opens, and neither end may be
  // negative. An end of zero is the "stays published" case the column allows.
  if (
    input.publishStart < 0 ||
    input.publishEnd < 0 ||
    (input.publishEnd !== 0 && input.publishEnd <= input.publishStart)
  ) {
    return refuse({ reason: 'invalid-window' });
  }

  const taken = await database()`
    select 1 from event_schedules where lower(name) = ${name.toLowerCase()} limit 1
  `;

  if (taken[0]) {
    return refuse({ reason: 'duplicate-event-name' });
  }

  const capacity = Math.min(Math.max(input.teamCapacity, 1), BracketMaximumEntrants);

  try {
    const written = await database()`
      insert into event_schedules (name, lobby_subtype, enabled, publish_start, publish_end, team_capacity)
      values (
        ${name}, ${input.mode}, ${input.enabled},
        ${input.publishStart}, ${input.publishEnd}, ${capacity}
      )
      returning id, name, lobby_subtype, enabled, publish_start, publish_end, team_capacity
    `;

    return { ok: true, value: written[0] as WrittenSchedule };
  } catch (error) {
    // The name check above is a read and a write, so two moderators publishing
    // the same name at once can still collide. The constraint is the authority
    // on that, and its answer is the same refusal the read would have given.
    if (isUniqueViolation(error)) {
      return refuse({ reason: 'duplicate-event-name' });
    }

    throw error;
  }
}

/** Withdraws a schedule, which closes the event without touching a drawn bracket. */
export async function withdrawEventSchedule(
  eventIdentifier: number,
): Promise<ModerationOutcome<{ id: number }>> {
  await database()`delete from event_schedules where id = ${eventIdentifier}`;

  return { ok: true, value: { id: eventIdentifier } };
}
