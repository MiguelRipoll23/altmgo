import { Globe, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { DataTable, Panel, SectionHeading, StatTile } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Button } from '../components/ui/button';
import { readSessionToken } from '../session';

type Lobby = { id: number; name: string; address: string; players: number };
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
export function OverviewPage({ accountName }: { accountName: string }) {
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
        title={`Signed in as ${accountName}`}
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
            { header: 'Address', cell: (row) => <span className="font-mono text-xs">{row.address}</span> },
            {
              header: 'Players',
              cell: (row) => row.players,
              className: 'text-right tabular-nums',
            },
          ]}
        />
      </Panel>
    </div>
  );
}
