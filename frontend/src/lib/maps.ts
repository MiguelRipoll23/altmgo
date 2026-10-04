/**
 * The maps the game can be played on, kept here because the client numbers them
 * and the dashboard only draws them.
 *
 * The numbers are the client's own. The game server stores a room's rotation as
 * a JSON array of `[rule, map, flag]` triples and an index into it, and the map
 * in a triple is one of these numbers — the same table the client walks to label
 * a map on its own map-select screen. They are reproduced rather than invented
 * so that a card shows the map the room is actually on; a table renumbered to
 * start at zero, or to skip the gap at sixteen, would put the wrong picture on
 * most of the cards while still looking right.
 *
 * The names are the client's too, and they disagree in one place worth knowing:
 * the client writes map four as "Gronznyj Grad" while the wiki the pictures came
 * from spells it "Groznyj". The client's spelling is the one shown, because the
 * game shows that one.
 *
 * Nothing here talks to the API. It is the display side of a number the API
 * sends, and it is the client's table rather than the server's: the server stores
 * the number and never names it.
 */

/**
 * Map number to the name the client gives it.
 *
 * Zero is `None` and is a real entry rather than a missing one: it is what a
 * room reports when its rotation names no map, and the client's own table has a
 * name for it. Sixteen is absent because the client's table has no sixteen — the
 * numbering steps straight from `Outer Outlet` at fifteen to `Desert Duel` at
 * seventeen, and that gap is not filled in here.
 */
const MapNames: Record<number, string> = {
  0: 'None',
  1: 'Forest Firefight',
  2: 'Ambush Alley',
  3: 'Urban Ultimatum',
  4: 'Gronznyj Grad',
  5: 'Coppertown Conflict',
  6: 'Hazard House',
  7: 'Blood Bath',
  8: 'Tomb of Tubes',
  9: 'Ravaged Riverfront',
  10: 'Silo Sunset',
  11: 'Icebound Inferno',
  12: 'Midtown Maelstrom',
  13: 'Winter Warehouse',
  14: 'Virtuous Vista',
  15: 'Outer Outlet',
  17: 'Desert Duel',
  18: 'Lethal Leviathan',
  19: 'Perilous Palace',
  20: 'Quaint Quarrel',
  21: 'Jade Junction',
  22: 'Eastern Europe',
};

/**
 * Map number to the file in `public/maps` that draws it.
 *
 * Sixteen is missing for the second reason as well as the first: it is an
 * unreleased map, and no picture of it exists to copy. Every other map in the
 * client's table has one here, and a room on a map without one falls back to the
 * icon rather than to a broken image.
 */
const MapImages: Record<number, string> = {
  1: 'forest-firefight',
  2: 'ambush-alley',
  3: 'urban-ultimatum',
  4: 'gronznyj-grad',
  5: 'coppertown-conflict',
  6: 'hazard-house',
  7: 'blood-bath',
  8: 'tomb-of-tubes',
  9: 'ravaged-riverfront',
  10: 'silo-sunset',
  11: 'icebound-inferno',
  12: 'midtown-maelstrom',
  13: 'winter-warehouse',
  14: 'virtuous-vista',
  15: 'outer-outlet',
  17: 'desert-duel',
  18: 'lethal-leviathan',
  19: 'perilous-palace',
  20: 'quaint-quarrel',
  21: 'jade-junction',
  22: 'eastern-europe',
};

/** What a map of this number is called, or the word for having none. */
export function mapName(map: number): string {
  return MapNames[map] ?? `Map ${map}`;
}

/**
 * The picture of this map, or null when there is none to show.
 *
 * Null is a real answer and the caller is expected to draw something in its
 * place, because the two ways of having no picture are different: a number the
 * client's table has no entry for is a map this build has never heard of, while
 * sixteen is a map the table names and nothing has a picture of. Neither should
 * leave a broken-image icon where a room is being advertised.
 *
 * The path is absolute from the site root rather than relative, because the
 * pictures are served out of `public` by the dev server and copied to the root
 * of the build, while the pages that draw them sit at whatever depth the router
 * put them. A relative `maps/x.webp` would resolve against the current route and
 * break the moment the page were not at the top level.
 */
export function mapImage(map: number): string | null {
  const slug = MapImages[map];

  return slug === undefined ? null : `/maps/${slug}.webp`;
}

/**
 * The maps in the client's own order, for a filter to list.
 *
 * Taken from the numbering rather than written out again, so a map added to the
 * table above is a map the filter can name without a second edit. `None` is in
 * the list because it is a real entry in the client's table — it is what a room
 * reports when its rotation names no map — and a reader filtering for the rooms
 * with no map named is asking the same question as one picking `None`.
 *
 * There is no entry for sixteen, because the client's table has none: a reader
 * cannot filter for a map this build has never named, which is the honest
 * consequence of not knowing it.
 */
export const KnownMaps: { map: number; label: string }[] = Object.entries(MapNames)
  .map(([map, label]) => ({ map: Number(map), label }))
  .sort((left, right) => left.map - right.map);
