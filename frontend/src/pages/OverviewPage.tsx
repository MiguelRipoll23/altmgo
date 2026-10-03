import { ArrowRight, LockKeyhole, Map as MapIcon, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingBlock, Panel, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { ruleName } from '../lib/gameModes';
import { mapName } from '../lib/maps';
import { cn } from '../lib/utils';

/** One news item, as the login screen shows it. */
type NewsItem = {
  id: number;
  title: string;
  body: string;
  important: boolean;
  publishedAt: string;
};

/** One hosted room, as the games page reads it. */
type Game = {
  id: number;
  name: string;
  hostName: string | null;
  lobbyName: string | null;
  players: number;
  maximumPlayers: number;
  rule: number;
  map: number;
  hasPassword: boolean;
};

/** The word a room with no lobby named is filed under. */
const UnnamedLobby = 'Unknown lobby';

/**
 * The page the dashboard opens with: the latest thing the server has said, and
 * what it is running right now.
 *
 * It used to open with four figures — how many players the server had, how many
 * were on it, how many games it had hosted, and the reader's own published
 * address. Those numbers are properties of the server rather than news about it,
 * and three of the four are totals that only ever go up, so the top of the page
 * was a row of figures that could not change while a reader looked at them. The
 * address has moved to the character it belongs to, which is the page that knows
 * which character is being played rather than a summary that guesses by recency.
 *
 * What is here instead is the two things that are true right now and can change
 * under the reader: the newest news item, and the rooms that are up. Both are
 * live readings rather than kept totals, which is the same reason the games page
 * is — the server is what runs the rooms and this page shows which are up.
 *
 * The lobby table that sat between them is gone, because it was answering a
 * question the rooms answer better. It listed every lobby the server runs with its
 * player count, including the lobbies with nobody in them, so a lobby's row was
 * as likely to be an empty one as a busy one — and a reader who wanted to know
 * where the players were had to count them out of a table. The rooms are already
 * grouped by the lobby they are in, so a lobby with activity in it is a heading
 * on the page, and one without is not on the page at all.
 *
 * The four restriction flags each lobby carries went with the table, and nothing
 * else on the dashboard draws them: whether a lobby is beginners-only or needs
 * the expansion is a property of the lobby rather than of any room in it, so it
 * has no place on a list of rooms and a lobby with no rooms has nowhere to put it.
 * That question needs the lobby itself, which is a page this dashboard does not
 * have. Until it does, "can I send a beginner to this lobby" is not answerable
 * here, and the rooms list says what mode and map a room is on rather than
 * implying it knows the rules of the place around it.
 */
export function OverviewPage() {
  const news = useApiResource<{ news: NewsItem[] }>('/api/news');
  const games = useApiResource<{ games: Game[] }>('/api/games');

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
      <SectionHeading
        title="Overview"
        subtitle="What the server has said, and what it is running right now."
      />

      {news.error === null ? null : (
        <StatusMessage kind="error">{news.error}</StatusMessage>
      )}

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

      <Panel
        title="Rooms being hosted"
        description={
          rooms.length === 0
            ? undefined
            : `${formatNumber(rooms.length)} ${rooms.length === 1 ? 'room' : 'rooms'}, grouped by lobby.`
        }
      >
        {games.error === null ? null : (
          <StatusMessage kind="error">{games.error}</StatusMessage>
        )}

        {rooms.length === 0 ? (
          games.loading ? (
            <LoadingBlock label="Reading the rooms…" />
          ) : (
            <p className="text-base text-muted-foreground">
              No game is being hosted right now.
            </p>
          )
        ) : (
          // Each lobby is its own block rather than one table with a lobby column.
          // A table repeats the lobby name down every row it has rooms in, and the
          // column is the thing being sorted by, so the page spends its height on
          // the least interesting fact about each room while the interesting one —
          // which lobbies are busy — has to be read out of a sorted list of names.
          <div className="space-y-6">
            {[...groups.entries()].map(([lobby, lobbyRooms]) => (
              <section key={lobby} className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-base font-extrabold tracking-tight text-foreground">
                    {lobby}
                  </h3>
                  <p className="text-base text-muted-foreground tabular-nums">
                    {formatNumber(lobbyRooms.length)}{' '}
                    {lobbyRooms.length === 1 ? 'room' : 'rooms'}
                  </p>
                </div>

                <ul className="divide-y divide-border">
                  {lobbyRooms.map((room) => (
                    <li
                      key={room.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {room.hasPassword ? (
                          <span title="Password protected">
                            <LockKeyhole
                              className="size-3.5 shrink-0 text-amber-400"
                              aria-hidden="true"
                            />
                            <span className="sr-only">Password protected</span>
                          </span>
                        ) : null}
                        <span className="truncate text-base font-medium text-foreground">
                          {room.name}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5 text-base text-muted-foreground">
                        <MapIcon className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{mapName(room.map)}</span>
                      </span>

                      <span className="truncate text-base text-muted-foreground">
                        {ruleName(room.rule)}
                      </span>

                      <span className="ml-auto shrink-0 text-base tabular-nums">
                        {formatNumber(room.players)}/{formatNumber(room.maximumPlayers)}
                      </span>
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