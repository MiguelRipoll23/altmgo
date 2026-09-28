import { Panel, SectionHeading } from '../components/DataDisplay';
import { ScheduleList, type Schedule } from '../components/ScheduleForm';
import { StatusMessage } from '../components/StatusMessage';
import { TeamCard, type Team } from '../components/TeamCard';
import { useApiResource } from '../components/useApiResource';

type Survival = { teams: Team[]; schedules: Schedule[] };

/**
 * The Survival events that are scheduled, and the teams that play them.
 *
 * The page is open to any signed-in account, because the ladder is public in the
 * game: a player can see who is on it and what they have won, and hiding that from
 * the dashboard while showing it in the client would be a strange thing to have
 * done.
 *
 * The schedule comes first because it is the earlier question. A player opening
 * this page is asking one of two things — is there a Survival event on, and when
 * does the next one start — and the answer to the first is a line of dates rather
 * than a list of rosters. Putting the teams above it answers a question nobody
 * came with until they had already read the dates.
 *
 * Nothing here writes. Forming a team, changing a state, filling one with server
 * characters and scheduling an event all moved to the event operations section,
 * which is where a moderator does that work. The reason is reach rather than
 * tidiness: this page is reached by players who came to read the ladder, and a
 * "create team" form and a roster editor sitting on it put a delete-shaped
 * control within a click of a refresh button for no benefit to the reader.
 */
export function SurvivalPage() {
  const data = useApiResource<Survival>('/api/survival');

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Survival"
        subtitle="The events played on Survival, and the teams on the ladder."
      />

      {data.error === null ? null : <StatusMessage kind="error">{data.error}</StatusMessage>}

      <Panel title="Scheduled Survival events">
        <ScheduleList
          schedules={data.data?.schedules ?? []}
          mayWrite={false}
          onWrite={noop}
          onChanged={noop}
          empty={data.loading ? 'Reading the schedule…' : 'No Survival event is scheduled.'}
        />
      </Panel>

      <Panel title="Teams">
        {data.data?.teams.length === 0 && !data.loading ? (
          <p className="text-sm text-muted-foreground">No team has been formed on Survival.</p>
        ) : null}

        <div className="space-y-4">
          {(data.data?.teams ?? []).map((team) => (
            <TeamCard key={team.id} team={team} mayWrite={false} onWrite={noop} onChanged={noop} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** A write this page never makes, because the controls that make one live elsewhere. */
function noop(): void {}
