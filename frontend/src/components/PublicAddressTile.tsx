import { Check, Globe, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest, describeError } from '../api';
import { discoverableSecondsLeft, readSessionToken } from '../session';
import { StatTile } from './DataDisplay';
import { Button } from './ui/button';

/** What the server answers a publish with. */
type PublishResponse = {
  address: string;
  /** The characters whose stored address was not already this one. */
  published: { id: number; name: string }[];
};

/**
 * How long the button reports that the game is discoverable instead of offering
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
 * The address the caller's own last character publishes, with the button that
 * corrects it inside the same tile.
 *
 * This is the one figure on the overview that is about the person reading rather
 * than the server, and it is the one that goes stale: a host whose network
 * changed still sees the address they had yesterday. The button therefore sits
 * inside the tile, under the value it acts on, rather than in a row of its own
 * below the figures — a control that belongs to one number and is drawn apart
 * from it is a control somebody presses for the wrong number.
 *
 * Signing in is what writes it, not this page, and the sign-in says so in its
 * answer: an account with a character that has a connection row is discoverable,
 * and the tile shows that as a state for the length of the window rather than
 * offering a button that would do nothing. An account without one is not
 * discoverable, and gets the button — because the fix for that is to open a game
 * and press it, and a control that refuses to be pressed is the one thing that
 * cannot deliver that fix.
 *
 * The button is the same work by hand for a host who opened a game after signing
 * in, which is the only case the arrival write cannot have covered.
 *
 * The port is not printed beside it. It is a client setting, the same figure on
 * every host of a deployment, so showing it spends the width of the tile on a
 * number that says nothing and pushes the address itself into a smaller size so
 * the pair fits.
 *
 * This draws only once the figure has arrived. The page decides that, and keeps
 * every tile back until it has: a reload after publishing is not a page that has
 * lost its address, and a tile that emptied itself each time the button was
 * pressed would be a worse answer than the one it is there to give.
 */
export function PublicAddressTile({
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
  // whole of it — a reader who spent a minute on the clans page before opening
  // the overview is not met by a window that started again here.
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

      // The state is the whole report: the button becoming "Discoverable" says the
      // address was written, and a line of text under the tile saying so as well
      // is the same fact twice. Nothing is said when nothing was written either —
      // an address that was already correct needs no sentence, and an account with
      // no character to publish for is already carrying the standing note below
      // that tells the reader what to do about it.
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

  // Whether the window is still open. The only question the button asks, so it
  // is a question with a yes or a no rather than a number to format.
  const discoverable = until !== null && until > now;

  return (
    <StatTile
      label="Public IP"
      textual
      value={address ?? 'Not published'}
      action={
        <div className="space-y-2">
          <Button
            size="sm"
            className="w-full"
            variant={discoverable ? 'secondary' : 'default'}
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

          {failure === null ? null : (
            <p className="text-base text-destructive">{failure}</p>
          )}

          {address === null ? (
            <p className="text-base text-muted-foreground">
              No character of this account has a connection row yet, so there is nothing to publish
              — open a game in the client, then press Update.
            </p>
          ) : null}
        </div>
      }
    />
  );
}
