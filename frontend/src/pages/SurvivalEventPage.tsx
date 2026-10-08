import { CalendarClock, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { LoadingBlock, Panel, SectionHeading } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { TeamCard, type Team } from '../components/TeamCard';
import { useApiResource } from '../components/useApiResource';
import { formatEpoch, type Schedule } from '../components/Schedule';
import { Badge } from '../components/ui/badge';

/** Lobby selector of Survival, as the event subsystem numbers them. */
const SurvivalMode = 4;

/**
 * One Survival event: when it runs, how big it is, and who is on the ladder that
 * would enter it.
 *
 * It is a page reached from a card rather than a panel that expanded under the
 * list, so the event can be sent to somebody and opened on its own — and because
 * the ladder is long, a page that opened on the list and expanded an event above
 * it would be a page whose interesting half had been scrolled past.
 *
 * The event itself is found by reading the mode's schedules and picking the one
 * asked for, rather than by a read of its own. There is one small list of them
 * per mode, an event page is opened from that list, and a route that returned
 * nothing for an id that is not there would be a second way of being told the
 * same thing.
 *
 * The teams are below the event rather than inside it because no team belongs to
 * one Survival event: the ladder is the ladder, and an event decides when it is
 * played and how many teams it takes. The page is open to any signed-in account,
 * because the ladder and the events are public in the game.
 *
 * Nothing here writes. Scheduling an event, correcting its window, forming a team
 * and filling one are a moderator's work, and the server is what performs them; this
 * page shows the event and the ladder that would enter it.
 */
export function SurvivalEventPage() {
  const { identifier } = useParams();

  const schedules = useApiResource<{ schedules: Schedule[] }>(
    `/api/events/${SurvivalMode}/schedules`,
  );
  const teams = useApiResource<{ teams: Team[] }>(`/api/events/${SurvivalMode}/teams`);

  const schedule = schedules.data?.schedules.find((entry) => entry.id === Number(identifier));

  return (
    <div className="space-y-6">
      <SectionHeading title={schedule?.name ?? 'Survival event'} />

      {schedules.error === null ? null : <StatusMessage kind="error">{schedules.error}</StatusMessage>}

      {schedule === undefined ? (
        schedules.loading ? (
          <p className="text-base text-muted-foreground">Reading the event…</p>
        ) : (
          <StatusMessage kind="error">
            There is no Survival event with that id. It may have been withdrawn.
          </StatusMessage>
        )
      ) : (
        <Panel>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-base uppercase tracking-widest text-muted-foreground">Window</dt>
                <dd className="mt-1 text-base text-foreground">
                  {schedule.publish_start === 0
                    ? 'Open now'
                    : `Opens ${formatEpoch(schedule.publish_start)}`}
                  <br />
                  {schedule.publish_end === 0
                    ? 'No closing time'
                    : `Closes ${formatEpoch(schedule.publish_end)}`}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="text-base uppercase tracking-widest text-muted-foreground">Field</dt>
                <dd className="mt-1 text-base text-foreground">
                  {schedule.team_capacity} teams
                  <br />
                  {schedule.enabled ? (
                    'Open for registration'
                  ) : (
                    <Badge variant="secondary">not open</Badge>
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </Panel>
      )}

      <SectionHeading title="The ladder" />

      {teams.error === null ? null : <StatusMessage kind="error">{teams.error}</StatusMessage>}

      {teams.data?.teams.length === 0 ? (
        teams.loading ? (
          <LoadingBlock centered />
        ) : (
          <p className="text-base text-muted-foreground">No team has been formed on Survival.</p>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(teams.data?.teams ?? []).map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
