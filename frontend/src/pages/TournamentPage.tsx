import { Search } from 'lucide-react';
import { useState } from 'react';
import { DataTable, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { CreateSchedulePanel, ScheduleList, type Schedule } from '../components/ScheduleForm';
import { ServerCharacterPool, type ServerCharacter } from '../components/ServerCharacterPool';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { isModerator, readSessionRoles } from '../session';
import { apiRequest, describeError } from '../api';

type Entry = {
  event_id: number;
  character_id: number;
  character_name: string;
  team_id: number | null;
  slot_index: number;
  reserved_at: string;
};

type Fixture = {
  id: number;
  round_index: number;
  first_team_id: number;
  second_team_id: number;
  winner_team_id: number;
  first_team_name: string | null;
  second_team_name: string | null;
  reported_at: string;
};

type Bracket = {
  event_id: number;
  status: number;
  current_round: number;
  champion_team_id: number | null;
  champion_team_name: string | null;
  seeds: { seed_index: number; team_id: number; team_name: string | null }[];
};

type Tournament = { event: number; entries: Entry[]; bracket: Bracket | null; fixtures: Fixture[] };

/**
 * The Tournament schedules, and the state of whichever event is selected.
 *
 * Like Survival, the page is open to any signed-in account: the events and the
 * bracket behind them are what the client announces, so a player may read them
 * here. Publishing one, editing its window or withdrawing it is a moderator
 * action, and those controls are the only thing on this page a player does not
 * get.
 */
export function TournamentPage() {
  const mayWrite = isModerator(readSessionRoles());
  const [event, setEvent] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const schedules = useApiResource<{ schedules: Schedule[] }>('/api/events/3/schedules');
  const pool = useApiResource<{ characters: ServerCharacter[] }>(
    mayWrite ? '/api/moderator/server-characters' : null,
  );
  const detail = useApiResource<Tournament>(
    submitted === '' ? null : `/api/tournament?event=${encodeURIComponent(submitted)}`,
  );

  async function write(action: () => Promise<unknown>, done: string) {
    setStatus(null);

    try {
      await action();
      setStatus({ kind: 'success', message: done });
      schedules.reload();
      pool.reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Tournament"
        subtitle="The scheduled events, and the state of the one you select."
      />

      {schedules.error === null ? null : <StatusMessage kind="error">{schedules.error}</StatusMessage>}
      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      {mayWrite ? <CreateSchedulePanel onChanged={schedules.reload} /> : null}

      <Panel title="Scheduled Tournament events">
        <ScheduleList
          schedules={schedules.data?.schedules ?? []}
          mayWrite={mayWrite}
          onWrite={write}
          onChanged={schedules.reload}
          empty={schedules.loading ? 'Reading the schedule…' : 'No Tournament event is scheduled.'}
        />
      </Panel>

      {mayWrite ? (
        <Panel
          title="Server characters"
          description="The dedicated match rooms, placed on a team by hand."
        >
          <ServerCharacterPool
            characters={pool.data?.characters ?? []}
            teams={teamsOfBracket(detail.data)}
            onChanged={() => {
              schedules.reload();
              pool.reload();
            }}
          />
        </Panel>
      ) : null}

      <Panel>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(submittedEvent) => {
            submittedEvent.preventDefault();
            setSubmitted(event.trim());
          }}
        >
          <div className="min-w-48 flex-1 space-y-2">
            <Label htmlFor="event">Event id</Label>
            <Input
              id="event"
              type="number"
              min={1}
              value={event}
              onChange={(changed) => setEvent(changed.target.value)}
              placeholder="The id of a scheduled event"
            />
          </div>

          <Button type="submit">
            <Search />
            Show event
          </Button>
        </form>
      </Panel>

      {detail.error === null ? null : <StatusMessage kind="error">{detail.error}</StatusMessage>}

      {detail.data === null ? null : (
        <>
          <Panel title={`Registrations for event ${detail.data.event}`}>
            <DataTable
              rows={detail.data.entries}
              rowKey={(row) => row.character_id}
              empty={
                detail.loading ? 'Reading the registrations…' : 'Nobody has registered for this event.'
              }
              columns={[
                { header: 'Character', cell: (row) => row.character_name },
                { header: 'Team', cell: (row) => row.team_id },
                {
                  header: 'Slot',
                  cell: (row) => row.slot_index,
                  className: 'text-right tabular-nums',
                },
                { header: 'Reserved', cell: (row) => formatDate(row.reserved_at) },
              ]}
            />
          </Panel>

          <Panel title="Bracket">
            {detail.data.bracket === null ? (
              <p className="text-sm text-muted-foreground">This event has not been drawn yet.</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Round {detail.data.bracket.current_round}
                  {detail.data.bracket.champion_team_name === null
                    ? ''
                    : ` · won by ${detail.data.bracket.champion_team_name}`}
                </p>

                <DataTable
                  rows={detail.data.bracket.seeds}
                  rowKey={(row) => row.seed_index}
                  empty="The bracket has no seeds."
                  columns={[
                    {
                      header: 'Seed',
                      cell: (row) => row.seed_index + 1,
                      className: 'text-right tabular-nums',
                    },
                    { header: 'Team', cell: (row) => row.team_name },
                  ]}
                />
              </>
            )}
          </Panel>

          <Panel title="Fixtures">
            <DataTable
              rows={detail.data.fixtures}
              rowKey={(row) => row.id}
              empty={detail.loading ? 'Reading the fixtures…' : 'No fixture has been played.'}
              columns={[
                {
                  header: 'Round',
                  cell: (row) => row.round_index,
                  className: 'text-right tabular-nums',
                },
                { header: 'First', cell: (row) => row.first_team_name },
                { header: 'Second', cell: (row) => row.second_team_name },
                {
                  header: 'Winner',
                  cell: (row) =>
                    row.winner_team_id === row.first_team_id
                      ? row.first_team_name
                      : row.winner_team_id === row.second_team_id
                        ? row.second_team_name
                        : null,
                },
                { header: 'Reported', cell: (row) => formatDate(row.reported_at) },
              ]}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

/** The teams of the selected bracket, which is what the pool can be pointed at. */
function teamsOfBracket(tournament: Tournament | null): { id: number; name: string }[] {
  return (tournament?.bracket?.seeds ?? [])
    .filter((seed) => seed.team_id !== null && seed.team_name !== null)
    .map((seed) => ({ id: seed.team_id as number, name: seed.team_name as string }));
}
