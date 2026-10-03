import { ArrowLeft, Crown, Swords, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  LoadingBlock,
  Panel,
  SectionHeading,
  formatDate,
  formatNumber,
} from '../components/DataDisplay';
import { PageTabs } from '../components/PageTabs';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';

type Entry = {
  character_id: number;
  character_name: string;
  team_name: string | null;
  slot_index: number;
  reserved_at: string;
};

type Fixture = {
  id: number;
  round_index: number;
  first_team_name: string | null;
  second_team_name: string | null;
  winner_team_id: number;
  first_team_id: number;
  second_team_id: number;
  reported_at: string;
};

type Bracket = {
  current_round: number;
  champion_team_name: string | null;
  seeds: { seed_index: number; team_name: string | null }[];
};

type Tournament = { event: number; entries: Entry[]; bracket: Bracket | null; fixtures: Fixture[] };

/** Which of the three views of an event is being read. */
export type TournamentArea = 'registrations' | 'bracket' | 'fixtures';

/** What each view is called, as the tab names it. */
const areas: Record<TournamentArea, { label: string }> = {
  registrations: { label: 'Registrations' },
  bracket: { label: 'Bracket' },
  fixtures: { label: 'Fixtures' },
};

/**
 * One Tournament event: who registered, how the bracket was drawn, and what has
 * been played.
 *
 * Nothing here takes an id from the reader. The event is reached from a card that
 * names it, and the id in the address is there so the page can be sent to
 * somebody — which is the whole reason it is a page and not a panel that appeared
 * under the list when a row was clicked.
 *
 * The three parts are three pages rather than three cards on one, for the reason
 * the sidebar's sub-options are pages: a bracket that has not been drawn, a field of
 * a hundred registrations and a list of fixtures are three different pages to be in,
 * and the one a reader wants is usually not the one the page opens on. Each has its
 * own segment under the event, so the address says which is being read, the row of
 * tabs can be linked to, and the back button walks out of the bracket and back into
 * it. Registrations are the bare event path, so the address a card has always led to
 * is still an address rather than a redirect to one of its sections.
 *
 * The three are cards rather than tables. A registration is a person and the team
 * they are in, a seed is an order, and a fixture is a match with a winner: none of
 * them is a row of columns, and a table of them asks a reader to match up headers
 * to work out who beat whom. As cards, a fixture says "Team A beat Team B" in the
 * order it was played.
 *
 * Nothing here writes. Publishing an event, correcting its window, withdrawing it
 * and forming the teams a bracket is drawn from are a moderator's work, and the
 * server is what performs them; this page shows what the event has come to.
 */
export function TournamentEventPage({ area = 'registrations' }: { area?: TournamentArea }) {
  const { identifier } = useParams();

  const { data, error, loading } = useApiResource<Tournament>(
    `/api/tournament?event=${encodeURIComponent(identifier ?? '')}`,
  );

  const eventPath = `/dashboard/tournament/${identifier}`;

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/tournament"
        className="inline-flex items-center gap-2 text-base font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All Tournament events
      </Link>

      <SectionHeading title={`Tournament event ${identifier}`} />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}
      <PageTabs
        label="Sections of this event"
        tabs={[
          {
            to: eventPath,
            label: areas.registrations.label,
            badge: data === null ? undefined : formatNumber(data.entries.length),
          },
          { to: `${eventPath}/bracket`, label: areas.bracket.label },
          {
            to: `${eventPath}/fixtures`,
            label: areas.fixtures.label,
            badge: data === null ? undefined : formatNumber(data.fixtures.length),
          },
        ]}
      />

      {area === 'registrations' ? <Registrations data={data} loading={loading} /> : null}
      {area === 'bracket' ? <BracketPanel data={data} loading={loading} /> : null}
      {area === 'fixtures' ? <Fixtures data={data} loading={loading} /> : null}

    </div>
  );
}

/**
 * Who registered, in the order they reserved their place.
 *
 * The order is the place they took rather than the order they arrived or the order
 * they are drawn, because a registration list that is not in registration order is a
 * list a reader has to sort before reading.
 */
function Registrations({ data, loading }: { data: Tournament | null; loading: boolean }) {
  const entries = [...(data?.entries ?? [])].sort(
    (left, right) => left.slot_index - right.slot_index,
  );

  if (entries.length === 0) {
    return (
      <Panel>
        {loading ? (
          <LoadingBlock />
        ) : (
          <p className="text-base text-muted-foreground">Nobody has registered for this event.</p>
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <div
            key={entry.character_id}
            className="rounded-lg border border-border bg-background/40 px-4 py-3"
          >
            <p className="font-semibold text-foreground">{entry.character_name}</p>
            <p className="mt-1 text-base text-muted-foreground">
              {entry.team_name ?? 'No team yet'}
            </p>
            <p className="mt-1 text-base text-muted-foreground">
              Place {entry.slot_index} · reserved {formatDate(entry.reserved_at)}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The draw, and how far the tournament has gone. */
function BracketPanel({ data, loading }: { data: Tournament | null; loading: boolean }) {
  const bracket = data?.bracket ?? null;

  return (
    <Panel>
      {bracket === null ? (
        loading ? (
          <LoadingBlock />
        ) : (
          <p className="text-base text-muted-foreground">This event has not been drawn yet.</p>
        )
      ) : (
        <>
          <p className="mb-4 flex flex-wrap items-center gap-2 text-base text-muted-foreground">
            <Trophy className="size-4 shrink-0" />
            Round {bracket.current_round}
            {bracket.champion_team_name === null ? null : (
              <Badge variant="success">
                <Crown className="size-3" />
                {bracket.champion_team_name}
              </Badge>
            )}
          </p>

          {bracket.seeds.length === 0 ? (
            <p className="text-base text-muted-foreground">The bracket has no seeds.</p>
          ) : (
            <ol className="grid gap-2 sm:grid-cols-2">
              {bracket.seeds.map((seed) => (
                <li
                  key={seed.seed_index}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-4 py-2.5"
                >
                  <span className="w-6 shrink-0 text-right text-base tabular-nums text-muted-foreground">
                    {seed.seed_index + 1}
                  </span>
                  <span className="font-medium text-foreground">
                    {seed.team_name ?? 'To be decided'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Panel>
  );
}

/**
 * The matches that have been played, most recently reported first.
 *
 * A fixture is reported the moment it finishes, so the order they arrived in is the
 * order they were played, and a reader asking "what happened last" reads the top row
 * rather than the bottom.
 */
function Fixtures({ data, loading }: { data: Tournament | null; loading: boolean }) {
  const fixtures = [...(data?.fixtures ?? [])].sort(
    (left, right) => new Date(right.reported_at).getTime() - new Date(left.reported_at).getTime(),
  );

  if (fixtures.length === 0) {
    return (
      <Panel>
        {loading ? (
          <LoadingBlock />
        ) : (
          <p className="text-base text-muted-foreground">No fixture has been played.</p>
        )}
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="grid gap-3 sm:grid-cols-2">
        {fixtures.map((fixture) => {
          const first = fixture.winner_team_id === fixture.first_team_id;
          const winner = first ? fixture.first_team_name : fixture.second_team_name;

          return (
            <div
              key={fixture.id}
              className="rounded-lg border border-border bg-background/40 px-4 py-3"
            >
              <p className="text-base uppercase tracking-widest text-muted-foreground">
                Round {fixture.round_index + 1}
              </p>

              <p className="mt-2 flex items-center gap-2 text-base">
                <Swords className="size-3.5 shrink-0 text-muted-foreground" />
                <span className={first ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                  {fixture.first_team_name ?? 'To be decided'}
                </span>
                <span className="text-muted-foreground">vs</span>
                <span className={first ? 'text-muted-foreground' : 'font-semibold text-foreground'}>
                  {fixture.second_team_name ?? 'To be decided'}
                </span>
              </p>

              <p className="mt-1 text-base text-muted-foreground">
                {winner === null ? 'No winner reported' : `${winner} won`} ·{' '}
                {formatDate(fixture.reported_at)}
              </p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
