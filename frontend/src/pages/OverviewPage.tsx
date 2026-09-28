import { Globe, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { DataTable, Panel, SectionHeading, StatTile } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { readSessionToken } from '../session';

/** What a lobby restricts, as the lobby itself configured it. */
type Restrictions = {
  beginnersOnly: boolean;
  expansionRequired: boolean;
  noHeadshots: boolean;
  replaysOnly: boolean;
};

type Lobby = {
  id: number;
  name: string;
  players: number;
  restrictions: Restrictions;
};
type PublishedAddress = { characterId: number; characterName: string; address: string | null };
type Overview = {
  totals: { connectedPlayers: number };
  lobbies: Lobby[];
  publishedAddress: PublishedAddress | null;
};

/**
 * The page a signed-in account lands on: how many people are on the server, the
 * gameplay lobbies they are spread across, and the address their own last
 * character publishes.
 *
 * The count comes from the character presence table rather than from a total the
 * server keeps, because a kept total is a number that is right until the process
 * that kept it stops. Reading the rows means the figure and the lobby list beside
 * it are the same reading of the same moment.
 *
 * The published address is the one figure here that is about the person reading
 * rather than the server, and it is the one that goes stale: a host whose
 * network changed still sees their old address until they press the button, so
 * the button sits next to the value rather than in a toolbar of its own.
 */
export function OverviewPage() {
  const { data, error, loading, reload } = useApiResource<Overview>('/api/overview');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<string | null>(null);

  async function publishAddress() {
    setPublishing(true);
    setPublished(null);

    try {
      await apiRequest('/api/addresses', { method: 'POST', token: readSessionToken() });
      setPublished('Your address was published for every character that has one.');
      reload();
    } catch (caught) {
      setPublished(describeError(caught));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Overview"
        subtitle="How many players are on the server, and which lobbies they are in."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Connected players"
          value={data?.totals.connectedPlayers ?? '—'}
        />
        <StatTile
          label="Your public IP"
          textual
          value={
            data === null
              ? '—'
              : (data.publishedAddress?.address ?? 'Not published')
          }
        />
      </div>

      {data?.publishedAddress === null && !loading ? (
        <StatusMessage kind="progress">
          None of your characters has a connection row yet, so there is no address to publish. Open
          a game in the client first.
        </StatusMessage>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void publishAddress()} disabled={publishing}>
          {publishing ? <RefreshCw className="animate-spin" /> : <Globe />}
          {publishing ? 'Publishing…' : 'Update my IP'}
        </Button>
      </div>

      {published === null ? null : <StatusMessage kind="success">{published}</StatusMessage>}

      <Panel title="Game lobbies">
        <DataTable
          rows={data?.lobbies ?? []}
          rowKey={(row) => row.id}
          empty={loading ? 'Reading the lobbies…' : 'No game lobby is running.'}
          columns={[
            { header: 'Lobby', cell: (row) => row.name },
            {
              header: 'Players',
              cell: (row) => row.players,
              className: 'text-right tabular-nums',
            },
            { header: 'Restrictions', cell: (row) => <RestrictionBadges restrictions={row.restrictions} /> },
          ]}
        />
      </Panel>
    </div>
  );
}

/**
 * The restrictions a lobby carries, as badges — and nothing at all when it
 * carries none.
 *
 * A lobby with no restrictions is the common case, and four columns of "no" for
 * every row is a table that has stopped saying anything. Showing only the flags
 * that are set makes the ones that are set the thing the eye goes to, which is
 * the whole reason the column is here: an operator is scanning for the lobby a
 * beginner can be sent to, and an empty cell answers that faster than four
 * "no"s do.
 */
function RestrictionBadges({ restrictions }: { restrictions: Restrictions }) {
  const shown = (Object.keys(flagLabels) as (keyof Restrictions)[])
    .filter((name) => restrictions[name])
    .map((name) => flagLabels[name]);

  if (shown.length === 0) {
    return <span className="text-muted-foreground">None</span>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {shown.map((label) => (
        <Badge key={label} variant="warning">
          {label}
        </Badge>
      ))}
    </span>
  );
}

/**
 * The words each flag is shown as, which are the client's own terms, in the
 * order a lobby screen shows them. This table is also the list of flags, so a
 * flag added to the query has to be added here or it is silently not shown.
 */
const flagLabels: Record<keyof Restrictions, string> = {
  beginnersOnly: 'Beginners only',
  expansionRequired: 'Expansion required',
  noHeadshots: 'No headshots',
  replaysOnly: 'Replays only',
};
