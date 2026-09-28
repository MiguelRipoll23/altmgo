import { Panel, SectionHeading } from '../components/DataDisplay';
import { ScheduleList, type Schedule } from '../components/ScheduleForm';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';

/** Lobby selector of Survival, as the event subsystem numbers them. */
const SurvivalMode = 4;

/**
 * The Survival events that are published, and when each is enterable.
 *
 * It is a page of its own rather than the top half of the Survival page, because a
 * schedule and a ladder are not two halves of one thing: somebody who came to ask
 * when the next event opens should not have to scroll past every team on the
 * server to find out, and somebody reading rosters should not have to get past
 * the schedule to reach them. Splitting them gives each a path, so either can be
 * linked to and reloaded on its own.
 *
 * It reads the schedules of the Survival mode rather than the wider survival
 * endpoint, so a page about dates does not also read every team on the ladder to
 * draw them.
 *
 * The page is open to any signed-in account, because the ladder is public in the
 * game: a player can see what is published and when, and hiding that from the
 * dashboard while showing it in the client would be a strange thing to have done.
 *
 * Nothing here writes. Scheduling an event is a moderator's work and lives in the
 * event operations section; this page is reached by players who came to read what
 * is on.
 */
export function SurvivalEventsPage() {
  const { data, error, loading } = useApiResource<{ schedules: Schedule[] }>(
    `/api/events/${SurvivalMode}/schedules`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Survival events"
        subtitle="What is published on the Survival ladder, and when it is enterable."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel title="Scheduled events">
        <ScheduleList
          schedules={data?.schedules ?? []}
          mayWrite={false}
          onWrite={noop}
          onChanged={noop}
          empty={loading ? 'Reading the schedule…' : 'No Survival event is scheduled.'}
        />
      </Panel>
    </div>
  );
}

/** A write this page never makes, because the controls that make one live elsewhere. */
function noop(): void {}
