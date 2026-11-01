import { ArrowUpDown, Funnel, RefreshCw, Search } from 'lucide-react';
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
import { KnownMaps, mapName } from '../lib/maps';
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

/**
 * The prefix a lobby filter value carries.
 *
 * A lobby's value is its own name, and the name is the game server's to choose
 * (`LOBBY_NAME` of the lobby's own service) rather than something written here,
 * so nothing here can promise a lobby is not called `any` — the one word the
 * dropdown reads as "no filter". The prefix keeps the two apart without
 * pretending to know what the server will be called. The label stays the bare
 * name, so it costs the reader nothing.
 */
const LobbyPrefix = 'lobby:';

/**
 * Every value the access filter offers, and what each of them means.
 *
 * These three are what the lobby filter used to carry, under a label that said
 * Lobby: two answers about passwords sitting in a filter about places, which
 * meant a reader after "the lobbies this server has" was handed a question about
 * padlocks and a reader after open games had to hope the label was lying
 * politely. They are their own filter now, so the lobby one can mean lobbies and
 * this one keeps asking what it always asked.
 */
const AccessOptions = [
  { value: AnyValue, label: 'Any access' },
  { value: 'open', label: 'Open to everyone' },
  { value: 'locked', label: 'Password protected' },
];

/**
 * Every value the map filter offers, and what each of them means.
 *
 * `named` is the coarse answer — every game that is on some map — and the named
 * maps below it are the precise ones. The two are the same kind of choice at two
 * sizes, which is why they share one dropdown rather than sitting as a filter and
 * a sub-filter: a reader either knows which map they want or they only know they
 * want one that names itself.
 *
 * `None` comes from the map table rather than being written here as "No map
 * named": it is the client's own name for map zero, and a reader filtering for it
 * is asking for the rooms whose rotation names no map — the same rooms `named`
 * excludes.
 */
const MapOptions = [
  { value: AnyValue, label: 'All maps' },
  { value: 'named', label: 'Named maps' },
  ...KnownMaps.map(({ map, label }) => ({ value: String(map), label })),
];

/** Every value the mode filter offers, and what each of them means. */
const RuleOptions = [
  { value: AnyValue, label: 'All modes' },
  ...KnownRules.map(({ rule, label }) => ({ value: String(rule), label })),
];

/** Every value the order-by offers, and what each of them means. */
const OrderOptions = [
  { value: 'players', label: 'Most players' },
  /* { value: 'ping', label: 'Lowest ping' }, */
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
 *
 * The lobby is matched by name against the name the room was filed under, which
 * is the same key the page groups by below — so picking a lobby shows exactly
 * the games that would sit under that heading, and never a game from a group
 * the filter's own list does not offer.
 */
function matchesFilters(
  game: Game,
  query: string,
  lobby: string,
  access: string,
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

  if (lobby !== AnyValue && (game.lobbyName ?? UnnamedLobby) !== lobby.slice(LobbyPrefix.length)) {
    return false;
  }

  if (access === 'open' && game.hasPassword) {
    return false;
  }

  if (access === 'locked' && !game.hasPassword) {
    return false;
  }

  if (map === 'named') {
    if (game.map === 0) {
      return false;
    }
  } else if (map !== AnyValue && game.map !== Number(map)) {
    // Every other map value is a map number from the client's own table, and it
    // matches the one map it names. `None` arrives here as the string `"0"` and
    // matches map zero, which is the same set `named` excludes.
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
    case 'map':
      return mapName(left.map).localeCompare(mapName(right.map)) || byName;
    // case 'ping':
    //   return left.ping - right.ping || byName;
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

  // The lobbies the server is serving, which is where the lobby filter's options
  // come from. It is its own read rather than a field of the games because the
  // two answer different questions: a lobby is a place the server runs whether
  // or not anything is hosted in it, so a lobby with no game in it right now is
  // still a lobby a reader may be looking for — while the games are a moment and
  // are re-read every minute.
  //
  // A read that fails is reported only when the games came back, because a page
  // that already has its own error message for the list would be drawing a second
  // one beside the first; and the filter keeps working either way, from the
  // lobbies the games themselves name, which is what the options below fall back
  // to.
  const {
    data: lobbyList,
    error: lobbyError,
    reload: reloadLobbies,
  } = useApiResource<{ lobbies: string[] }>('/api/lobbies');

  // The list reads itself again while the page is open. The interval is armed once
  // and never re-armed: `reload` changes an identity inside the hook rather than
  // being a new function, so depending on it would restart the timer after every
  // tick and the list would never refresh at all.
  //
  // The lobby list is read on the same tick. It is the same size of a query and
  // it is what the filter's options are built from, so a lobby started or stopped
  // while the page sat open would otherwise be missing from — or stuck in — the
  // dropdown, offering a reader a choice the server no longer makes.
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
        reloadLobbies();
      }
    }, RefreshSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [reload, reloadLobbies]);

  const [query, setQuery] = useState('');
  const [lobby, setLobby] = useState(AnyValue);
  const [access, setAccess] = useState(AnyValue);
  const [map, setMap] = useState(AnyValue);
  const [rule, setRule] = useState(AnyValue);
  const [order, setOrder] = useState('players');

  /**
   * Every value the lobby filter offers: the server's own lobbies, then any
   * lobby a listed game is in that the first list did not name.
   *
   * The server's list comes first and keeps its order, because that is the order
   * the client is sent the lobby list in and the order a player who switches
   * between lobbies does it in. Alphabetising would scatter the lobbies a player
   * moves between into an order they have never seen.
   *
   * The games then add their own names, for the two ways a room can be in a
   * lobby the server's list did not hand us: the lobby row the room points at
   * was not readable (a room with no lobby still sits on the page under a word
   * saying so), or the lobbies read has just failed and these names are all there
   * is. Without them a reader could be shown a game no option in the dropdown
   * reaches — which is a filter that hides rather than narrows.
   *
   * A lobby with nothing hosted in it stays on the list. That is the point of
   * reading the table: the question is which lobbies the server has, not which
   * are busy, and a quiet lobby picked from the list answers with "no game
   * matches" rather than being an option the page never offered.
   */
  const lobbyOptions = useMemo(() => {
    const seen = new Set<string>();
    const options = [{ value: AnyValue, label: 'All lobbies' }];

    function offer(name: string) {
      if (seen.has(name)) {
        return;
      }

      seen.add(name);
      options.push({ value: LobbyPrefix + name, label: name });
    }

    for (const name of lobbyList?.lobbies ?? []) {
      offer(name);
    }

    for (const game of games) {
      offer(game.lobbyName ?? UnnamedLobby);
    }

    return options;
  }, [lobbyList, games]);

  const filtered = useMemo(
    () => games.filter((game) => matchesFilters(game, query, lobby, access, map, rule)),
    [games, query, lobby, access, map, rule],
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
    (access === AnyValue ? 0 : 1) +
    (map === AnyValue ? 0 : 1) +
    (rule === AnyValue ? 0 : 1);

  const busy = activeFilters > 0;

  function clearFilters() {
    setQuery('');
    setLobby(AnyValue);
    setAccess(AnyValue);
    setMap(AnyValue);
    setRule(AnyValue);
  }

  return (
    <div className="space-y-6">
      <SectionHeading title="Games" />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      {/* The lobby list failing on its own is reported only while the games came
          back, so a page that is already saying the read failed does not draw the
          same sentence twice — and a page whose games did fail has that message
          to show instead. */}
      {error !== null || lobbyError === null ? null : (
        <StatusMessage kind="error">{lobbyError}</StatusMessage>
      )}

      {/* The controls, in one line, once there is a list to control. While the
          first read is in flight there is nothing to filter, sort or count, so
          the line is not drawn rather than drawn from a count of zero. */}
      {data === null ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Funnel aria-hidden="true" />
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
                  Narrow the games by name, lobby, access, map or mode.
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
                <FilterSelect label="Lobby" value={lobby} options={lobbyOptions} onChange={setLobby} />
                <FilterSelect label="Access" value={access} options={AccessOptions} onChange={setAccess} />
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

          <Select value={order} onValueChange={setOrder}>
            <SelectTrigger aria-label="Order by" className="w-auto justify-start">
              <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>Order by</span>
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
            onClick={reload}
            disabled={loading}
          >
            <RefreshCw className={cn(loading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </Button>

          {/* The count sits beside the last button rather than pushed to the far
              end of the line: the controls are one block the reader reads left to
              right, and a count flung to the opposite edge is a figure separated
              from the controls that change it. The total is always the second
              number, and while a filter is narrowing the list the first number
              says how much of that total the cards below are showing — so the
              reader can tell at a glance what the filter did to the list. */}
          <p className="text-base text-muted-foreground tabular-nums">
            {busy
              ? `${formatNumber(filtered.length)} of ${formatNumber(games.length)} games`
              : `${formatNumber(games.length)} games`}
          </p>
        </div>
      )}

      {games.length === 0 ? (
        loading ? (
          <LoadingBlock centered />
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
