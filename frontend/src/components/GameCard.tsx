import { LockKeyhole, Map as MapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNumber } from './DataDisplay';
import { PingIndicator } from './PingIndicator';
import { ruleName } from '../lib/gameModes';
import { mapImage, mapName } from '../lib/maps';

/** One hosted room, as the API reports it. */
export type Game = {
  id: number;
  name: string;
  comment: string;
  hostName: string | null;
  lobbyName: string | null;
  players: number;
  maximumPlayers: number;
  /** The rule the room's current round is played on, as the client numbers them. */
  rule: number;
  /** The client's map number for the map the room is on, zero when it names none. */
  map: number;
  status: number;
  hasPassword: boolean;
  /** The ping the host's own client reported, in milliseconds. */
  ping: number;
};

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
 *
 * The lobby is not on the card. It is the heading of the section the card sits in
 * on both pages that draw it, and repeating it on every card spends the width of
 * each one saying the same word as the thing above it.
 *
 * It is one component for both pages rather than a card on each because a room
 * shown twice in two shapes is a room a reader has to re-learn: the map on top,
 * the picture that fills the space, the gauge in the corner. A page that showed
 * the same rooms as a compact list because it had less room for them would be
 * answering a different question, and the shape of the card is most of that
 * answer.
 */
export function GameCard({ game }: { game: Game }) {
  const picture = mapImage(game.map);

  return (
    <Link
      to={`/dashboard/games/${game.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card/50 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`View details for ${game.name}`}
    >
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b border-border bg-muted/20">
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

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/85 via-black/15 to-black/30 p-3">
          {game.hasPassword ? (
            <span className="ml-auto rounded-full bg-black/50 p-2 text-white" title="Password protected">
              <LockKeyhole className="size-4" aria-hidden="true" />
              <span className="sr-only">Password protected</span>
            </span>
          ) : <span />}
          <div>
            <p className="truncate text-sm font-semibold uppercase tracking-wider text-white/80">
              {mapName(game.map)}
            </p>
            <p className="mt-0.5 truncate text-lg font-extrabold leading-tight text-white">
              {ruleName(game.rule)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-base font-extrabold tracking-tight text-foreground">
            {game.name}
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              {formatNumber(game.players)}
            </p>
            <p className="text-base text-muted-foreground tabular-nums">
              of {formatNumber(game.maximumPlayers)} playing
            </p>
          </div>

          <PingIndicator ping={game.ping} />
        </div>

        <dl className="space-y-1 text-base">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Host</dt>
            <dd className="min-w-0 flex-1 truncate text-foreground">
              {game.hostName ?? 'unknown'}
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
    </Link>
  );
}
