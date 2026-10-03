import { EventCards } from '../components/EventCards';
import { SectionHeading } from '../components/DataDisplay';
import type { Schedule } from '../components/Schedule';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';

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
 * Nothing here writes. Publishing an event, correcting its window and withdrawing
 * it are a moderator's work, and the server is what performs them; this page
 * shows what has been published and leaves it at that.
 */
export function SurvivalEventsPage({ basePath = '/dashboard' }: { basePath?: string }) {
  const schedules = useApiResource<{ schedules: Schedule[] }>(
    `/api/events/${SurvivalMode}/schedules`,
  );

  return (
    <div className="space-y-6">
      <SectionHeading title="Survival events" />

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
    </div>
  );
}
