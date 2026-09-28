import { Plus } from 'lucide-react';
import { useState } from 'react';
import { apiRequest, describeError } from '../api';
import { Panel, SectionHeading } from '../components/DataDisplay';
import { ScheduleList, type Schedule } from '../components/ScheduleForm';
import { ServerCharacterPool, type ServerCharacter } from '../components/ServerCharacterPool';
import { StatusMessage } from '../components/StatusMessage';
import { TeamCard, type Team } from '../components/TeamCard';
import { useApiResource } from '../components/useApiResource';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { isModerator, readSessionRoles, readSessionToken } from '../session';

type Survival = { teams: Team[]; schedules: Schedule[] };

/** The lobby mode Survival is played in, as the event subsystem numbers it. */
const SurvivalMode = 4;

/**
 * The Survival teams, and — for a moderator — the controls to run them.
 *
 * The page itself is open to any signed-in account, because the ladder is public
 * in the game: a player can see who is on it and what they have won, and hiding
 * that from the dashboard while showing it in the client would be a strange
 * thing to have done. What a player does not get is the writing — forming a team,
 * changing a state, filling one with server characters. Those controls are drawn
 * only for a moderator, and the server refuses them whatever the browser drew,
 * so the check here is a convenience rather than the boundary.
 */
export function SurvivalPage() {
  const mayWrite = isModerator(readSessionRoles());
  const data = useApiResource<Survival>('/api/survival');
  const pool = useApiResource<{ characters: ServerCharacter[] }>(
    mayWrite ? '/api/moderator/server-characters' : null,
  );
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const reloadAll = () => {
    data.reload();
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

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Survival"
        subtitle="The teams on the Survival ladder, and the controls to run them."
      />

      {data.error === null ? null : <StatusMessage kind="error">{data.error}</StatusMessage>}
      {status === null ? null : <StatusMessage kind={status.kind}>{status.message}</StatusMessage>}

      {mayWrite ? (
        <>
          <CreateTeamPanel
            onCreated={(message) => setStatus({ kind: 'success', message })}
            onFailed={(message) => setStatus({ kind: 'error', message })}
          />

          <Panel
            title="Server characters"
            description="The dedicated match rooms, placed on a team by hand."
          >
            <ServerCharacterPool
              characters={pool.data?.characters ?? []}
              teams={(data.data?.teams ?? []).map((team) => ({ id: team.id, name: team.name }))}
              onChanged={reloadAll}
            />
          </Panel>
        </>
      ) : null}

      <Panel title="Teams">
        {data.data?.teams.length === 0 && !data.loading ? (
          <p className="text-sm text-muted-foreground">No team has been formed on Survival.</p>
        ) : null}

        <div className="space-y-4">
          {(data.data?.teams ?? []).map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              mayWrite={mayWrite}
              onWrite={write}
              onChanged={reloadAll}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Scheduled Survival events">
        <ScheduleList
          schedules={data.data?.schedules ?? []}
          mayWrite={mayWrite}
          onWrite={write}
          onChanged={data.reload}
          empty={data.loading ? 'Reading the schedule…' : 'No Survival event is scheduled.'}
        />
      </Panel>
    </div>
  );
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
