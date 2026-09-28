import { useState } from 'react';
import { Panel, SectionHeading } from '../../components/DataDisplay';
import { CreateSchedulePanel, ScheduleList, type Schedule } from '../../components/ScheduleForm';
import { ServerCharacterPool, type ServerCharacter } from '../../components/ServerCharacterPool';
import { StatusMessage } from '../../components/StatusMessage';
import { TeamCard, type Team } from '../../components/TeamCard';
import { CreateTeamPanel } from '../../components/TeamForm';
import { useApiResource } from '../../components/useApiResource';
import { useEventWrite } from '../../components/useEventWrite';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

/**
 * Every moderator action across the event modes, on one page.
 *
 * The Survival and Tournament sections now carry these controls themselves, in the
 * staff frame, because a moderator working an evening is looking at the ladder they
 * are about to put a team on rather than at a separate console. This page is what is
 * left over once each section has its own: the server character pool, which is one
 * set of characters that any of the three modes can draw on, and so has no single
 * section to live in.
 *
 * The mode is a selector rather than three separate pages because the pool is one
 * pool with three places to point it, which is why the selector follows the pool
 * rather than the other way round.
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

  const teams = useApiResource<{ teams: Team[] }>(`/api/events/${mode}/teams`);
  const schedules = useApiResource<{ schedules: Schedule[] }>(`/api/events/${mode}/schedules`);
  const pool = useApiResource<{ characters: ServerCharacter[] }>('/api/moderator/server-characters');

  const { status, setStatus, write: writeNow } = useEventWrite(
    teams.reload,
    schedules.reload,
    pool.reload,
  );

  const reloadAll = () => {
    teams.reload();
    schedules.reload();
    pool.reload();
  };

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
