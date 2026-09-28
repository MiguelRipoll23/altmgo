import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiRequest, describeError } from '../api';
import { DataTable, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { readSessionToken } from '../session';
import { inputClassName, labelClassName, primaryButtonClassName } from '../theme';

type Schedule = {
  id: number;
  name: string;
  enabled: boolean;
  publish_start: number;
  publish_end: number;
  team_capacity: number;
};

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

/** The lobby modes an event can be played in, as the event subsystem numbers them. */
const modes = [
  { value: 3, label: 'Tournament' },
  { value: 4, label: 'Survival' },
  { value: 10, label: 'Tournament registration' },
] as const;

/**
 * The Tournament schedules, and the state of whichever event is selected.
 *
 * Publishing a schedule is the thing that makes an event enterable at all, so
 * the form is the reason this page exists for a moderator; the entries and the
 * bracket below are what they publish one in order to watch.
 */
export function TournamentPage() {
  const [event, setEvent] = useState('');
  const [submitted, setSubmitted] = useState('');

  const schedules = useApiResource<{ schedules: Schedule[] }>('/api/events/3/schedules');
  const detail = useApiResource<Tournament>(
    submitted === '' ? null : `/api/tournament?event=${encodeURIComponent(submitted)}`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Tournament"
        subtitle="The scheduled events, and the state of the one you select."
      />

      <CreateSchedulePanel onChanged={schedules.reload} />

      <Panel title="Scheduled Tournament events">
        <DataTable
          rows={schedules.data?.schedules ?? []}
          rowKey={(row) => row.id}
          empty={schedules.loading ? 'Reading the schedule…' : 'No Tournament event is scheduled.'}
          columns={[
            { header: 'Name', cell: (row) => row.name },
            { header: 'Id', cell: (row) => row.id, className: 'text-right tabular-nums' },
            { header: 'Published', cell: (row) => (row.enabled ? 'Yes' : 'No') },
            { header: 'Field', cell: (row) => `${row.team_capacity} teams` },
            { header: 'Opens', cell: (row) => formatEpoch(row.publish_start) },
            { header: 'Closes', cell: (row) => formatEpoch(row.publish_end) },
          ]}
        />
      </Panel>

      <Panel>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event_) => {
            event_.preventDefault();
            setSubmitted(event.trim());
          }}
        >
          <div className="min-w-48 flex-1">
            <label htmlFor="event" className={labelClassName}>
              Event id
            </label>
            <input
              id="event"
              type="number"
              min={1}
              value={event}
              onChange={(event_) => setEvent(event_.target.value)}
              placeholder="The id of a scheduled event"
              className={inputClassName}
            />
          </div>

          <button type="submit" className={primaryButtonClassName}>
            Show event
          </button>
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
              <p className="text-sm text-slate-500">This event has not been drawn yet.</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-400">
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

/** Renders an epoch second the way the schedule stores it. */
function formatEpoch(seconds: number): string {
  return seconds === 0 ? 'Stays open' : formatDate(new Date(seconds * 1000));
}

/**
 * Publishes a new event.
 *
 * The window is asked for in local date and time rather than as epoch seconds,
 * because an operator scheduling an event is thinking in the hour it starts, and
 * the conversion to the epoch second the column holds happens here rather than
 * being asked of them.
 */
function CreateSchedulePanel({ onChanged }: { onChanged: () => void }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('3');
  const [capacity, setCapacity] = useState('8');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      await apiRequest('/api/moderator/schedules', {
        method: 'POST',
        token: readSessionToken(),
        body: {
          mode: Number(mode),
          name: name.trim(),
          teamCapacity: Number(capacity),
          publishStart: toEpoch(opensAt),
          publishEnd: closesAt === '' ? 0 : toEpoch(closesAt),
          enabled: true,
        },
      });

      setStatus({ kind: 'success', message: `"${name.trim()}" was published.` });
      setName('');
      setOpensAt('');
      setClosesAt('');
      onChanged();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Schedule an event">
      <form onSubmit={create} className="space-y-4">
        {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="schedule-name" className={labelClassName}>
              Name
            </label>
            <input
              id="schedule-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="schedule-mode" className={labelClassName}>
              Lobby
            </label>
            <select
              id="schedule-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className={inputClassName}
            >
              {modes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="schedule-capacity" className={labelClassName}>
              Teams in the field
            </label>
            <input
              id="schedule-capacity"
              type="number"
              min={1}
              max={8}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="schedule-opens" className={labelClassName}>
              Opens at
            </label>
            <input
              id="schedule-opens"
              type="datetime-local"
              required
              value={opensAt}
              onChange={(event) => setOpensAt(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="schedule-closes" className={labelClassName}>
              Closes at, if it does
            </label>
            <input
              id="schedule-closes"
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <button type="submit" disabled={saving || name.trim().length === 0} className={primaryButtonClassName}>
          {saving ? 'Publishing…' : 'Publish event'}
        </button>
      </form>
    </Panel>
  );
}

/**
 * Reads a local date and time as the epoch second the column stores.
 *
 * A blank or unparsable field is zero, which the column reads as "now" on open
 * and "never closes" on close: a schedule that is already open rather than one
 * that was scheduled for a moment that has not arrived.
 */
function toEpoch(value: string): number {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
}
