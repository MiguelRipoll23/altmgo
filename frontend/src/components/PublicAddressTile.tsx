import { Globe, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { readSessionToken } from '../session';
import { StatTile } from './DataDisplay';
import { Button } from './ui/button';

/**
 * The address the caller's own last character publishes, with the button that
 * corrects it inside the same tile.
 *
 * This is the one figure on either overview that is about the person reading
 * rather than the server, and it is the one that goes stale: a host whose
 * network changed still sees the address they had yesterday until they press the
 * button. The button therefore sits inside the tile, under the value it acts
 * on, rather than in a row of its own below the figures — a control that belongs
 * to one number and is drawn apart from it is a control somebody presses for the
 * wrong number.
 *
 * Both overviews show it, and both show the caller's own address rather than a
 * server-wide one. A server behind a single address has one figure that is the
 * same for everybody and worth nothing on a dashboard; the address that has to
 * be correct is the one another player would use to join this person's game.
 */
export function PublicAddressTile({
  address,
  loading,
  onPublished,
}: {
  /** The published address, or nothing when the account has none to publish. */
  address: string | null;
  /** Whether the figure is still being read. */
  loading: boolean;
  /** Called after a successful publish, so the page can read the address again. */
  onPublished: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [report, setReport] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  async function publish() {
    setPublishing(true);
    setReport(null);

    try {
      await apiRequest('/api/addresses', { method: 'POST', token: readSessionToken() });
      setReport({ kind: 'success', message: 'Your address was published.' });
      onPublished();
    } catch (caught) {
      setReport({ kind: 'error', message: describeError(caught) });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <StatTile
      label="Your public IP"
      textual
      value={loading ? '—' : (address ?? 'Not published')}
      action={
        <div className="space-y-2">
          <Button
            size="sm"
            className="w-full"
            onClick={() => void publish()}
            disabled={publishing || (address === null && !loading)}
          >
            {publishing ? <RefreshCw className="animate-spin" /> : <Globe />}
            {publishing ? 'Publishing…' : 'Update my IP'}
          </Button>

          {report === null ? null : (
            <p
              className={
                report.kind === 'success'
                  ? 'text-xs text-muted-foreground'
                  : 'text-xs text-destructive'
              }
            >
              {report.message}
            </p>
          )}

          {address === null && !loading ? (
            <p className="text-xs text-muted-foreground">
              None of your characters has a connection row yet, so there is no address to publish.
              Open a game in the client first.
            </p>
          ) : null}
        </div>
      }
    />
  );
}
