import { ArrowLeft, Crown, Swords, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Panel, SectionHeading, formatDate } from '../components/DataDisplay';
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

/**
 * One Tournament event: who registered, how the bracket was drawn, and what has
 * been played.
 *
 * Nothing here takes an id from the reader. The event is reached from a card that
 * names it, and the id in the address is there so the page can be sent to
 * somebody — which is the whole reason it is a page and not a panel that appeared
 * under the list when a row was clicked.
 *
 * The three parts are cards rather than tables. A registration is a person and
 * the team they are in, a seed is an order, and a fixture is a match with a
 * winner: none of them is a row of columns, and a table of them asks a reader to
 * match up headers to work out who beat whom. As cards, a fixture says
 * "Team A beat Team B" in the order it was played.
 */
export function TournamentEventPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const { identifier } = useParams();
  const { data, error, loading } = useApiResource<Tournament>(
    `/api/tournament?event=${encodeURIComponent(identifier ?? '')}`,
  );

  return (
    <div className="space-y-6">
      <Link
        to={`${basePath}/tournament`}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All Tournament events
      </Link>

      <SectionHeading
        title={`Tournament event ${identifier}`}
        subtitle="Who registered, how the bracket was drawn, and what has been played."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel title="Registrations">
        {data?.entries.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">Nobody has registered for this event.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.entries ?? []).map((entry) => (
              <div
                key={entry.character_id}
                className="rounded-lg border border-border bg-background/40 px-4 py-3"
              >
                <p className="font-semibold text-foreground">{entry.character_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.team_name ?? 'No team yet'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Place {entry.slot_index} · reserved {formatDate(entry.reserved_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Bracket">
        {data?.bracket === null || data === null ? (
          <p className="text-sm text-muted-foreground">
            {loading ? 'Reading the bracket…' : 'This event has not been drawn yet.'}
          </p>
        ) : (
          <>
            <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="size-4 shrink-0" />
              Round {data.bracket.current_round}
              {data.bracket.champion_team_name === null ? null : (
                <Badge variant="success">
                  <Crown className="size-3" />
                  {data.bracket.champion_team_name}
                </Badge>
              )}
            </p>

            {data.bracket.seeds.length === 0 ? (
              <p className="text-sm text-muted-foreground">The bracket has no seeds.</p>
            ) : (
              <ol className="grid gap-2 sm:grid-cols-2">
                {data.bracket.seeds.map((seed) => (
                  <li
                    key={seed.seed_index}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-4 py-2.5"
                  >
                    <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
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

      <Panel title="Fixtures">
        {data?.fixtures.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No fixture has been played.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(data?.fixtures ?? []).map((fixture) => {
              const first = fixture.winner_team_id === fixture.first_team_id;
              const winner = first ? fixture.first_team_name : fixture.second_team_name;

              return (
                <div
                  key={fixture.id}
                  className="rounded-lg border border-border bg-background/40 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Round {fixture.round_index + 1}
                  </p>

                  <p className="mt-2 flex items-center gap-2 text-sm">
                    <Swords className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className={first ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                      {fixture.first_team_name ?? 'To be decided'}
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span
                      className={first ? 'text-muted-foreground' : 'font-semibold text-foreground'}
                    >
                      {fixture.second_team_name ?? 'To be decided'}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {winner === null ? 'No winner reported' : `${winner} won`} ·{' '}
                    {formatDate(fixture.reported_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
