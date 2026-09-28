import { EventCards } from '../components/EventCards';
import { SectionHeading } from '../components/DataDisplay';
import { CreateSchedulePanel, type Schedule } from '../components/ScheduleForm';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { useMayModerate } from '../components/useStaffRole';

/** Lobby selector of Survival, as the event subsystem numbers them. */
const SurvivalMode = 4;

/**
 * The Survival events that are published, each one a card leading to its own page.
 *
 * They are cards rather than rows because an event is four different kinds of
 * thing — a name, a window, a size and whether it is open — and a reader asking
 * "can I enter the next one" is asking about all four at once. A card is read in
 * one pass; a table asks for four columns to be held at the same time.
 *
 * Each card leads to a page rather than expanding here, so an event can be sent to
 * somebody and opened on its own, next to the ladder it draws.
 *
 * The page is open to any signed-in account, because the ladder is public in the
 * game: a player can see what is published and when, and hiding that from the
 * dashboard while showing it in the client would be a strange thing to have done.
 *
 * A moderator is also offered the form that publishes one, on this page rather than
 * on a console elsewhere. Scheduling an event is done while looking at what is
 * already published — to see what is on, to avoid overlapping it, to close the one
 * that finished — and a moderator sent to another page to do it is a moderator
 * holding two pages open to answer one question. It is drawn for the role and not
 * for the frame, so a moderator reading the ladder from the player dashboard has
 * the same controls there; the server refuses the write either way, and a page
 * hiding them from a moderator only teaches them where else to look.
 */
export function SurvivalEventsPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const mayModerate = useMayModerate();
  const schedules = useApiResource<{ schedules: Schedule[] }>(
    `/api/events/${SurvivalMode}/schedules`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Survival events"
        subtitle="What is published on the Survival ladder. Open one to see its details."
      />

      {schedules.error === null ? null : (
        <StatusMessage kind="error">{schedules.error}</StatusMessage>
      )}

      <EventCards
        schedules={schedules.data?.schedules ?? []}
        basePath={`${basePath}/survival/events`}
        empty="No Survival event is scheduled."
        loading={schedules.loading}
        loadingLabel="Reading the events…"
      />

      {mayModerate ? (
        <CreateSchedulePanel mode={SurvivalMode} onChanged={schedules.reload} />
      ) : null}
    </div>
  );
}
