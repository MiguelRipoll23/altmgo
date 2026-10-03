import { Map as MapIcon, RefreshCw } from 'lucide-react';
import { LoadingBlock, SectionHeading, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { mapImage, mapName } from '../lib/maps';

type Game = {
  id: number;
  name: string;
  comment: string;
  hostName: string | null;
  lobbyName: string | null;
  players: number;
  maximumPlayers: number;
  mode: number;
  /** The client's map number for the map the room is on, zero when it names none. */
  map: number;
  status: number;
  hasPassword: boolean;
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
 * to play", and a table answers it with six columns of which two are the same
 * kind of thing — where and who. Set as cards, each room is one thing to look at,
 * and the grid can be read down a column or across a row depending on which of
 * those the reader wants.
 *
 * The band at the top is the map, and the map is what most of somebody choosing
 * a room is choosing: two rooms on the same rule differ by who is in them, and
 * two rooms on different maps are not the same game at all. It is a fixed ratio
 * so that a card is the same shape whether the picture is there or not, and the
 * image covers the band rather than sitting in it, so a map photographed in a
 * wider ratio is cropped rather than letterboxed into a strip.
 */
function GameCard({ game }: { game: Game }) {
  const picture = mapImage(game.map);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="relative flex aspect-video w-full items-center justify-center border-b border-border bg-muted/20">
        {picture === null ? (
          <MapIcon className="size-8 text-muted-foreground/50" aria-hidden="true" />
        ) : (
          // The name is the alt text because the picture carries no text of its
          // own, and a reader who cannot see it is left with the map's name
          // rather than with nothing. The room's own name is the heading below,
          // so the two are not read as one another's caption.
          <img
            src={picture}
            alt={mapName(game.map)}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate text-base font-extrabold tracking-tight text-foreground">
            {game.name}
          </h2>
          {game.hasPassword ? <Badge variant="warning">password</Badge> : null}
        </div>

        {/* The map's name, in words. The picture above is how the map is
            recognised, but only by somebody who already knows it, and a card is
            a card somebody reads rather than one they look at. It sits under the
            room's own name because the room is what was searched for and the map
            is what is being decided. */}
        <p className="flex items-center gap-1.5 text-base text-muted-foreground">
          <MapIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{mapName(game.map)}</span>
        </p>

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
            otherwise identical cards. It carries the foot of the card rather than
            sitting under a timestamp: the timestamp was a heartbeat that fires
            every few seconds while the room is up, so it was the one line on the
            card that was never the same twice and was never the reason anybody
            picked the room. The card is about what the room is, not about when it
            last blinked. */}
        <p className="mt-auto min-h-10 text-base text-muted-foreground">
          {game.comment === '' ? 'No comment' : game.comment}
        </p>
      </div>
    </article>
  );
}
