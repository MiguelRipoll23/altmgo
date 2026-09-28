import { database } from './database.js';

/**
 * The reasons an edit or a removal can be refused, in the words the dashboard
 * shows them as. They are the same vocabulary {@link ../moderationWrites} uses,
 * so one refusal table covers every moderator write rather than one per module.
 */
export type EditRefusal =
  | { reason: 'name' }
  | { reason: 'unknown-team' }
  | { reason: 'duplicate-event-name' }
  | { reason: 'invalid-window' }
  | { reason: 'in-use' };

/** The outcome of one edit: what changed, or why it could not. */
export type EditOutcome<T> = { ok: true; value: T } | { ok: false; refusal: EditRefusal };

/** Refuses an edit with the reason, so every caller reports refusals the same way. */
function refuse<T>(refusal: EditRefusal): EditOutcome<T> {
  return { ok: false, refusal };
}

/** Longest team name the column stores. */
const MaximumTeamNameLength = 16;

/** Longest team comment the column stores. */
const MaximumCommentLength = 128;

/** Longest event schedule name the column stores. */
const MaximumEventNameLength = 64;

/** Largest field a bracket can hold, which is the client's own limit. */
const BracketMaximumEntrants = 8;

/**
 * The team states a team can be left in. A team whose state is neither of these
 * is one the event subsystem has moved on from, and an edit that only renames it
 * would leave that untouched rather than quietly resetting it.
 */
const EditableTeamStates = new Set([1, 9]);

/**
 * Renames a team and rewrites its comment.
 *
 * The state is deliberately not editable here: a team is put into a state by the
 * event subsystem as it matches teams up, and a moderator setting one by hand
 * would be writing a value the lobby is about to overwrite. Renaming is the edit
 * a moderator makes while the ladder is running.
 */
export async function renameEventTeam(
  teamIdentifier: number,
  name: string,
  comment: string,
): Promise<EditOutcome<{ id: number; name: string; comment: string }>> {
  const teamName = name.trim();

  if (teamName.length === 0 || teamName.length > MaximumTeamNameLength) {
    return refuse({ reason: 'name' });
  }

  const taken = await database()`
    select 1 from event_teams where lower(name) = ${teamName.toLowerCase()} and id <> ${teamIdentifier} limit 1
  `;

  if (taken[0]) {
    return refuse({ reason: 'duplicate-event-name' });
  }

  const written = await database()`
    update event_teams
    set name = ${teamName}, comment = ${comment.slice(0, MaximumCommentLength)}, updated_at = now()
    where id = ${teamIdentifier}
    returning id, name, comment
  `;

  const team = written[0] as { id: number; name: string; comment: string } | undefined;
  if (!team) {
    return refuse({ reason: 'unknown-team' });
  }

  return { ok: true, value: team };
}

/**
 * Removes a team, along with the roster rows that hang off it.
 *
 * A team that has been drawn into a bracket is not removed: the fixture rows
 * name it, and a bracket referring to a team that is gone reads as a tournament
 * that decided itself. That refusal is the reason this function exists rather
 * than a bare delete.
 */
export async function removeEventTeam(
  teamIdentifier: number,
): Promise<EditOutcome<{ id: number }>> {
  const drawn = await database()`
    select 1
    from tournament_registrations
    where team_id = ${teamIdentifier}
    union all
    select 1 from tournament_seeds where team_id = ${teamIdentifier}
    union all
    select 1
    from tournament_results
    where first_team_id = ${teamIdentifier} or second_team_id = ${teamIdentifier}
    limit 1
  `;

  if (drawn[0]) {
    return refuse({ reason: 'in-use' });
  }

  // The roster is deleted rather than left to the cascade so that a team removed
  // from a lobby that has not cascaded yet still leaves nothing behind that the
  // event subsystem would read as a member of a team that is not there.
  const written = await database()`
    delete from event_teams where id = ${teamIdentifier} returning id
  `;

  if (!written[0]) {
    return refuse({ reason: 'unknown-team' });
  }

  return { ok: true, value: { id: teamIdentifier } };
}

/** A schedule as the dashboard reads it back after editing one. */
export type EditedSchedule = {
  id: number;
  name: string;
  lobby_subtype: number;
  enabled: boolean;
  publish_start: number;
  publish_end: number;
  team_capacity: number;
};

/**
 * Edits a published event: its name, its window, its field size, and whether it
 * is published at all.
 *
 * The window is validated the same way it is on creation, because an event that
 * closes before it opens is not a window at any later point either — the check
 * belongs to the value rather than to the route that first received it.
 */
export async function editEventSchedule(
  eventIdentifier: number,
  input: {
    name: string;
    teamCapacity: number;
    publishStart: number;
    publishEnd: number;
    enabled: boolean;
  },
): Promise<EditOutcome<EditedSchedule>> {
  const name = input.name.trim();

  if (name.length === 0 || name.length > MaximumEventNameLength) {
    return refuse({ reason: 'name' });
  }

  if (
    input.publishStart < 0 ||
    input.publishEnd < 0 ||
    (input.publishEnd !== 0 && input.publishEnd <= input.publishStart)
  ) {
    return refuse({ reason: 'invalid-window' });
  }

  const taken = await database()`
    select 1
    from event_schedules
    where lower(name) = ${name.toLowerCase()} and id <> ${eventIdentifier}
    limit 1
  `;

  if (taken[0]) {
    return refuse({ reason: 'duplicate-event-name' });
  }

  const capacity = Math.min(Math.max(input.teamCapacity, 1), BracketMaximumEntrants);

  const written = await database()`
    update event_schedules
    set name = ${name},
        team_capacity = ${capacity},
        publish_start = ${input.publishStart},
        publish_end = ${input.publishEnd},
        enabled = ${input.enabled}
    where id = ${eventIdentifier}
    returning id, name, lobby_subtype, enabled, publish_start, publish_end, team_capacity
  `;

  const schedule = written[0] as EditedSchedule | undefined;
  if (!schedule) {
    return refuse({ reason: 'unknown-team' });
  }

  return { ok: true, value: schedule };
}

export { EditableTeamStates };
