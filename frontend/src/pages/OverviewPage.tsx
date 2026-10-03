import { ArrowRight, Gamepad2, Newspaper, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingBlock, SectionHeading, formatDay, formatNumber } from '../components/DataDisplay';
import { GameCard, type Game } from '../components/GameCard';
import { PublishAddress } from '../components/PublishAddress';
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
  /** Every game the server has hosted, live or closed. */
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
 * players are on the server, how many games it has hosted and what address the
 * reader publishes are the size of the thing and the reader's own place in it —
 * context to be read or skipped in one glance, not the weight a row of bordered
 * cards under a heading gives to what a reader looks at first. The two counts are
 * badges so that they read as figures rather than as words in a sentence, and
 * neither says "hosted": a game is a game whether or not it is up, and the count
 * is of every one the server has run. `total players` did not come back at all: it
 * is the one figure that only ever goes up and says nothing about whether the
 * server is being used.
 *
 * The cards are not inside a panel. They are the page's content, set in a grid
 * under their lobby headings, and a card inside a bordered box inside a bordered
 * box is two frames around one thing — the outer one saying "here is a section"
 * about a section the reader can already see is a set of games. The count stays
 * in the heading beside the lobby's name rather than becoming a panel of its own.
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
  const { data, error, loading, reload } = useApiResource<Overview>('/api/overview');

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

      {/* One line, holding every figure the page carries. It keeps its height while
          the read is in flight rather than collapsing and pulling the news up when
          the numbers land, so nothing below it moves after a wait that was
          supposed to be still. */}
      <div className="mb-8 flex flex-wrap items-center gap-2 text-base">
        {data === null ? (
          <span className="text-muted-foreground opacity-0">Reading the server…</span>
        ) : (
          <>
            {/* Badges rather than bare figures, because a count on its own in a
                line of prose is a number the reader has to stop and read, and
                these two are the only numbers on the page. The badge says what
                each one is without a word of labelling around them, and the icon
                carries the meaning for a reader who does not read the text beside
                it — a figure that moves when the server is busy is a different
                shape from a figure that never does.

                They are `verbatim` rather than shouted: a badge elsewhere on the
                dashboard carries a state the dashboard worded for itself, and
                these carry numbers the server counted. Shouting a count makes it
                look like a status. */}
            <Badge variant="secondary" verbatim>
              <UserRound className="size-3 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {formatNumber(data.connectedPlayers)} online
              </span>
            </Badge>

            <Badge variant="secondary" verbatim>
              <Gamepad2 className="size-3 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {formatNumber(data.totalGames)}{' '}
                {data.totalGames === 1 ? 'game' : 'games'}
              </span>
            </Badge>

            {/* The address is a fact about the reader rather than about the server,
                so it is set apart from the two counts with the rule between them
                rather than by another separator: it is not a third number, and a
                line of three badges followed by an IP would read as though it
                were. */}
            <span aria-hidden="true" className="text-border">
              |
            </span>
            <PublishAddress
              address={data.publishedAddress?.address ?? null}
              onPublished={reload}
            />
          </>
        )}
      </div>

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      {/* The latest item only, as a card rather than a list. The whole news page is
          one click away and this is the one a reader passing through the dashboard
          is most likely to want — so it is the opening of the newest item and a
          link onwards, not a shortened copy of the list, which would put the same
          item on two pages and make the news page a page whose first row is
          already on the one before it. */}
      {loading ? (
        <LoadingBlock label="Reading the news…" />
      ) : latest === null ? (
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
                latest.important ? 'text-amber-400' : 'text-muted-foreground',
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

          {/* The date is a stamp on the foot of the card rather than a line under
              the title. Under the title it read as part of the item's heading —
              a fourth thing there to get through before the paragraph — and it is
              not: news is read whenever a reader arrives, so when it was published
              is the least interesting thing about it, and the only thing worth
              keeping is the day. It shares the foot with the link onwards because
              both are what a reader does with the card after they have read it. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-base font-medium text-primary">
              Read the whole item
              <ArrowRight className="size-3.5" />
            </span>

            <time dateTime={latest.publishedAt} className="text-base text-muted-foreground">
              {formatDay(latest.publishedAt)}
            </time>
          </div>
        </Link>
      )}

      {/* The heading carries the count, and the games sit in a plain grid under it.
          A panel here would put a border around a set of cards that each already
          carry one, which is the page saying the same thing about a game twice —
          once as a card and once as a section it is inside. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">
            Games being hosted
          </h2>

          <Link
            to="/dashboard/games"
            className="inline-flex items-center gap-1.5 text-base font-medium text-primary hover:underline"
          >
            Browse the games
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {games.length === 0 ? (
          loading ? (
            <LoadingBlock label="Reading the games…" />
          ) : (
            <p className="text-base text-muted-foreground">
              No game is being hosted right now.
            </p>
          )
        ) : (
          <div className="space-y-8">
            {[...groups.entries()].map(([lobby, lobbyGames]) => (
              <section key={lobby} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-extrabold tracking-tight text-foreground">
                    {lobby}
                  </h3>
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
      </section>
    </div>
  );
}