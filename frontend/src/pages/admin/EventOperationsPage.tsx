import { Plus } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../../api';
import { Panel, SectionHeading } from '../../components/DataDisplay';
import { CreateSchedulePanel, ScheduleList, type Schedule } from '../../components/ScheduleForm';
import { ServerCharacterPool, type ServerCharacter } from '../../components/ServerCharacterPool';
import { StatusMessage } from '../../components/StatusMessage';
import { TeamCard, type Team, type Write } from '../../components/TeamCard';
import { useApiResource } from '../../components/useApiResource';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { readSessionToken } from '../../session';

/**
 * Every moderator action across the event modes, on one page.
 *
 * These controls used to sit on the Survival and Tournament sections, where a
 * player reading the ladder had a "create team" form within reach of the list they
 * came for. Splitting them out keeps the public sections public: Survival and
 * Tournament now show what has been formed, and the writing happens here where the
 * only thing on the screen is writing.
 *
 * The mode is a selector rather than three separate pages because a moderator
 * running an evening moves between them mid-session, and the server character pool
 * in particular is a single set of characters that any of the three can be placed
 * on — one pool, three places to point it, which is why it follows the selector
 * rather than being duplicated per mode.
 */

/** The lobby modes an event can be played in, as the event subsystem numbers them. */
const modes = [
  { value: '4', label: 'Survival' },
  { value: '3', label: 'Tournament' },
  { value: '10', label: 'Tournament registration' },
] as const;

/**
 * The event operations, for whichever lobby mode is selected.
 *
 * The route is gated on the moderator role, so the page does not re-check it: it
 * draws every control it has and the server refuses whatever it should. A page that
 * hid its own controls would only teach an operator to look somewhere else for them.
 */
export function EventOperationsPage() {
  const [mode, setMode] = useState<string>('4');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const teams = useApiResource<{ teams: Team[] }>(`/api/events/${mode}/teams`);
  const schedules = useApiResource<{ schedules: Schedule[] }>(`/api/events/${mode}/schedules`);
  const pool = useApiResource<{ characters: ServerCharacter[] }>('/api/moderator/server-characters');

  const reloadAll = () => {
    teams.reload();
    schedules.reload();
    pool.reload();
  };

  async function write(action: () => Promise<unknown>, done: string) {
    setStatus(null);

    try {
      await action();
      setStatus({ kind: 'success', message: done });
      reloadAll();
    } catch (caught) {
      setStatus({ kind: 'error', message: describeError(caught) });
    }
  }

  const writeNow: Write = (action, done) => void write(action, done);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Event operations"
        subtitle="Forming teams, publishing events and placing the dedicated match characters."
      />

      <Panel>
        <div className="space-y-2">
          <Label htmlFor="event-mode">Lobby mode</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger id="event-mode" className="w-64">
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
      </Panel>

      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      <CreateTeamPanel
        mode={Number(mode)}
        onCreated={(message) => {
          setStatus({ kind: 'success', message });
          reloadAll();
        }}
        onFailed={(message) => setStatus({ kind: 'error', message })}
      />

      <Panel title="Teams">
        {teams.error === null ? null : <StatusMessage kind="error">{teams.error}</StatusMessage>}

        {teams.data?.teams.length === 0 && !teams.loading ? (
          <p className="text-sm text-muted-foreground">
            No team has been formed in this lobby mode.
          </p>
        ) : null}

        <div className="space-y-4">
          {(teams.data?.teams ?? []).map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              mayWrite
              onWrite={writeNow}
              onChanged={reloadAll}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Scheduled events">
        <ScheduleList
          schedules={schedules.data?.schedules ?? []}
          mayWrite
          onWrite={writeNow}
          onChanged={schedules.reload}
          empty="No event is scheduled in this mode."
          loading={schedules.loading}
          loadingLabel="Reading the schedule…"
        />
      </Panel>

      <CreateSchedulePanel onChanged={schedules.reload} />

      <Panel
        title="Server characters"
        description="The dedicated match rooms, placed on a team by hand."
      >
        <ServerCharacterPool
          characters={pool.data?.characters ?? []}
          teams={(teams.data?.teams ?? []).map((team) => ({ id: team.id, name: team.name }))}
          onChanged={reloadAll}
        />
      </Panel>
    </div>
  );
}

/**
 * The form that forms a team.
 *
 * The owner is named by character rather than chosen from a list of accounts: a
 * team is led by a character in the game world, and the server resolves the name
 * against the characters that exist, so an operator types the name the client shows.
 */
function CreateTeamPanel({
  mode,
  onCreated,
  onFailed,
}: {
  mode: number;
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
        body: { mode, name: name.trim(), ownerName: owner.trim(), comment },
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
    <Panel title="Create a team">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="team-name">Team name</Label>
          <Input id="team-name" type="text" value={name} onChange={(event) => setName(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team-owner">Leader</Label>
          <Input
            id="team-owner"
            type="text"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Character name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="team-comment">Comment</Label>
          <Input
            id="team-comment"
            type="text"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
      </div>

      <Button
        className="mt-4"
        onClick={() => void create()}
        disabled={creating || name.trim().length === 0 || owner.trim().length === 0}
      >
        <Plus />
        {creating ? 'Creating…' : 'Create team'}
      </Button>
    </Panel>
  );
}
