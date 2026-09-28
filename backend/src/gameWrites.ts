import { database } from './database.js';

/**
 * The writes a manager makes on a hosted room.
 *
 * Two fields and a removal, and the smallness is the point rather than a limit.
 *
 * A game row belongs to the room that is hosting it. The host writes it — the name
 * the host typed, the comment the host typed, the player count, the round, the
 * status — and it writes it again on every heartbeat. So anything written here is
 * written over by the host within seconds: a corrected name lasts until the host
 * next saves its own, and a comment corrected while a game is live is a comment the
 * players read until the round ends.
 *
 * That is worth saying plainly rather than pretending otherwise, and it is why the
 * UI says it on the page. The write is still worth having, because a host that has
 * gone quiet leaves its room listed, and a room with a name nobody would choose is
 * the first thing a manager wants to be able to fix without opening a database.
 *
 * Everything else about a game — the host, the lobby, the players, the rounds, the
 * results — is not a field a manager sets. Those are written by the host mid-game,
 * and writing them from here would produce a room whose state the game server has
 * no idea about.
 */

/** Longest room name the column stores. */
const MaximumGameNameLength = 16;

/** Longest room comment the column stores. */
const MaximumGameCommentLength = 128;

/** Why a game write was refused, in terms the dashboard can show as they are. */
export type GameRefusal =
  | { reason: 'name' }
  | { reason: 'comment' }
  | { reason: 'unknown-game' };

/** The outcome of one game write: what changed, or why it could not. */
export type GameOutcome<T> = { ok: true; value: T } | { ok: false; refusal: GameRefusal };

/** Refuses a write with the reason, so every caller reports refusals the same way. */
function refuse<T>(refusal: GameRefusal): GameOutcome<T> {
  return { ok: false, refusal };
}

/**
 * Corrects a hosted room's name and comment.
 *
 * `updated_at` is not touched. It is the column the list filters on to decide which
 * rooms are live — anything older than the staleness window is not shown at all —
 * and moving it would keep a room in the list by editing it, which is the opposite
 * of what editing a room is for. A correction does not make a dead room live.
 */
export async function editGame(
  gameIdentifier: number,
  input: { name?: string; comment?: string },
): Promise<GameOutcome<{ id: number }>> {
  const name = input.name === undefined ? undefined : input.name.trim();

  if (name !== undefined && (name.length === 0 || name.length > MaximumGameNameLength)) {
    return refuse({ reason: 'name' });
  }

  const comment = input.comment === undefined ? undefined : input.comment.trim();

  if (comment !== undefined && comment.length > MaximumGameCommentLength) {
    return refuse({ reason: 'comment' });
  }

  if (name === undefined && comment === undefined) {
    return refuse({ reason: 'comment' });
  }

  const rows = await database()`
    update games
    set
      name = coalesce(${name ?? null}, games.name),
      comment = coalesce(${comment ?? null}, games.comment)
    where id = ${gameIdentifier}
    returning id
  `;

  if (rows.length === 0) {
    return refuse({ reason: 'unknown-game' });
  }

  return { ok: true, value: { id: gameIdentifier } };
}

/**
 * Removes a hosted room.
 *
 * One statement, because everything that points at a game cascades: the players in
 * it, the rounds, the round reports, the weapon statistics and the event host lease
 * all go with it. Nothing has to be found and removed first, and there is no order
 * to get wrong.
 *
 * It is worth being clear about what this does to a live game. The host is still
 * connected and still writing; the row it is writing to is gone. What happens then
 * is the host subsystem's business, not this write's — the room either reappears
 * because the host saved again, or it does not, and either way the operator can see
 * which by looking at the list afterwards. The page says so before the button is
 * pressed, because a room that reappears a minute later is a surprise unless it was
 * expected.
 */
export async function removeGame(
  gameIdentifier: number,
): Promise<GameOutcome<{ id: number }>> {
  const rows = await database()`
    delete from games
    where id = ${gameIdentifier}
    returning id
  `;

  if (rows.length === 0) {
    return refuse({ reason: 'unknown-game' });
  }

  return { ok: true, value: { id: gameIdentifier } };
}
