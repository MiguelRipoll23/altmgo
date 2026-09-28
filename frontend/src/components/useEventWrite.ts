import { useState } from 'react';
import { describeError } from '../api';
import { isModerator, readSessionRoles } from '../session';
import type { Write } from './TeamCard';

/** What a page says after a write, or why it could not be made. */
export type WriteStatus = { kind: 'success' | 'error'; message: string } | null;

/**
 * Whether the reader is a moderator, and so whether this page draws its controls.
 *
 * The role rather than the address, deliberately. Survival and Tournament are
 * reached from both frames, and keying the controls to the admin prefix would mean
 * the same page behaved differently depending on which of two URLs to the same
 * ladder the browser was on — a moderator who opened the public ladder would be
 * shown a ladder they could not act on, and one who was sent a link to it from
 * there would be shown the same ladder they could. The role is the permission, and
 * the server is what enforces it; this only decides what is drawn.
 *
 * Read once per render rather than held in state, because the roles only change
 * when somebody signs in, and signing in navigates — so the render that matters is
 * the one after it, and this runs then.
 */
export function useMayModerate(): boolean {
  return isModerator(readSessionRoles());
}

/**
 * Runs a moderator write from a page that is otherwise only reading.
 *
 * The controls that write — the team card, the schedule row — take a `Write` and
 * nothing else, so a page that wants them has to supply one. This is that supply,
 * written once: the write is attempted, the sentence for how it went is held for the
 * page to show, and whatever the write changed is read again.
 *
 * Reloading rather than patching the list in place is the point. A team's members
 * and state are the event subsystem's to own, and a bracket draw moves rows this
 * dashboard never sent. A list patched from what the write returned would be a
 * list claiming a state the server has already moved on from, and the next read
 * would contradict it in front of the operator.
 *
 * Every page offering these controls needs the same three things, and each of them
 * had grown its own copy: what to say afterwards, how to run a write, and what to
 * re-read. The re-read is the reason this takes a function rather than nothing —
 * a page that drew a ladder and a schedule needs both read again after forming a
 * team, and a page that drew only one should not pay for the other.
 */
export function useEventWrite(...reload: (() => void)[]) {
  const [status, setStatus] = useState<WriteStatus>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setStatus(null);

    try {
      await action();
      setStatus({ kind: 'success', message: done });
      reload.forEach((again) => again());
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    } finally {
      setBusy(false);
    }
  }

  const write: Write = (action, done) => void run(action, done);

  return { status, setStatus, write, busy };
}
