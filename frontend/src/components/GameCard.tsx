import { LockKeyhole, Map as MapIcon } from 'lucide-react';
import { formatNumber } from './DataDisplay';
import { ruleName } from '../lib/gameModes';
import { mapImage, mapName } from '../lib/maps';
import { cn } from '../lib/utils';

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
          <h3 className="min-w-0 truncate text-base font-extrabold tracking-tight text-foreground">
            {game.name}
          </h3>
          {/* The lock rather than a written badge. The fact being reported is a
              yes-or-no one and the icon says it in the width an icon costs,
              which leaves the room's name the longest thing on the card — and
              the name is what a reader picks a room by. The word is still there
              for a reader who cannot see the icon. */}
          {game.hasPassword ? (
            <span title="Password protected">
              <LockKeyhole className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="sr-only">Password protected</span>
            </span>
          ) : null}
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              {formatNumber(game.players)}
            </p>
            <p className="text-base text-muted-foreground tabular-nums">
              of {formatNumber(game.maximumPlayers)} playing
            </p>
          </div>

          <PingGauge ping={game.ping} />
        </div>

        <dl className="space-y-1 text-base">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Mode</dt>
            <dd className="min-w-0 flex-1 truncate text-foreground">
              {ruleName(game.rule)}
            </dd>
          </div>

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
    </article>
  );
}

/**
 * How far the host is away, as a row of bars going green to red.
 *
 * The bars rather than the number, because a millisecond figure is a number
 * nobody reading a list of rooms can rank at a glance: twenty-five is good to
 * somebody in one country and unusable to somebody in another, and the reader
 * comparing ten rooms has ten different baselines. What they share is the
 * question — "which of these can I actually play in" — and the bars answer it by
 * sorting themselves by colour across the cards, which a column of numbers does
 * not.
 *
 * The scale is fixed rather than scaled to the best room on the page. A gauge
 * that stretches to fit whatever is currently listed means the same bar is green
 * on a quiet evening and amber on a busy one, so a card cannot be compared with
 * one remembered from earlier, which is the only comparison a gauge is any use
 * for.
 */
function PingGauge({ ping }: { ping: number }) {
  // The step at which each colour takes over, low to high. The steps are the ones
  // a player actually distinguishes: under fifty is indistinguishable from the
  // local network, past a hundred and round trips stop being felt, and past two
  // hundred is where rooms stop being playable rather than merely being worse.
  const steps = [50, 100, 200];
  const [local, felt, unplayable] = steps as [number, number, number];

  const colour =
    ping <= local ? 'bg-emerald-500' : ping <= felt ? 'bg-amber-500' : 'bg-red-500';

  // One lit bar per step passed, so the gauge grows with the ping as well as
  // changing colour: a number that trips two steps reads differently from one
  // that only just trips the first, which a colour alone cannot show. The fastest
  // ping lights one bar of the four and the slowest lights all four, so the whole
  // range is used rather than leaving a bar nothing ever reaches.
  const lit = ping <= local ? 1 : ping <= felt ? 2 : ping <= unplayable ? 3 : 4;

  return (
    <div
      className="flex shrink-0 items-end gap-0.5"
      role="img"
      aria-label={`${formatNumber(ping)} milliseconds ping`}
      title={`${formatNumber(ping)} ms ping`}
    >
      {BarHeights.map((height, index) => (
        // Every bar is always drawn, lit or not, so the gauge is the same width
        // for every room and the cards in a row stay aligned.
        <span
          key={index}
          className={cn('w-1 rounded-sm', height, index < lit ? colour : 'bg-muted')}
        />
      ))}
    </div>
  );
}

/** The heights of the four bars, shortest first, so the gauge reads as a fill. */
const BarHeights = ['h-2', 'h-3', 'h-4', 'h-5'];