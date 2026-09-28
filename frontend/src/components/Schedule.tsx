/** One published event, as the schedule table holds it. */
export type Schedule = {
  id: number;
  name: string;
  enabled: boolean;
  publish_start: number;
  publish_end: number;
  team_capacity: number;
};

/**
 * Renders an epoch second the way the schedule stores it.
 *
 * A zero open time is not a moment — it is the column's way of saying the event is
 * open now, and a zero close time says it never closes. Both would otherwise print
 * as the epoch itself, which is a number every reader has to convert and none of
 * them will.
 */
export function formatEpoch(seconds: number): string {
  return seconds === 0 ? 'Stays open' : new Date(seconds * 1000).toLocaleString();
}
