import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { DataTable, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { readSessionToken } from '../session';
import { inputClassName, labelClassName, primaryButtonClassName, secondaryButtonClassName } from '../theme';

type Member = { slot: number; character_id: number; name: string; state: number };
type Team = {
  id: number;
  name: string;
  comment: string;
  state: number;
  match_type: number;
  lobby_name: string | null;
  consecutive_wins: number;
  paid_reward: number;
  created_at: string;
  members: Member[];
};

type Schedule = {
  id: number;
  name: string;
  enabled: boolean;
  publish_start: number;
  publish_end: number;
  team_capacity: number;
};

type Survival = { teams: Team[]; schedules: Schedule[] };

/** The lobby mode Survival is played in, as the event subsystem numbers it. */
const SurvivalMode = 4;

/** The team state a moderator can put a team into, and what it means. */
const teamStates = [
  { value: 'joinable', label: 'Joinable' },
  { value: 'queued', label: 'Queued' },
] as const;

/** The member state a moderator can put a member into. */
const memberStates = [
  { value: 'pending', label: 'Pending' },
  { value: 'ready', label: 'Ready' },
] as const;

/** The states as the numbers they are stored as, for showing what a row holds. */
const teamStateNames: Record<number, string> = { 1: 'Joinable', 9: 'Queued' };
const memberStateNames: Record<number, string> = { 1: 'Pending', 2: 'Ready' };

/**
 * The Survival teams, and the three things a moderator does to them: form a team,
 * put a character on one, and change a state.
 *
 * The "add a player" field is how a `server-` character gets onto a team. Those
 * belong to the dedicated match rooms rather than to a player, so there is no
 * client on the other end to join from — a moderator types the name and the row
 * is written.
 */
export function SurvivalPage() {
  const { data, error, loading, reload } = useApiResource<Survival>('/api/survival');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  async function write(action: () => Promise<unknown>, done: string) {
    setStatus(null);

    try {
      await action();
      setStatus({ kind: 'success', message: done });
      reload();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Survival"
        subtitle="The teams on the Survival ladder, and the controls to run them."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}
      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      <CreateTeamPanel
        onCreated={(message) => setStatus({ kind: 'success', message })}
        onFailed={(message) => setStatus({ kind: 'error', message })}
      />

      <Panel title="Teams">
        {data?.teams.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">No team has been formed on Survival.</p>
        ) : null}

        <div className="space-y-4">
          {(data?.teams ?? []).map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onWrite={write}
              busy={status !== null}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Scheduled Survival events">
        <DataTable
          rows={data?.schedules ?? []}
          rowKey={(row) => row.id}
          empty={loading ? 'Reading the schedule…' : 'No Survival event is scheduled.'}
          columns={[
            { header: 'Name', cell: (row) => row.name },
            {
              header: 'Published',
              cell: (row) => (row.enabled ? 'Yes' : 'No'),
            },
            { header: 'Field', cell: (row) => `${row.team_capacity} teams` },
            { header: 'Opens', cell: (row) => formatEpoch(row.publish_start) },
            { header: 'Closes', cell: (row) => formatEpoch(row.publish_end) },
          ]}
        />
      </Panel>
    </div>
  );
}

/** Renders an epoch second the way the schedule stores it. */
function formatEpoch(seconds: number): string {
  return seconds === 0 ? '—' : formatDate(new Date(seconds * 1000));
}

/** The form that forms a team. */
function CreateTeamPanel({
  onCreated,
  onFailed,
}: {
  onCreated: (message: string) => void;
  onFailed: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [comment, setComment] = useState('');
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);

    try {
      await apiRequest('/api/moderator/teams', {
        method: 'POST',
        token: readSessionToken(),
        body: { mode: SurvivalMode, name: name.trim(), ownerName: owner.trim(), comment },
      });

      onCreated(`Team "${name.trim()}" was created.`);
      setName('');
      setOwner('');
      setComment('');
    } catch (caught) {
      onFailed(describeError(caught));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Panel title="Create a Survival team">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="team-name" className={labelClassName}>
            Team name
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="team-owner" className={labelClassName}>
            Leader
          </label>
          <input
            id="team-owner"
            type="text"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Character name"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="team-comment" className={labelClassName}>
            Comment
          </label>
          <input
            id="team-comment"
            type="text"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void create()}
        disabled={creating || name.trim().length === 0 || owner.trim().length === 0}
        className={`${primaryButtonClassName} mt-4`}
      >
        {creating ? 'Creating…' : 'Create team'}
      </button>
    </Panel>
  );
}

/** One team, its roster, and the controls that act on it. */
function TeamCard({
  team,
  onWrite,
  busy,
}: {
  team: Team;
  onWrite: (action: () => Promise<unknown>, done: string) => void;
  busy: boolean;
}) {
  const [memberName, setMemberName] = useState('');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-100">{team.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {teamStateNames[team.state] ?? `State ${team.state}`} · {team.members.length} member
            {team.members.length === 1 ? '' : 's'} · {team.consecutive_wins} win
            {team.consecutive_wins === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {teamStates.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={busy}
              onClick={() =>
                onWrite(
                  () =>
                    apiRequest(`/api/moderator/teams/${team.id}/state`, {
                      method: 'PUT',
                      token: readSessionToken(),
                      body: { state: option.value },
                    }),
                  `${team.name} is now ${option.label.toLowerCase()}.`,
                )
              }
              className={secondaryButtonClassName}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <DataTable
          rows={team.members}
          rowKey={(row) => row.slot}
          empty="This team has nobody on it."
          columns={[
            { header: 'Slot', cell: (row) => row.slot, className: 'text-right tabular-nums' },
            {
              header: 'Character',
              cell: (row) =>
                row.name.startsWith('server-') ? (
                  <span>
                    {row.name}{' '}
                    <span className="ml-1 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[11px] text-sky-300">
                      server
                    </span>
                  </span>
                ) : (
                  row.name
                ),
            },
            {
              header: 'State',
              cell: (row) => memberStateNames[row.state] ?? `State ${row.state}`,
            },
            {
              header: 'Set',
              cell: (row) => (
                <span className="flex flex-wrap gap-1.5">
                  {memberStates.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        onWrite(
                          () =>
                            apiRequest(`/api/moderator/teams/${team.id}/members/${row.slot}`, {
                              method: 'PUT',
                              token: readSessionToken(),
                              body: { state: option.value },
                            }),
                          `${row.name} is ${option.label.toLowerCase()}.`,
                        )
                      }
                      className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100 disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <label htmlFor={`member-${team.id}`} className={labelClassName}>
            Add a character
          </label>
          <input
            id={`member-${team.id}`}
            type="text"
            value={memberName}
            onChange={(event) => setMemberName(event.target.value)}
            placeholder="Character name, or a server- one"
            className={inputClassName}
          />
        </div>

        <button
          type="button"
          disabled={busy || memberName.trim().length === 0}
          onClick={() => {
            onWrite(
              () =>
                apiRequest(`/api/moderator/teams/${team.id}/members`, {
                  method: 'POST',
                  token: readSessionToken(),
                  body: { characterName: memberName.trim() },
                }),
              `${memberName.trim()} was added to ${team.name}.`,
            );
            setMemberName('');
          }}
          className={primaryButtonClassName}
        >
          Add
        </button>
      </div>
    </div>
  );
}
