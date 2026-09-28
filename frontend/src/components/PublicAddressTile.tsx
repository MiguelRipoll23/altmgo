import { Check, Globe, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiRequest, describeError } from '../api';
import { readSessionToken } from '../session';
import { StatTile } from './DataDisplay';
import { Button } from './ui/button';

/** What the server answers a publish with. */
type PublishResponse = {
  address: string;
  /** The characters whose stored address was not already this one. */
  published: { id: number; name: string }[];
};

/**
 * How long the button reports the address is published instead of offering the
 * action again.
 *
 * It is long enough to read and to be seen by somebody who looked away when the
 * page drew, and short enough that a player who opened a game in the meantime is
 * not left with a control that refuses to work. Fifteen seconds is a page-load's
 * worth of attention rather than a minute the reader spends wondering why.
 */
const DiscoverableSeconds = 15;

/**
 * What a publish the reader asked for has to say.
 *
 * Three answers, and not two, because "nothing was published" means two opposite
 * things depending on whether the account has a character for the game to be
 * reached on. With an address already up, nothing published means the stored one
 * was already right and there is nothing to do. With none, it means no character
 * of this account has ever registered an endpoint, so the press could not
 * possibly have written anything — and the reader's next step is to open a game
 * and press it again, which is the opposite of "nothing to do".
 *
 * The count is in the sentence because an account can have several characters
 * with several stored addresses, and "published" without a number does not say
 * which of them the friends are about to be sent to.
 */
function publishedReport(answer: PublishResponse, address: string | null): string {
  const count = answer.published.length;

  if (count > 0) {
    return `Published for ${count} character${count === 1 ? '' : 's'}.`;
  }

  return address === null
    ? 'No character of this account has connected yet, so there was nothing to publish. Open a game, then press Update again.'
    : 'Already up to date.';
}

/**
 * The address the caller's own last character publishes, with the button that
 * corrects it inside the same tile.
 *
 * This is the one figure on the overview that is about the person reading rather
 * than the server, and it is the one that goes stale: a host whose network
 * changed still sees the address they had yesterday until the page corrects it.
 * The button therefore sits inside the tile, under the value it acts on, rather
 * than in a row of its own below the figures — a control that belongs to one
 * number and is drawn apart from it is a control somebody presses for the wrong
 * number.
 *
 * The page draws it once the figure has arrived. A reload after publishing is not
 * a page that has lost its address, and a tile that emptied itself each time the
 * button was pressed would be a worse answer than the one it is there to give.
 *
 * Arriving is also what publishes. Signing in is what makes a game joinable, so
 * the address is written on the way in rather than being left as a task the
 * player has to remember — the button is for the host who opened a game after
 * this page drew, and the tile saying so is the whole difference between the two
 * cases. The port is not printed beside it: it is a client setting, the same
 * figure on every host of a deployment, so showing it spends the width of the
 * tile on a number that says nothing and pushes the address itself smaller.
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
  const [report, setReport] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  /** Seconds during which the button shows the result rather than offering itself. */
  const [discoverable, setDiscoverable] = useState(0);

  // StrictMode mounts every effect twice in development, and publishing twice on
  // arrival would be two requests for one visit. A ref rather than the state it
  // would set, because the guard is about having run, not about what it did.
  const publishedOnArrival = useRef(false);

  /**
   * Writes the address, and arms the countdown when it actually corrected one.
   *
   * The server answers with the characters whose stored address differed, so an
   * arrival where nothing changed — the second visit of the day, or a second
   * mount of this tile — does not claim a correction that did not happen. That
   * is what lets the button mean "your game was just made joinable" rather than
   * "a request was made", which is not the same sentence to somebody whose
   * friends are trying to connect.
   *
   * `onRequest` is true only for the button. Arriving says so itself in the
   * countdown; a line of text under a tile nobody pressed anything on is noise.
   */
  async function publish(onRequest: boolean) {
    setPublishing(true);
    if (onRequest) {
      setReport(null);
    }

    try {
      const answer = await apiRequest<PublishResponse>('/api/addresses', {
        method: 'POST',
        token: readSessionToken(),
      });

      if (answer.published.length > 0) {
        setDiscoverable(DiscoverableSeconds);
      }

      if (onRequest) {
        setReport({ kind: 'success', message: publishedReport(answer, address) });
      }

      onPublished();
    } catch (caught) {
      // A publish that failed on arrival is not shown: the reader did nothing and
      // has nothing to do about it, and the button is still there when they want
      // to try. A publish they asked for is their own action, so it is reported.
      if (onRequest) {
        setReport({ kind: 'error', message: describeError(caught) });
      }
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    if (publishedOnArrival.current) {
      return;
    }

    publishedOnArrival.current = true;
    void publish(false);
    // Once per mount, which is once per visit to the page. `publish` closes over
    // props that do not change the fact that it has run, so the empty dependency
    // list is the whole of what has to be said about it.
  }, []);

  // Keyed on whether the countdown is running rather than on its value: depending
  // on the number would tear the interval down and build a new one every second
  // to do the work the existing one is already doing.
  const counting = discoverable > 0;

  useEffect(() => {
    if (!counting) {
      return;
    }

    const timer = window.setInterval(() => {
      setDiscoverable((left) => (left <= 1 ? 0 : left - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [counting]);

  const correcting = publishing || discoverable > 0;

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
            variant={discoverable > 0 ? 'secondary' : 'default'}
            onClick={() => void publish(true)}
            disabled={correcting}
          >
            {publishing ? (
              <RefreshCw className="animate-spin" />
            ) : discoverable > 0 ? (
              <Check />
            ) : (
              <Globe />
            )}
            {publishing
              ? 'Publishing…'
              : discoverable > 0
                ? `Discoverable · ${discoverable}s`
                : 'Update'}
          </Button>

          {report === null ? null : (
            <p
              className={
                report.kind === 'success'
                  ? 'text-base text-muted-foreground'
                  : 'text-base text-destructive'
              }
            >
              {report.message}
            </p>
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
