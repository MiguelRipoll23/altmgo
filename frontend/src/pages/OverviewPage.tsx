import { useState } from 'react';
import { DataTable, Panel, SectionHeading, StatTile, formatDate } from '../components/DataDisplay';
import { DiscordMessageCard } from '../components/DiscordMessageCard';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { isManager, type StaffRole } from '../session';
import { primaryButtonClassName } from '../theme';

type Lobby = { id: number; name: string; address: string; players: number };
type Connected = {
  characterId: number;
  name: string;
  lobbyId: number;
  lobbyName: string;
  lastSeen: string;
};
type Overview = {
  totals: { connectedPlayers: number; lobbiesWithPlayers: number };
  lobbies: Lobby[];
  connected: Connected[];
};

/**
 * The page a signed-in account lands on: how many people are on the server right
 * now, and which lobby each of them is in.
 *
 * The count comes from the character presence table rather than from a total the
 * server keeps, because a kept total is a number that is right until the process
 * that kept it stops. Reading the rows means the figure and the list beside it
 * are the same reading of the same moment, and an operator who sees 42 players
 * can see which 42.
 */
export function OverviewPage({ accountName, roles }: { accountName: string; roles: StaffRole[] }) {
  const { data, error, loading, reload } = useApiResource<Overview>('/api/overview');
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title={`Signed in as ${accountName}`}
        subtitle="Who is connected right now, and which lobby they are in."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Connected players" value={data?.totals.connectedPlayers ?? '—'} />
        <StatTile label="Lobbies with players" value={data?.totals.lobbiesWithPlayers ?? '—'} />
        <StatTile label="Lobbies up" value={data?.lobbies.length ?? '—'} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || refreshing}
          className={primaryButtonClassName}
        >
          {loading || refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <Panel title="Connected players">
        <DataTable
          rows={data?.connected ?? []}
          rowKey={(row) => row.characterId}
          empty={loading ? 'Reading who is connected…' : 'Nobody is connected right now.'}
          columns={[
            { header: 'Character', cell: (row) => row.name },
            { header: 'Lobby', cell: (row) => row.lobbyName },
            { header: 'Last seen', cell: (row) => formatDate(row.lastSeen) },
          ]}
        />
      </Panel>

      <Panel title="Lobbies">
        <DataTable
          rows={data?.lobbies ?? []}
          rowKey={(row) => row.id}
          empty={loading ? 'Reading the lobbies…' : 'No lobby is running.'}
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

      {isManager(roles) ? <DiscordMessageCard /> : null}
    </div>
  );
}
