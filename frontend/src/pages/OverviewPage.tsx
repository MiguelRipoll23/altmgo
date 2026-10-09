import { ArrowRight, Gamepad2, Newspaper, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingBlock, SectionHeading, formatDay, formatNumber } from '../components/DataDisplay';
import { GameCard, type Game } from '../components/GameCard';
import { PublishedAddress } from '../components/PublishedAddress';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

/** One news item, as the login screen shows it. */
type NewsItem = {
  id: number;
  title: string;
  body: string;
  important: boolean;
  publishedAt: string;
};

/** The one request this page makes, and everything it draws. */
type Overview = {
  news: NewsItem[];
  games: Game[];
  /** Characters connected to the server right now. */
  connectedPlayers: number;
  /** Games being hosted right now, the rooms still beating. */
  totalGames: number;
  /** The address the account's most recently active character publishes. */
  publishedAddress: { characterId: number; characterName: string; address: string } | null;
};

/** The word a game with no lobby named is filed under. */
const UnnamedLobby = 'Unknown lobby';

/**
 * The page the dashboard opens with: the latest thing the server has said, and
 * what it is running right now.
 *
 * It is one request. The page was reading the news, the games and the figures
 * separately and had added the published address as a fourth, which meant four
 * round trips before anything could be drawn and four ways for the page to fail.
 * It is the page a reader lands on first, so it is the one where the wait is most
 * visible and the one where a half-drawn page is most confusing. One route now
 * answers all of it, and a reload after publishing — the only thing on this page
 * that writes — re-reads that one route rather than three.
 *
 * The page is also called "games" rather than "rooms" everywhere it names what it
 * lists. A room is the word the game server's tables use, and it leaked into the
 * page through the query rather than because the reader had ever heard it; the
 * player-facing word for the thing is a game, and the sidebar already calls the
 * page that shows them "Games".
 *
 * The figures sit in one line under the title rather than on tiles. How many
 * players are on the server, how many games are up and what address the reader
 * publishes are the size of the thing and the reader's own place in it — context
 * to be read or skipped in one glance, not the weight a row of bordered cards
 * under a heading gives to what a reader looks at first. The two counts are
 * coloured text rather than badges, because they are numbers to read rather than
 * labels on a thing, and the games count is read over the same window as the list
 * below it: a room whose host stopped answering is gone from the list and gone
 * from the count, so the number above the cards is the number of cards. Neither
 * says "hosted", because a game is a game while it is up and the page is about
 * what is up. The second is always plural, because a count that changes its noun
 * as it crosses one is arithmetic the reader can do and a flicker they should not
 * watch. `total players` did not come back at all: it is the one figure that only
 * ever goes up and says nothing about whether the server is being used.
 *
 * The page says it is reading once, in one place. It was saying it three times —
 * where the figures are, for the news, and for the games — which is a page that
 * reads as though it were doing three things, and it is one request, so there is
 * one moment of not knowing anything. Every other page says this once, in the
 * place its content will be.
 *
 * The cards are not inside a panel, and they are not under a heading of their
 * own. They are the page's content, set in a grid under the lobby each belongs
 * to: a card inside a bordered box inside a bordered box is two frames around one
 * thing, and a heading whose only content was that the things below it were the
 * things below them is a third frame drawn in words. The lobby name is the
 * heading, and it carries the count beside it.
 *
 * The lobby table this page used to carry went with that: it listed every lobby
 * the server runs including the empty ones, so a reader asking where the players
 * were had to count them out of a table. The games already group by the lobby
 * they are in, and a lobby with nothing in it is now simply not on the page.
 *
 * The four restriction flags each lobby carries went with the table, and nothing
 * on the dashboard draws them now: whether a lobby is beginners-only or needs the
 * expansion is a property of the lobby rather than of any game in it, so a lobby
 * with no games in it has nowhere to put the answer. That question needs a lobby
 * page, which this dashboard does not have.
 */
export function OverviewPage() {
  const { data, error } = useApiResource<Overview>('/api/overview');

  const latest = data?.news[0] ?? null;
  const games = data?.games ?? [];

  // Only lobbies with a game in them are drawn. The map is keyed by name because
  // the name is what a reader recognises and the id is a row number from another
  // table; a game whose lobby the server did not report is filed under a word
  // rather than dropped, since it is still a game somebody can join and "we could
  // not read its lobby" is a different fact from "we are hiding it".
  const groups = new Map<string, Game[]>();

  for (const game of games) {
    const key = game.lobbyName ?? UnnamedLobby;
    const group = groups.get(key);

    if (group === undefined) {
      groups.set(key, [game]);
    } else {
      group.push(game);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading title="Overview" className="mb-2" />

      {error !== null ? (
        <StatusMessage kind="error">{error}</StatusMessage>
      ) : data === null ? (
        // One reading for the whole page, because there is one request and so one
        // moment of not knowing anything, and because every other page in the
        // dashboard says this once in the place its content will be.
        <LoadingBlock centered />
      ) : (
        <>
          {/* The figures. They sit directly under the heading with the news and the
              games below them, so the page is one thing arriving rather than three
              arriving at once. */}
          <div className="mb-4 flex flex-wrap items-center gap-5 text-base">
            <span
              className="inline-flex items-center gap-2 text-muted-foreground"
              aria-label={`${formatNumber(data.connectedPlayers)} players online`}
              title="Players online"
            >
              <UserRound className="size-4 shrink-0 text-success" aria-hidden="true" />
              <span className="tabular-nums text-foreground">
                {formatNumber(data.connectedPlayers)} online
              </span>
            </span>

            <span
              className="inline-flex items-center gap-2 text-muted-foreground"
              aria-label={`${formatNumber(data.totalGames)} games`}
              title="Games"
            >
              <Gamepad2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="tabular-nums text-foreground">
                {formatNumber(data.totalGames)} games
              </span>
            </span>

            {/* The address is a fact about the reader rather than about the server,
                so it takes the purple badge — the one colour on the page that is
                not a claim about the server. It shares the row's gap with the two
                counts, whether it is written beside them or wrapped under them. */}
            <PublishedAddress address={data.publishedAddress?.address ?? null} />
          </div>

          {/* The latest item only, as a card rather than a list. The whole news page
              is one click away and this is the one a reader passing through the
              dashboard is most likely to want — so it is the opening of the newest
              item and a link onwards, not a shortened copy of the list, which
              would put the same item on two pages and make the news page a page
              whose first row is already on the one before it. */}
          {latest === null ? (
            <p className="text-base text-muted-foreground">
              The server has not published any news.
            </p>
          ) : (
            <Link
              to={`/dashboard/news/${latest.id}`}
              className="block rounded-xl border border-border bg-card/50 px-5 py-4 transition hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Newspaper
                  className={cn(
                    'size-4 shrink-0',
                    latest.important ? 'text-warning' : 'text-muted-foreground',
                  )}
                />
                <h2 className="min-w-0 text-lg font-extrabold tracking-tight text-foreground">
                  {latest.title}
                </h2>
                {latest.important ? <Badge variant="warning">important</Badge> : null}
              </div>

              <p className="mt-3 line-clamp-3 text-base leading-relaxed text-foreground/80">
                {latest.body}
              </p>

              {/* The date is a stamp on the foot of the card rather than a line
                  under the title. Under the title it read as part of the item's
                  heading — a fourth thing there to get through before the
                  paragraph — and it is not: news is read whenever a reader
                  arrives, so when it was published is the least interesting thing
                  about it, and the only thing worth keeping is the day. It shares
                  the foot with the link onwards because both are what a reader does
                  with the card after they have read it. */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-base font-medium text-primary">
                  Read the whole item
                  <ArrowRight className="size-3.5" />
                </span>

                <time
                  dateTime={latest.publishedAt}
                  className="text-base text-muted-foreground"
                >
                  {formatDay(latest.publishedAt)}
                </time>
              </div>
            </Link>
          )}

          {/* The games are the page, so there is no heading above them. "Games being
              hosted" sat over a set of cards that each already name their map and
              their mode, under headings that name the lobby they are in — a
              heading whose only content was that the things below it were the
              things below them. The lobby name is the heading now, and it is set at
              the size a heading is set at rather than at the size a heading inside
              a heading is set at, because there is no longer one above it.

              The link to the games page went with it. The sidebar is a click away
              and offers the same list with the filters on it, so a link here was a
              second way to the same games for no gain, and it sat where the
              reader's eye lands first. */}
          {games.length === 0 ? (
            <p className="text-base text-muted-foreground">
              No game is being hosted right now.
            </p>
          ) : (
            <div className="space-y-8">
              {[...groups.entries()].map(([lobby, lobbyGames]) => (
                <section key={lobby} className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                      {lobby}
                    </h2>
                    <p className="text-base text-muted-foreground tabular-nums">
                      {formatNumber(lobbyGames.length)}{' '}
                      {lobbyGames.length === 1 ? 'game' : 'games'}
                    </p>
                  </div>

                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {lobbyGames.map((game) => (
                      <li key={game.id} className="min-w-0">
                        <GameCard game={game} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}