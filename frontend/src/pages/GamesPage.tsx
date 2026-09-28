import { Gamepad2, RefreshCw } from 'lucide-react';
import { LoadingBlock, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

type Game = {
  id: number;
  name: string;
  comment: string;
  hostName: string | null;
  lobbyName: string | null;
  players: number;
  maximumPlayers: number;
  mode: number;
  status: number;
  hasPassword: boolean;
  updatedAt: string;
};

/**
 * The rooms that are up right now.
 *
 * A room stops being listed once the host stops writing to it, so an empty grid
 * means no game is being hosted rather than that the page has lost the rooms it
 * once showed. The list is a live thing by nature and is not a record of what
 * was played.
 *
 * Nothing here writes, which is a decision rather than an oversight. A game row
 * belongs to the host, who rewrites it on every heartbeat, so anything corrected
 * from here lasts until the host saves its own — and the host, the lobby, the
 * players, the rounds and the status are all the game's to move while it is being
 * played. A dashboard that wrote them would produce a room whose state the game
 * server knows nothing about. The server is what runs the rooms; this page shows
 * which are up.
 */
export function GamesPage() {
  const { data, error, loading, reload } = useApiResource<{ games: Game[] }>('/api/games');
  const rooms = data?.games ?? [];

  return (
    <div className="space-y-6">
      <SectionHeading title="Games" subtitle="The rooms that are being hosted right now." />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={reload} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : undefined} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>

        {loading || data === null ? null : (
          <p className="text-base text-muted-foreground">
            {formatNumber(rooms.length)} {rooms.length === 1 ? 'room' : 'rooms'} being hosted
          </p>
        )}
      </div>

      {rooms.length === 0 ? (
        loading ? (
          <LoadingBlock label="Reading the rooms…" />
        ) : (
          <p className="text-base text-muted-foreground">No game is being hosted right now.</p>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.id} className="min-w-0">
              <GameCard game={room} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One hosted room.
 *
 * A card and not a row, because a room is something a person joins rather than a
 * line to scan: the question the page is asked is "is anybody hosting what I want
 * to play", and a table answers it with seven columns of which three are the same
 * kind of thing — where, who, and when it was last touched. Set as cards, each
 * room is one thing to look at, and the grid can be read down a column or across
 * a row depending on which of those the reader wants.
 *
 * The band at the top is the image that is not here yet. It is sized and placed
 * now, while there is only an icon in it, rather than when the image arrives —
 * an image dropped into a card that was laid out without one moves everything
 * under it, and every card on the page moves at once. Reserving the space is the
 * difference between the picture turning up and the page being rebuilt around it.
 */
function GameCard({ game }: { game: Game }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/50">
      {/* The image goes here. It is a fixed ratio with the icon centred in it so
          the card is already the shape it will be, and a real picture replaces
          the icon without any of the text below it moving. */}
      <div className="flex aspect-video w-full items-center justify-center border-b border-border bg-muted/20">
        <Gamepad2 className="size-8 text-muted-foreground/50" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate text-base font-extrabold tracking-tight text-foreground">
            {game.name}
          </h2>
          {game.hasPassword ? <Badge variant="warning">password</Badge> : null}
        </div>

        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
            {formatNumber(game.players)}
          </p>
          <p className="text-base text-muted-foreground tabular-nums">
            of {formatNumber(game.maximumPlayers)} playing
          </p>
        </div>

        <dl className="space-y-1 text-base">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Host</dt>
            <dd className="min-w-0 flex-1 truncate text-foreground">
              {game.hostName ?? 'unknown'}
            </dd>
          </div>

          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Lobby</dt>
            <dd className="min-w-0 flex-1 truncate text-foreground">
              {game.lobbyName ?? 'unknown'}
            </dd>
          </div>
        </dl>

        {/* The comment is the host's own sentence about the room, so it is given
            the room's width and the room's remaining height rather than one line
            in a column: it is the part a reader reads to choose between two
            otherwise identical cards. */}
        <p className="min-h-10 text-base text-muted-foreground">
          {game.comment === '' ? 'No comment' : game.comment}
        </p>

        <p className="mt-auto text-base text-muted-foreground">
          Updated {formatDate(game.updatedAt)}
        </p>
      </div>
    </article>
  );
}
