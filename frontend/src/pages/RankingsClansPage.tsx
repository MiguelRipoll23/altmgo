import { RankingsBoard } from '../components/RankingsBoard';

/**
 * The boards about clans, one window of one at a time.
 *
 * It is a page of its own rather than half of a rankings page with a subject
 * selector, because players and clans are two different sets of boards rather than
 * one list filtered. Fewer of them, too: there is no clan counterpart to a host
 * rating or an instructor rating, so the page offers the three that mean something
 * for a clan rather than the five a character is measured on.
 */
export function RankingsClansPage() {
  return <RankingsBoard subject="clans" />;
}
