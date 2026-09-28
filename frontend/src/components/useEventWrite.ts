import { useState } from 'react';
import { describeError } from '../api';
import type { Write } from './TeamCard';

/** What a page says after a write, or why it could not be made. */
export type WriteStatus = { kind: 'success' | 'error'; message: string } | null;

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
