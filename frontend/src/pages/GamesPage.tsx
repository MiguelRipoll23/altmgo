import { RefreshCw } from 'lucide-react';
import { DataTable, Panel, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

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
 *
 * Nothing here writes, which is a decision rather than an oversight. A game row
 * belongs to the host, who rewrites it on every heartbeat, so anything corrected
 * from here lasts until the host saves its own — and the host, the lobby, the
 * players, the rounds and the status are all the game's to move while it is being
 * played. A dashboard that wrote them would produce a room whose state the game
 * server knows nothing about. The server is what runs the rooms; this page shows
 * which are up.
 */
export function GamesPage() {
  const rooms = useApiResource<{ games: Game[] }>('/api/games');
  const { data, error, loading, reload } = rooms;

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
          <p className="text-base text-muted-foreground">
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
