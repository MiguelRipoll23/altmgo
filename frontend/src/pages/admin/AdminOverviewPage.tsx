import {
  MessageSquare,
  Newspaper,
  RefreshCw,
  SlidersHorizontal,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable, Panel, SectionHeading, StatTile, formatNumber } from '../../components/DataDisplay';
import { PublicAddressTile } from '../../components/PublicAddressTile';
import { RestrictionBadges, type Restrictions } from '../../components/RestrictionBadges';
import { formatEpoch, type Schedule } from '../../components/ScheduleForm';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import { Button } from '../../components/ui/button';
import { isManager, isModerator, readSessionRoles, type StaffRole } from '../../session';

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

type Schedules = { schedules: Schedule[] };

/** One published event, carrying the mode it belongs to so it can be told apart. */
type ListedSchedule = Schedule & { modeLabel: string };

/** A staff section offered as a shortcut, with the role that opens it. */
type Shortcut = { to: string; label: string; icon: LucideIcon; role: StaffRole };

/**
 * The staff sections, in the order an operator is most likely to reach for them.
 *
 * The order is the work: run what is happening, then decide who may act, then say
 * something to the players. The read-only sections are not here because the sidebar
 * already lists them and they are not what somebody opens the admin frame to do.
 */
const shortcuts: Shortcut[] = [
  {
    to: '/admin/event-operations',
    label: 'Event operations',
    icon: SlidersHorizontal,
    role: 'moderator',
  },
  { to: '/admin/accounts', label: 'Accounts and roles', icon: UserCog, role: 'manager' },
  { to: '/admin/announcements', label: 'Mail and news', icon: Newspaper, role: 'manager' },
  { to: '/admin/discord', label: 'Discord', icon: MessageSquare, role: 'manager' },
];

/**
 * What an operator wants before anything else: how many people are on, where they
 * are, and what is scheduled.
 *
 * It is a separate page from the player overview rather than the same one, because
 * the two answer different questions. The player overview is about the account
 * reading it — how many are here, and what address do I publish. This one is about
 * the server: the same figures and the same lobbies, but read as "is anything
 * wrong with the rooms" rather than "what is my address", with the published
 * events underneath because an event left published after it finished is the
 * thing an operator most often has to notice on their way in.
 *
 * The address tile is the operator's own rather than the server's, and it is here
 * for the same reason it is on the player overview: an operator hosting a game
 * from their own account is the one person on this page for whom a stale address
 * costs something, and the button that corrects it belongs inside the tile.
 */
export function AdminOverviewPage() {
  const overview = useApiResource<Overview>('/api/overview');

  // The API answers one event mode per request, and the page wants one list of
  // what is published across all three. They are read as three separate resources
  // rather than in a loop over the modes: a hook called once per element of an
  // array is a hook called a different number of times whenever that array changes
  // length, and this one is written out so that cannot happen.
  const survival = useApiResource<Schedules>('/api/events/4/schedules');
  const tournament = useApiResource<Schedules>('/api/events/3/schedules');
  const registration = useApiResource<Schedules>('/api/events/10/schedules');

  const listed: ListedSchedule[] = [
    { read: survival, label: 'Survival' },
    { read: tournament, label: 'Tournament' },
    { read: registration, label: 'Tournament registration' },
  ].flatMap((entry) =>
    (entry.read.data?.schedules ?? []).map((schedule) => ({
      ...schedule,
      modeLabel: entry.label,
    })),
  );

  const reading =
    overview.loading || survival.loading || tournament.loading || registration.loading;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Admin overview"
        subtitle="How many players are on, where they are, and what is published."
      />

      {overview.error === null ? null : <StatusMessage kind="error">{overview.error}</StatusMessage>}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            overview.reload();
            survival.reload();
            tournament.reload();
            registration.reload();
          }}
        >
          <RefreshCw />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          label="Total players"
          value={
            overview.data === null ? '—' : formatNumber(overview.data.totals.totalPlayers)
          }
        />
        <StatTile
          label="Online players"
          value={
            overview.data === null ? '—' : formatNumber(overview.data.totals.connectedPlayers)
          }
        />
        <StatTile
          label="Total games"
          value={overview.data === null ? '—' : formatNumber(overview.data.totals.totalGames)}
        />
        <StatTile
          label="Occupied lobbies"
          value={(overview.data?.lobbies ?? []).filter((lobby) => lobby.players > 0).length}
        />
        <PublicAddressTile
          address={overview.data === null ? null : (overview.data.publishedAddress?.address ?? null)}
          loading={overview.loading}
          onPublished={overview.reload}
        />
      </div>

      <StaffShortcuts />

      <Panel title="Published events">
        <DataTable
          rows={listed}
          rowKey={(row) => `${row.modeLabel}-${row.id}`}
          empty={reading ? 'Reading the schedule…' : 'No event is published in any mode.'}
          columns={[
            { header: 'Event', cell: (row) => row.name },
            { header: 'Mode', cell: (row) => row.modeLabel },
            { header: 'Enabled', cell: (row) => (row.enabled ? 'yes' : 'no') },
            { header: 'Opens', cell: (row) => formatEpoch(row.publish_start) },
            { header: 'Closes', cell: (row) => formatEpoch(row.publish_end) },
            {
              header: 'Teams',
              cell: (row) => row.team_capacity,
              className: 'text-right tabular-nums',
            },
          ]}
        />
      </Panel>

      <Panel title="Game lobbies">
        <DataTable
          rows={overview.data?.lobbies ?? []}
          rowKey={(row) => row.id}
          empty={overview.loading ? 'Reading the lobbies…' : 'No game lobby is running.'}
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
 * The staff sections, as links.
 *
 * They are filtered by the same roles the sidebar uses, from the same stored list,
 * so a shortcut can never offer a page the sidebar has decided this account may not
 * open. A moderator sees the event operations link and not the manager ones, which
 * is the whole value of putting these here rather than a fixed row of four.
 */
function StaffShortcuts() {
  const roles = readSessionRoles();

  const shown = shortcuts.filter((shortcut) =>
    shortcut.role === 'manager' ? isManager(roles) : isModerator(roles),
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {shown.map((shortcut) => (
        <Link
          key={shortcut.to}
          to={shortcut.to}
          className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <shortcut.icon className="size-4 shrink-0 text-primary" />
          {shortcut.label}
        </Link>
      ))}
    </div>
  );
}
