import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiRequest, describeError } from '../api';
import { readSessionToken } from '../session';
import { LoadingBlock, Panel } from './DataDisplay';
import { StatusMessage } from './StatusMessage';
import type { Write } from './TeamCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

/** One published event, as the schedule table holds it. */
export type Schedule = {
  id: number;
  name: string;
  enabled: boolean;
  publish_start: number;
  publish_end: number;
  team_capacity: number;
};

/** The lobby modes an event can be played in, as the event subsystem numbers them. */
const modes = [
  { value: '3', label: 'Tournament' },
  { value: '4', label: 'Survival' },
  { value: '10', label: 'Tournament registration' },
] as const;

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

/** Renders an epoch second the way the schedule stores it. */
export function formatEpoch(seconds: number): string {
  return seconds === 0 ? 'Stays open' : new Date(seconds * 1000).toLocaleString();
}

/**
 * Publishes a new event.
 *
 * The window is asked for in local date and time rather than as epoch seconds,
 * because an operator scheduling an event is thinking in the hour it starts, and
 * the conversion to the epoch second the column holds happens here rather than
 * being asked of them.
 */
export function CreateSchedulePanel({ onChanged }: { onChanged: () => void }) {
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
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-mode">Lobby</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="schedule-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-capacity">Teams in the field</Label>
            <Input
              id="schedule-capacity"
              type="number"
              min={1}
              max={8}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-opens">Opens at</Label>
            <Input
              id="schedule-opens"
              type="datetime-local"
              required
              value={opensAt}
              onChange={(event) => setOpensAt(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-closes">Closes at, if it does</Label>
            <Input
              id="schedule-closes"
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={saving || name.trim().length === 0}>
          <Plus />
          {saving ? 'Publishing…' : 'Publish event'}
        </Button>
      </form>
    </Panel>
  );
}

/** Turns an epoch second back into the local field the form edits. */
function fromEpoch(seconds: number): string {
  if (seconds === 0) {
    return '';
  }

  const date = new Date(seconds * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 16);
}

/**
 * One published event, and — for a moderator — the controls that change or close
 * it.
 *
 * Editing an event is not a form that opens on another page: the values being
 * changed are the ones already on the row, so the row expands to hold them and
 * the operator is editing the event they meant rather than a copy of it.
 */
function ScheduleRow({
  schedule,
  mayWrite,
  onWrite,
  onChanged,
}: {
  schedule: Schedule;
  mayWrite: boolean;
  onWrite: Write;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(schedule.name);
  const [capacity, setCapacity] = useState(String(schedule.team_capacity));
  const [opensAt, setOpensAt] = useState(fromEpoch(schedule.publish_start));
  const [closesAt, setClosesAt] = useState(fromEpoch(schedule.publish_end));
  const [enabled, setEnabled] = useState(schedule.enabled);

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{schedule.name}</p>
          <p className="text-xs text-muted-foreground">
            {schedule.enabled ? 'Published' : 'Withdrawn'} · {schedule.team_capacity} teams · opens{' '}
            {schedule.publish_start === 0 ? 'now' : formatEpoch(schedule.publish_start)} · closes{' '}
            {schedule.publish_end === 0 ? 'never' : formatEpoch(schedule.publish_end)}
          </p>
        </div>

        {mayWrite ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing((open) => !open)}>
              <Pencil />
              {editing ? 'Cancel' : 'Edit'}
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                onWrite(
                  () =>
                    apiRequest(`/api/moderator/schedules/${schedule.id}`, {
                      method: 'DELETE',
                      token: readSessionToken(),
                    }),
                  `"${schedule.name}" was withdrawn.`,
                )
              }
            >
              <Trash2 />
              Withdraw
            </Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${schedule.id}`}>Name</Label>
            <Input
              id={`name-${schedule.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`capacity-${schedule.id}`}>Teams in the field</Label>
            <Input
              id={`capacity-${schedule.id}`}
              type="number"
              min={1}
              max={8}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`opens-${schedule.id}`}>Opens at</Label>
            <Input
              id={`opens-${schedule.id}`}
              type="datetime-local"
              value={opensAt}
              onChange={(event) => setOpensAt(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`closes-${schedule.id}`}>Closes at, if it does</Label>
            <Input
              id={`closes-${schedule.id}`}
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
            <label className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="size-4 accent-primary"
              />
              Published
            </label>

            <Button
              disabled={name.trim().length === 0}
              onClick={() => {
                onWrite(
                  () =>
                    apiRequest(`/api/moderator/schedules/${schedule.id}`, {
                      method: 'PUT',
                      token: readSessionToken(),
                      body: {
                        name: name.trim(),
                        teamCapacity: Number(capacity),
                        publishStart: opensAt === '' ? 0 : toEpoch(opensAt),
                        publishEnd: closesAt === '' ? 0 : toEpoch(closesAt),
                        enabled,
                      },
                    }),
                  `"${schedule.name}" was updated.`,
                );
                onChanged();
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The published events of one lobby mode, with the controls a moderator acts on
 * them with.
 *
 * The list is open to any signed-in account, because the events a server has
 * published are the same ones announced in the client. The controls are not.
 */
export function ScheduleList({
  schedules,
  mayWrite,
  onWrite,
  onChanged,
  empty,
  loading = false,
  loadingLabel = 'Loading…',
}: {
  schedules: Schedule[];
  mayWrite: boolean;
  onWrite: Write;
  onChanged: () => void;
  empty: string;
  /** Whether the schedules are still being read. */
  loading?: boolean;
  /** What the reading is, for the case where there is nothing to keep on screen. */
  loadingLabel?: string;
}) {
  if (schedules.length === 0) {
    return loading ? (
      <LoadingBlock label={loadingLabel} />
    ) : (
      <p className="text-sm text-muted-foreground">{empty}</p>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule) => (
        <ScheduleRow
          key={schedule.id}
          schedule={schedule}
          mayWrite={mayWrite}
          onWrite={onWrite}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}
