import { LockKeyhole, Map as MapIcon, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LoadingBlock, SectionHeading, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';

import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { KnownRules, ruleName } from '../lib/gameModes';
import { mapImage, mapName } from '../lib/maps';
import { cn } from '../lib/utils';

type Game = {
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

/** The word a room with no lobby named is filed under. */
const UnnamedLobby = 'Unknown lobby';

/** The value a filter takes when nothing is being filtered. */
const AnyValue = 'any';

/** Every value the lobby filter offers, and what each of them means. */
const LobbyOptions = [
  { value: AnyValue, label: 'All lobbies' },
  { value: 'open', label: 'Open to everyone' },
  { value: 'locked', label: 'Password protected' },
];

/** Every value the map filter offers, and what each of them means. */
const MapOptions = [
  { value: AnyValue, label: 'All maps' },
  { value: 'named', label: 'Named maps' },
  { value: '0', label: 'No map named' },
];

/** Every value the mode filter offers, and what each of them means. */
const RuleOptions = [
  { value: AnyValue, label: 'All modes' },
  ...KnownRules.map(({ rule, label }) => ({ value: String(rule), label })),
];

/** Every value the order-by offers, and what each of them means. */
const OrderOptions = [
  { value: 'players', label: 'Most players' },
  { value: 'ping', label: 'Lowest ping' },
  { value: 'name', label: 'Room name' },
  { value: 'map', label: 'Map name' },
  { value: 'mode', label: 'Mode name' },
];

/**
 * Whether a room survives the filters currently set.
 *
 * Every filter is independent and they compose as an intersection rather than as
 * a chain of fallbacks: a room matching three of the four is not shown, because
 * each one narrows the same list and none of them overrides another. `any` is the
 * only value that does not narrow, which is what lets one predicate serve both
 * the unfiltered page and every filtered one.
 */
function matchesFilters(
  game: Game,
  lobby: string,
  map: string,
  rule: string,
): boolean {
  if (lobby === 'open' && game.hasPassword) {
    return false;
  }

  if (lobby === 'locked' && !game.hasPassword) {
    return false;
  }

  if (map === 'named' && game.map === 0) {
    return false;
  }

  if (map === '0' && game.map !== 0) {
    return false;
  }

  return rule === AnyValue || game.rule === Number(rule);
}

/**
 * Orders two rooms by the chosen key.
 *
 * Every comparison falls back to the room's name and then its id, so the order
 * is total: two rooms that tie on the chosen key land in the same place on every
 * refresh instead of swapping each refresh, which is the thing that makes a
 * sorted list feel broken. The id is the tiebreak of last resort because it is
 * the only value here that two rooms cannot share.
 *
 * Numbers compare as numbers and words compare with `localeCompare`, so "A
 * hundred" sorts after "Forty" rather than before it the way a string sort of
 * the words would put it.
 */
function compareRooms(left: Game, right: Game, order: string): number {
  const byName = left.name.localeCompare(right.name) || left.id - right.id;

  switch (order) {
    case 'ping':
      return left.ping - right.ping || byName;
    case 'map':
      return mapName(left.map).localeCompare(mapName(right.map)) || byName;
    case 'mode':
      return ruleName(left.rule).localeCompare(ruleName(right.rule)) || byName;
    default:
      return right.players - left.players || byName;
  }
}

/**
 * The rooms that are up right now, grouped by the lobby each is in.
 *
 * A room stops being listed once the host stops writing to it, so an empty grid
 * means no game is being hosted rather than that the page has lost the rooms it
 * once showed. The list is a live thing by nature and is not a record of what
 * was played.
 *
 * Rooms are grouped by lobby rather than listed flat because a lobby is a place
 * rather than a property: it carries its own restrictions and its own rules
 * about who may play in it, so two rooms on the same map and the same mode are
 * not the same offer if one of them is in a beginners-only lobby. Putting them
 * side by side in one flat grid flattens exactly the difference that decides
 * whether somebody can join. Each group keeps its own count, because the count
 * that matters is how busy a lobby is, not how busy the server is.
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

  const [lobby, setLobby] = useState(AnyValue);
  const [map, setMap] = useState(AnyValue);
  const [rule, setRule] = useState(AnyValue);
  const [order, setOrder] = useState('players');

  const filtered = useMemo(
    () => rooms.filter((game) => matchesFilters(game, lobby, map, rule)),
    [rooms, lobby, map, rule],
  );

  // The groups are built once per filter change rather than per render, because
  // sorting every room on every keystroke of a filter that did not change the
  // result is work the reader can see as a lag on the cards that did not move.
  //
  // Grouping is by lobby name and not by lobby id, because the name is what a
  // reader recognises and the id is a row number from another table. Rooms with
  // no lobby are still rooms somebody can join, so they are filed under a word
  // rather than dropped — a group labelled as unknown says the page could not
  // read it, which is different from the page hiding it.
  const groups = useMemo(() => {
    const byLobby = new Map<string, Game[]>();

    for (const game of filtered) {
      const key = game.lobbyName ?? UnnamedLobby;
      const group = byLobby.get(key);

      if (group === undefined) {
        byLobby.set(key, [game]);
      } else {
        group.push(game);
      }
    }

    return [...byLobby.entries()]
      .map(([name, games]) => ({
        name,
        games: [...games].sort((left, right) => compareRooms(left, right, order)),
      }))
      // The groups themselves are ordered by their busiest room, so the lobby
      // with something worth joining in it is the one at the top. Ordering them
      // by name instead would put an alphabetical lobby nobody plays in above a
      // busy one, which is the opposite of what the grouping is for.
      .sort(
        (left, right) =>
          right.games.length - left.games.length ||
          left.name.localeCompare(right.name),
      );
  }, [filtered, order]);

  const busy = lobby !== AnyValue || map !== AnyValue || rule !== AnyValue;

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
            {busy
              ? `${formatNumber(filtered.length)} of ${formatNumber(rooms.length)} rooms shown`
              : `${formatNumber(rooms.length)} ${rooms.length === 1 ? 'room' : 'rooms'} being hosted`}
          </p>
        )}
      </div>

      {/* The filters are drawn whenever the page has rooms to filter, including
          while a filter has narrowed the list to nothing — a filter row that
          disappears when its own filters are empty is a filter row that cannot be
          undone without reloading the page. */}
      {rooms.length === 0 ? null : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Lobby"
            value={lobby}
            options={LobbyOptions}
            onChange={setLobby}
          />
          <FilterSelect
            label="Map"
            value={map}
            options={MapOptions}
            onChange={setMap}
          />
          <FilterSelect
            label="Mode"
            value={rule}
            options={RuleOptions}
            onChange={setRule}
          />
          <FilterSelect
            label="Order by"
            value={order}
            options={OrderOptions}
            onChange={setOrder}
          />
        </div>
      )}

      {rooms.length === 0 ? (
        loading ? (
          <LoadingBlock label="Reading the rooms…" />
        ) : (
          <p className="text-base text-muted-foreground">No game is being hosted right now.</p>
        )
      ) : groups.length === 0 ? (
        <p className="text-base text-muted-foreground">
          No room matches these filters.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.name} className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                  {group.name}
                </h2>
                <p className="text-base text-muted-foreground tabular-nums">
                  {formatNumber(group.games.length)}{' '}
                  {group.games.length === 1 ? 'room' : 'rooms'}
                </p>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.games.map((room) => (
                  <li key={room.id} className="min-w-0">
                    <GameCard game={room} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One filter: a labelled dropdown over a fixed set of values.
 *
 * The label is drawn beside the control rather than inside it, so the dropdown
 * shows the current choice and the label says what the choice is about. A
 * placeholder inside the trigger would have to stand in for the chosen value
 * and the two would be the same text at different moments.
 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-base text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
 *
 * The lobby is not on the card. It is the heading of the section this card sits
 * in, and repeating it on every card in that section spends the width of each
 * one saying the same word as the thing above it.
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
              <LockKeyhole
                className="size-4 shrink-0 text-amber-400"
                aria-hidden="true"
              />
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
  // that only just trips the first, which a colour alone cannot show. The
  // fastest ping lights no bars and the slowest lights three of the four, which
  // is the whole range and leaves the top bar as the mark of "worse than any of
  // these steps" rather than as a bar nothing ever reaches.
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