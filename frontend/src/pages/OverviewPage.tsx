import { DataTable, FigureSkeletons, Panel, SectionHeading, StatTile, formatNumber } from '../components/DataDisplay';
import { PublicAddressTile } from '../components/PublicAddressTile';
import { RestrictionBadges, type Restrictions } from '../components/RestrictionBadges';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';

type Lobby = {
  id: number;
  name: string;
  players: number;
  restrictions: Restrictions;
};
type PublishedAddress = { characterId: number; characterName: string; address: string | null };
type Overview = {
  totals: { totalPlayers: number; connectedPlayers: number; totalGames: number };
  lobbies: Lobby[];
  publishedAddress: PublishedAddress | null;
};

/**
 * The page a signed-in account lands on: how many people are on the server, the
 * gameplay lobbies they are spread across, and the address their own last
 * character publishes.
 *
 * The four figures at the top are the whole state of the server in one line each
 * — how many players it has, how many are on it now, how many games it has
 * hosted, and what address the reader publishes — and the lobby table below says
 * where the connected ones are. The counts come from the character and game rows
 * rather than from totals the server keeps, because a kept total is a number
 * that is right until the process that kept it stops. Reading the rows means the
 * figures and the lobby list beside them are the same reading of the same moment.
 *
 * The published address is the one figure here that is about the person reading
 * rather than the server, and it is the one that goes stale, so its button is
 * inside its own tile rather than in a toolbar under the row — which also leaves
 * the page with no refresh button of its own, since the figures are read on
 * arrival and the one control here that has to be pressed is the one inside the
 * address.
 */
export function OverviewPage() {
  const { data, error, loading, reload } = useApiResource<Overview>('/api/overview');

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Overview"
        subtitle="How many players are on the server, and which lobbies they are in."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      {data === null ? (
        <FigureSkeletons />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total players" value={formatNumber(data.totals.totalPlayers)} />
          <StatTile label="Online players" value={formatNumber(data.totals.connectedPlayers)} />
          <StatTile label="Total games" value={formatNumber(data.totals.totalGames)} />
          <PublicAddressTile
            address={data.publishedAddress?.address ?? null}
            onPublished={reload}
          />
        </div>
      )}

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
