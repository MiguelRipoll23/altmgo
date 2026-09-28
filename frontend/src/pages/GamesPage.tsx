import { RefreshCw } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { DataTable, Panel, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';

type Game = {
  id: number;
  name: string;
  comment: string;
  hostName: string | null;
  lobbyName: string | null;
  players: number;
  maximumPlayers: number;
  mode: number;
  status: number;
  hasPassword: boolean;
  updatedAt: string;
};

/**
 * The rooms that are up right now.
 *
 * A room stops being listed once the host stops writing to it, so an empty list
 * means no game is being hosted rather than that the page has lost the rooms it
 * once showed. The list is a live thing by nature and is not a record of what
 * was played.
 */
export function GamesPage() {
  const { data, error, loading, reload } = useApiResource<{ games: Game[] }>('/api/games');

  return (
    <div className="space-y-6">
      <SectionHeading title="Games" subtitle="The rooms that are being hosted right now." />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={reload} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : undefined} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>

        {loading || data === null ? null : (
          <p className="text-sm text-muted-foreground">
            {formatNumber(data.games.length)} {data.games.length === 1 ? 'room' : 'rooms'} being hosted
          </p>
        )}
      </div>

      <Panel>
        <DataTable
          rows={data?.games ?? []}
          rowKey={(row) => row.id}
          empty="No game is being hosted right now."
          loading={loading}
          loadingLabel="Reading the rooms…"
          columns={[
            {
              header: 'Room',
              cell: (row) => (
                <span className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{row.name}</span>
                  {row.hasPassword ? <Badge variant="warning">password</Badge> : null}
                </span>
              ),
            },
            { header: 'Host', cell: (row) => row.hostName },
            { header: 'Lobby', cell: (row) => row.lobbyName },
            {
              header: 'Players',
              cell: (row) => `${row.players} / ${row.maximumPlayers}`,
              className: 'text-right tabular-nums',
            },
            { header: 'Comment', cell: (row) => row.comment },
            { header: 'Updated', cell: (row) => formatDate(row.updatedAt) },
          ]}
        />
      </Panel>
    </div>
  );
}
