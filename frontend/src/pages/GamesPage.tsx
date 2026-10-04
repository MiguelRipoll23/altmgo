import { ArrowUpDown, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { LoadingBlock, SectionHeading, formatNumber } from '../components/DataDisplay';
import { GameCard, type Game } from '../components/GameCard';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { KnownRules, ruleName } from '../lib/gameModes';
import { mapName } from '../lib/maps';
import { cn } from '../lib/utils';

/** The word a game with no lobby named is filed under. */
const UnnamedLobby = 'Unknown lobby';

/**
 * How often the list reads itself again while the page is open.
 *
 * A minute is the pace the page actually changes at. A game is written by its host
 * on a heartbeat and the server's own staleness window is two of those beats, so
 * anything faster than this is reading the same rows twice and anything much slower
 * is showing a reader a list that has quietly gone stale while they looked at it —
 * which is the failure this page is most prone to, because a host that closes a
 * game without saying so leaves a card up that nobody can join.
 *
 * It is a timer on the page rather than a push from the server, because the server
 * has nothing to push: it writes rows and is not watching who is reading them. The
 * reader gets the same answer a refresh button gave them, without having to decide
 * that they want it.
 */
const RefreshSeconds = 60;

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
  { value: 'name', label: 'Game name' },
  { value: 'map', label: 'Map name' },
  { value: 'mode', label: 'Mode name' },
];

/**
 * Whether a game survives the filters currently set.
 *
 * Every filter is independent and they compose as an intersection rather than as
 * a chain of fallbacks: a game matching three of the four is not shown, because
 * each one narrows the same list and none of them overrides another. `any` is the
 * only value that does not narrow, which is what lets one predicate serve both
 * the unfiltered page and every filtered one.
 *
 * The search is the one filter that reads text rather than a chosen value, so it
 * matches a substring and ignores case. It looks at the game's name and its
 * host's, because either is what a reader who has a name in mind has: somebody
 * looking for a particular game types the game, and somebody looking for who is
 * hosting types the host. A name that matches one of them is enough; searching
 * for both at once is a query a reader would have to know to write.
 */
function matchesFilters(
  game: Game,
  query: string,
  lobby: string,
  map: string,
  rule: string,
): boolean {
  const needle = query.trim().toLowerCase();

  if (needle !== '') {
    const inName = game.name.toLowerCase().includes(needle);
    const inHost = (game.hostName ?? '').toLowerCase().includes(needle);

    if (!inName && !inHost) {
      return false;
    }
  }

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
 * Orders two games by the chosen key.
 *
 * Every comparison falls back to the game's name and then its id, so the order is
 * total: two games that tie on the chosen key land in the same place on every
 * refresh instead of swapping each refresh, which is the thing that makes a
 * sorted list feel broken. The id is the tiebreak of last resort because it is
 * the only value here that two games cannot share.
 *
 * Numbers compare as numbers and words compare with `localeCompare`, so "A
 * hundred" sorts after "Forty" rather than before it the way a string sort of
 * the words would put it.
 */
function compareGames(left: Game, right: Game, order: string): number {
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
 * The games that are up right now, grouped by the lobby each is in.
 *
 * A game stops being listed once the host stops writing to it, so an empty grid
 * means no game is being hosted rather than that the page has lost the games it
 * once showed. The list is a live thing by nature and is not a record of what
 * was played.
 *
 * It says games throughout, and not rooms. A room is what the game server's own
 * tables call the thing — the row, and the host that rewrites it on every
 * heartbeat — and that word reached the page through the query rather than
 * because the reader had ever heard it. The sidebar calls this page "Games", the
 * overview lists "Games being hosted", and the client itself asks a player to
 * create a game. A page called Games whose own filter said "Room name" was a page
 * arguing with its own title.
 *
 * Games are grouped by lobby rather than listed flat because a lobby is a place
 * rather than a property: it carries its own restrictions and its own rules
 * about who may play in it, so two games on the same map and the same mode are
 * not the same offer if one of them is in a beginners-only lobby. Putting them
 * side by side in one flat grid flattens exactly the difference that decides
 * whether somebody can join. Each group keeps its own count, because the count
 * that matters is how busy a lobby is, not how busy the server is.
 *
 * The controls are one line above the list: the button that opens the filters,
 * the order the list is read in, the button that reads it again, and the number
 * of games there are. The filters themselves are behind the button rather than
 * set out as a row of four dropdowns, because they are the exception — a reader
 * arrives at the page to look at games and only sometimes arrives to narrow
 * them, and four controls always on screen spend the top of the page on the case
 * that is not the usual one. The order-by stayed out of the modal with the
 * refresh and the count, because it is a way of reading the list rather than a
 * way of hiding part of it, and a reader who wants the list sorted should not have
 * to open a dialog to say so.
 *
 * Nothing here writes, which is a decision rather than an oversight. A game row
 * belongs to the host, who rewrites it on every heartbeat, so anything corrected
 * from here lasts until the host saves its own — and the host, the lobby, the
 * players, the rounds and the status are all the game's to move while it is being
 * played. A dashboard that wrote them would produce a game whose state the game
 * server knows nothing about. The server is what runs them; this page shows
 * which are up.
 *
 * The overview draws the same games in the same groups, in the same cards. What
 * this page adds over it is the choosing: the filters and the order are for a
 * reader with a particular map or rule in mind, and the overview is for a reader
 * who has not decided yet.
 *
 * The list refreshes itself once a minute, and there is also a button that reads
 * it again on demand. The two are not the same request: the timer keeps a list
 * that is being watched from going stale without the reader doing anything, and
 * the button is for the moment a reader wants the current answer now — having
 * just closed a game, or reading over somebody's shoulder. Neither makes the
 * other redundant, and the button reports the read it starts by spinning until
 * the same answer comes back.
 */
export function GamesPage() {
  const { data, error, loading, reload } = useApiResource<{ games: Game[] }>('/api/games');
  const games = data?.games ?? [];

  // The list reads itself again while the page is open. The interval is armed once
  // and never re-armed: `reload` changes an identity inside the hook rather than
  // being a new function, so depending on it would restart the timer after every
  // tick and the list would never refresh at all.
  //
  // Nothing is drawn from this — it is not a "last updated" line, because a reader
  // who did not ask does not need to be told when the page last spoke to the
  // server. The games moving is the only report worth making.
  //
  // A tab in the background stops being refreshed, because a browser throttles a
  // timer in one to about once a minute anyway, and firing requests at a server
  // nobody is looking at is work for nothing. The first tick after the tab comes
  // back is a fresh read, so the list a reader returns to is current rather than
  // whatever it was when they left.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        reload();
      }
    }, RefreshSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [reload]);

  const [query, setQuery] = useState('');
  const [lobby, setLobby] = useState(AnyValue);
  const [map, setMap] = useState(AnyValue);
  const [rule, setRule] = useState(AnyValue);
  const [order, setOrder] = useState('players');

  const filtered = useMemo(
    () => games.filter((game) => matchesFilters(game, query, lobby, map, rule)),
    [games, query, lobby, map, rule],
  );

  // The groups are built once per filter change rather than per render, because
  // sorting every game on every keystroke of a filter that did not change the
  // result is work the reader can see as a lag on the cards that did not move.
  //
  // Grouping is by lobby name and not by lobby id, because the name is what a
  // reader recognises and the id is a row number from another table. Games with
  // no lobby are still games somebody can join, so they are filed under a word
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
      .map(([name, lobbyGames]) => ({
        name,
        games: [...lobbyGames].sort((left, right) => compareGames(left, right, order)),
      }))
      // The groups themselves are ordered by their busiest game, so the lobby with
      // something worth joining in it is the one at the top. Ordering them by name
      // instead would put an alphabetical lobby nobody plays in above a busy one,
      // which is the opposite of what the grouping is for.
      .sort(
        (left, right) =>
          right.games.length - left.games.length || left.name.localeCompare(right.name),
      );
  }, [filtered, order]);

  // How many of the filters are narrowing the list, which is what the button's
  // badge counts. The search counts as one however many words are in it: the
  // reader set one thing, and a badge that counted characters would say the page
  // is filtered more as they type.
  const activeFilters =
    (query.trim() === '' ? 0 : 1) +
    (lobby === AnyValue ? 0 : 1) +
    (map === AnyValue ? 0 : 1) +
    (rule === AnyValue ? 0 : 1);

  const busy = activeFilters > 0;

  function clearFilters() {
    setQuery('');
    setLobby(AnyValue);
    setMap(AnyValue);
    setRule(AnyValue);
  }

  return (
    <div className="space-y-6">
      <SectionHeading title="Games" />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      {/* The controls, in one line, once there is a list to control. While the
          first read is in flight there is nothing to filter, sort or count, so
          the line is not drawn rather than drawn from a count of zero. */}
      {data === null ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal aria-hidden="true" />
                Filters
                {activeFilters === 0 ? null : (
                  <Badge variant="secondary" className="ml-1">
                    {formatNumber(activeFilters)}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription>
                  Narrow the games by name, lobby, map or mode.
                </DialogDescription>
              </DialogHeader>

              {/* The search field, with its label above it rather than beside it
                  like the dropdowns': it is the one control here a reader types
                  into, and a typed field wants the full width of the frame. */}
              <label className="flex flex-col gap-1.5">
                <span className="text-base text-muted-foreground">Search</span>
                <span className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Game or host name"
                    className="pl-9"
                  />
                </span>
              </label>

              <div className="flex flex-col gap-3">
                <FilterSelect label="Lobby" value={lobby} options={LobbyOptions} onChange={setLobby} />
                <FilterSelect label="Map" value={map} options={MapOptions} onChange={setMap} />
                <FilterSelect label="Mode" value={rule} options={RuleOptions} onChange={setRule} />
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={clearFilters} disabled={!busy}>
                  Clear filters
                </Button>
                <DialogClose asChild>
                  <Button>Done</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* The order the list is read in. It carries the icon rather than a
              written label: it sits beside a button whose whole word is "Filters"
              and a count that says what it counts, so a second word here would be
              the longest thing on a line that is otherwise controls. The icon says
              it is a sort and the trigger says which one is chosen. */}
          <Select value={order} onValueChange={setOrder}>
            <SelectTrigger aria-label="Order by" className="w-auto justify-start">
              <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <SelectValue className="flex-1 text-left" />
            </SelectTrigger>
            <SelectContent>
              {OrderOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* The read the reader asked for. It spins while the answer is in
              flight and is disabled for that moment, so a second press cannot
              start a second read of the same list. */}
          <Button
            variant="outline"
            size="icon"
            onClick={reload}
            disabled={loading}
            aria-label="Read the games again"
          >
            <RefreshCw className={cn(loading && 'animate-spin')} aria-hidden="true" />
          </Button>

          {/* The count of the whole list, at the far end of the line so the
              controls stay together on the left. The total is always the second
              number, and while a filter is narrowing the list the first number
              says how much of that total the cards below are showing — so the
              reader can tell at a glance what the filter did to the list. */}
          <p className="ml-auto text-base text-muted-foreground tabular-nums">
            {busy
              ? `${formatNumber(filtered.length)} of ${formatNumber(games.length)} games`
              : `${formatNumber(games.length)} games`}
          </p>
        </div>
      )}

      {games.length === 0 ? (
        loading ? (
          <LoadingBlock />
        ) : (
          <p className="text-base text-muted-foreground">No game is being hosted right now.</p>
        )
      ) : groups.length === 0 ? (
        <p className="text-base text-muted-foreground">No game matches these filters.</p>
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
                  {group.games.length === 1 ? 'game' : 'games'}
                </p>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.games.map((game) => (
                  <li key={game.id} className="min-w-0">
                    <GameCard game={game} />
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
      <span className="w-16 shrink-0 text-base text-muted-foreground">{label}</span>
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
