import { Check, Globe, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest, describeError } from '../api';
import { discoverableSecondsLeft, readSessionToken } from '../session';
import { Button } from './ui/button';

/** What the server answers a publish with. */
type PublishResponse = {
  address: string;
  /** The characters whose stored address was not already this one. */
  published: { id: number; name: string }[];
};

/**
 * How long the control reports that the game is discoverable instead of offering
 * the action again.
 *
 * The label says "Discoverable" and nothing else; the number of seconds is what
 * ends the window, not something the label carries. A state on a control is a
 * thing to read, and a control whose text is a clock is a thing to watch — which
 * is how a label ends up describing when it will go away rather than what it is.
 *
 * Fifteen seconds is long enough to be seen by somebody who looked away when the
 * page drew, and short enough that a player who opened a game in the meantime is
 * not left with a control that refuses to work.
 */
const DiscoverableSeconds = 15;

/**
 * The address the reader's account publishes, with the control that corrects it,
 * drawn inline rather than on a tile.
 *
 * This is the one figure on the overview that is about the person reading rather
 * than about the server, and it is the one that goes stale: a host whose network
 * changed still sees the address they had yesterday. It sits in the line beside
 * the two counts — the address, and a link to correct it — because it is context
 * for the same question they answer, and a figure of its own on its own card
 * would spend a tile on the one number that is about them.
 *
 * It went back to this page from the character page. On the character page it was
 * a whole panel for one address, and it named the character by asking which of
 * the account's was active most recently — a guess, on a page that otherwise knew
 * which character it was about. Here the page is about the server and the reader
 * passes through it, and the address is one item in a line rather than the
 * subject of a screen.
 *
 * The write is account-wide, which is not a simplification. The connection row is
 * written per character but every character of an account listens on the same
 * network, so they all share the address; publishing for one and not the others
 * would leave the rest stale.
 *
 * Signing in is what writes it, not this page, and the sign-in says so in its
 * answer: an account with a character that has a connection row is discoverable,
 * and the control shows that as a state for the length of the window rather than
 * offering a button that would do nothing. An account without one is not
 * discoverable, and gets the button — because the fix for that is to open a game
 * and press it, and a control that refuses to be pressed is the one thing that
 * cannot deliver that fix.
 *
 * The port is not printed. It is a client setting, the same figure on every host
 * of a deployment, so showing it spends the width on a number that says nothing
 * and pushes the address itself out of reading.
 *
 * The failure is written under the line rather than as a state on the control.
 * A control whose own label changed to an error would lose the address it is
 * there to report, and the address is the thing the reader came for.
 */
export function PublishAddress({
  address,
  onPublished,
}: {
  /** The published address, or nothing when the account has none to publish. */
  address: string | null;
  /** Called after a successful publish, so the page can read the address again. */
  onPublished: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  /**
   * When the Discoverable window runs out, as a wall-clock moment.
   *
   * A moment rather than a number of seconds left, because a number would have to
   * be decremented by a timer and a timer a browser throttles in a background tab
   * would run slow — so fifteen seconds would be thirty, and a reader who came
   * back to the tab would find a state that had been lying for a minute. Reading
   * the clock instead means the window is fifteen seconds long however little
   * attention the page was getting.
   */
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // The sign-in's answer, taken once on arrival. It is already aged by the time
  // this mounts, so what comes back is the window that is left rather than the
  // whole of it — a reader who spent a minute on the clans page before opening the
  // overview is not met by a window that started again here.
  useEffect(() => {
    const left = discoverableSecondsLeft(DiscoverableSeconds);

    if (left !== null) {
      setUntil(Date.now() + left * 1000);
    }
  }, []);

  // Ticking only while the window is open, and only re-reading the clock: the
  // window is a reading of the time, not a tally of the ticks. Nothing is
  // displayed per tick, but the tick is still what turns the state off.
  useEffect(() => {
    if (until === null) {
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [until]);

  async function publish() {
    setPublishing(true);
    setFailure(null);

    try {
      const answer = await apiRequest<PublishResponse>('/api/addresses', {
        method: 'POST',
        token: readSessionToken(),
      });

      // The state is the whole report: the control becoming "Discoverable" says
      // the address was written, and a sentence under the line saying so as well
      // is the same fact twice. Nothing is said when nothing was written either —
      // an address that was already correct needs no sentence, and an account with
      // no character to publish for is already carrying the note below.
      if (answer.published.length > 0) {
        setUntil(Date.now() + DiscoverableSeconds * 1000);
      }

      onPublished();
    } catch (caught) {
      setFailure(describeError(caught));
    } finally {
      setPublishing(false);
    }
  }

  // Whether the window is still open. The only question the control asks, so it
  // is a question with a yes or a no rather than a number to format.
  const discoverable = until !== null && until > now;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-mono text-foreground/90">
        {address ?? 'No address published'}
      </span>

      <Button
        size="sm"
        variant={discoverable ? 'secondary' : 'ghost'}
        onClick={() => void publish()}
        disabled={publishing || discoverable}
      >
        {publishing ? (
          <RefreshCw className="animate-spin" />
        ) : discoverable ? (
          <Check />
        ) : (
          <Globe />
        )}
        {publishing ? 'Publishing…' : discoverable ? 'Discoverable' : 'Update'}
      </Button>

      {/* The two things that need saying are said under the line rather than in
          place of it, so the address stays on screen while the reader reads them. */}
      {address === null ? (
        <span className="w-full text-base text-muted-foreground">
          No character of this account has a connection row yet, so there is nothing to
          publish — open a game in the client, then press Update.
        </span>
      ) : null}

      {failure === null ? null : (
        <span className="w-full text-base text-destructive">{failure}</span>
      )}
    </span>
  );
}