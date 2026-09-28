import { DataTable, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { primaryButtonClassName } from '../theme';

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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className={primaryButtonClassName}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <Panel>
        <DataTable
          rows={data?.games ?? []}
          rowKey={(row) => row.id}
          empty={loading ? 'Reading the rooms…' : 'No game is being hosted right now.'}
          columns={[
            {
              header: 'Room',
              cell: (row) => (
                <span>
                  <span className="font-medium text-slate-200">{row.name}</span>
                  {row.hasPassword ? (
                    <span className="ml-2 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300">
                      password
                    </span>
                  ) : null}
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
