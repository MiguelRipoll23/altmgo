import { RankingsBoard } from '../components/RankingsBoard';

/**
 * The boards about characters, one window of one at a time.
 *
 * It is a page of its own rather than half of a rankings page with a subject
 * selector, because players and clans are two different sets of boards rather than
 * one list filtered: a host rating is a vote cast about a character, and there is
 * nothing for a clan to be rated on. Choosing between them changes which boards
 * exist, so it belongs in the path the sidebar links to rather than in a control
 * that could then be in a state the address disagrees with.
 */
export function RankingsPlayersPage() {
  return <RankingsBoard subject="players" />;
}
