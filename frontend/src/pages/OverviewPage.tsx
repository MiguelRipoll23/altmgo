import { ArrowRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingBlock, Panel, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
import { GameCard, type Game } from '../components/GameCard';
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

/** The two figures about the size of the server rather than the moment. */
type ServerFigures = {
  connectedPlayers: number;
  totalGames: number;
};

/** The word a room with no lobby named is filed under. */
const UnnamedLobby = 'Unknown lobby';

/**
 * The page the dashboard opens with: the latest thing the server has said, and
 * what it is running right now.
 *
 * It used to open with four figures on tiles — how many players the server had,
 * how many were on it, how many games it had hosted, and the reader's own
 * published address. Three of those four were properties of the server rather than
 * news about it, and the tiles gave them the weight of the page: a row of bordered
 * cards is what a reader looks at first, and it was spent on numbers that could
 * not change while they looked at them.
 *
 * Two of them came back, as a line under the heading rather than as tiles. How many
 * players are on the server and how many games it has hosted are worth knowing and
 * are worth very little prominence: they are the size of the thing, not what it is
 * doing, and a reader passing through to the rooms below does not need them in a
 * card of their own to find them. `total players` did not come back at all — it is
 * the one figure that only ever goes up and says nothing about whether the server
 * is being used.
 *
 * The page carries no sentence under its heading either. Every dashboard page
 * opened with one, and they were all the same kind of line: a restatement of the
 * title in a longer sentence, saying what the page is about to a reader who had
 * just read what the page is called. The titles are already the sentence — "Games",
 * "News", "Clans" — and a page that needs a second line to say what its own title
 * does not is one whose title is wrong. What was underneath is either already on
 * the page (a count, a description of the list) or is what the content is for.
 *
 * The published address moved to the character page, which knows which character
 * is being played rather than guessing by recency.
 *
 * The lobby table went with the tiles, because it was answering a question the
 * rooms answer better. It listed every lobby the server runs with its player
 * count, including the lobbies with nobody in them, so a lobby's row was as likely
 * to be an empty one as a busy one — and a reader who wanted to know where the
 * players were had to count them out of a table. The rooms are already grouped by
 * the lobby they are in, so a lobby with activity in it is a heading on the page,
 * and one without is not on the page at all.
 *
 * The four restriction flags each lobby carries went with the table, and nothing
 * else on the dashboard draws them: whether a lobby is beginners-only or needs
 * the expansion is a property of the lobby rather than of any room in it, so it
 * has no place on a list of rooms and a lobby with no rooms has nowhere to put it.
 * That question needs the lobby itself, which is a page this dashboard does not
 * have. Until it does, "can I send a beginner to this lobby" is not answerable
 * here, and the page says what mode and map a room is on rather than implying it
 * knows the rules of the place around it.
 */
export function OverviewPage() {
  const news = useApiResource<{ news: NewsItem[] }>('/api/news');
  const games = useApiResource<{ games: Game[] }>('/api/games');
  const figures = useApiResource<ServerFigures>('/api/server-figures');

  const latest = news.data?.news[0] ?? null;
  const rooms = games.data?.games ?? [];

  // Only lobbies with a room in them are drawn. The map is keyed by name because
  // the name is what a reader recognises and the id is a row number from another
  // table; a room whose lobby the server did not report is filed under a word
  // rather than dropped, since it is still a room somebody can join and "we could
  // not read its lobby" is a different fact from "we are hiding it".
  const groups = new Map<string, Game[]>();

  for (const room of rooms) {
    const key = room.lobbyName ?? UnnamedLobby;
    const group = groups.get(key);

    if (group === undefined) {
      groups.set(key, [room]);
    } else {
      group.push(room);
    }
  }

  return (
    <div className="space-y-6">
      {/* The heading and the figures are one band rather than a heading and then a
          row of tiles. The figures belong to the page rather than to anything on
          it, so they sit directly under the title, where they are read or skipped
          as one glance instead of being the first thing on the page and pushing
          the news down beneath them. `mb-2` is the heading's own margin pulled in
          so the two read as one block rather than as a heading with a line hung
          off it. */}
      <SectionHeading title="Overview" className="mb-2" />

      <p className="mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base text-muted-foreground">
        {figures.data === null ? (
          // The line keeps its height while the figures are read rather than
          // collapsing and pulling the news up when they land, so the page below
          // it does not jump after a wait that was supposed to be still.
          <span className="opacity-0">Reading the server…</span>
        ) : (
          <>
            <span className="tabular-nums">
              {formatNumber(figures.data.connectedPlayers)} online
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {formatNumber(figures.data.totalGames)} games hosted
            </span>
          </>
        )}
      </p>

      {news.error === null ? null : <StatusMessage kind="error">{news.error}</StatusMessage>}

      {/* The latest item only, as a card rather than a list. The whole news page
          is one click away and this is the one a reader passing through the
          dashboard is most likely to want — so it is the opening of the newest
          item and a link onwards, not a shortened copy of the list, which would
          put the same item on two pages and make the news page a page whose first
          row is already on the one before it. */}
      {news.loading ? (
        <LoadingBlock label="Reading the news…" />
      ) : latest === null ? (
        <Panel title="Latest news">
          <p className="text-base text-muted-foreground">
            The server has not published anything.
          </p>
        </Panel>
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

          <p className="mt-2 text-base uppercase tracking-widest text-muted-foreground">
            {formatDate(latest.publishedAt)}
          </p>

          <p className="mt-3 line-clamp-3 text-base leading-relaxed text-foreground/80">
            {latest.body}
          </p>

          <span className="mt-3 inline-flex items-center gap-1.5 text-base font-medium text-primary">
            Read the whole item
            <ArrowRight className="size-3.5" />
          </span>
        </Link>
      )}

      {/* The rooms are the games page's own cards rather than a compact list made
          for this page. It is the same question the same way round: the reader
          passes this page on the way somewhere else and the cards are there if
          they want to look, which is what stops the overview from being a summary
          that has to be visited to be believed. A shorter row here would have been
          the cheaper drawing and it would have been the one place a room is shown
          without its map, its picture and its ping — so a reader would learn the
          room from the summary and be surprised by the real thing. */}
      <Panel
        title="Rooms being hosted"
        description={
          rooms.length === 0
            ? undefined
            : `${formatNumber(rooms.length)} ${rooms.length === 1 ? 'room' : 'rooms'}, grouped by lobby.`
        }
        footer={
          <Link
            to="/dashboard/games"
            className="inline-flex items-center gap-1.5 text-base font-medium text-primary hover:underline"
          >
            Browse the rooms
            <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        {games.error === null ? null : <StatusMessage kind="error">{games.error}</StatusMessage>}

        {rooms.length === 0 ? (
          games.loading ? (
            <LoadingBlock label="Reading the rooms…" />
          ) : (
            <p className="text-base text-muted-foreground">No game is being hosted right now.</p>
          )
        ) : (
          // Each lobby is its own section rather than one table with a lobby
          // column. A table repeats the lobby name down every row it has rooms in,
          // and the column is the thing being sorted by, so the page spends its
          // height on the least interesting fact about each room while the
          // interesting one — which lobbies are busy — has to be read out of a
          // sorted list of names.
          <div className="space-y-8">
            {[...groups.entries()].map(([lobby, lobbyRooms]) => (
              <section key={lobby} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-extrabold tracking-tight text-foreground">
                    {lobby}
                  </h3>
                  <p className="text-base text-muted-foreground tabular-nums">
                    {formatNumber(lobbyRooms.length)}{' '}
                    {lobbyRooms.length === 1 ? 'room' : 'rooms'}
                  </p>
                </div>

                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lobbyRooms.map((room) => (
                    <li key={room.id} className="min-w-0">
                      <GameCard game={room} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}