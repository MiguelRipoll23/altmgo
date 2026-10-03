/**
 * The rules a room can be played on, kept here because the client numbers them
 * and the dashboard only draws them.
 *
 * These are ports of the game server's own rule enum rather than a table
 * written out for the dashboard, for the same reason the map table is: the
 * server stores the number in the first entry of a rotation's `[rule, map,
 * flag]` triple and the client is what turns it into a word, so a renumbered
 * table here would name the wrong rule on most of the cards while still
 * looking right.
 *
 * The eight here are the live-confirmed ones. They are settled in
 * `mgo2-server`'s own notes rather than inferred: a game was created per mode in
 * a known order and the rule byte read off the client's own host settings
 * (`0x4310`) — DM 0, TDM 1, Rescue 2, Capture 3, Sneaking 4, Base 5, Bomb 6,
 * Team Sneaking 7. Bomb was never emitted by the scoring table, which is why it
 * is absent from that list, but it is named in the same sources as the others.
 *
 * The rest of the numbers are deliberately not named. The client carries strings
 * for Stealth Deathmatch, Interval, Solo Capture and Race, and the public site
 * lists eleven mode names, but the disc's own lobby string set enumerates
 * exactly the eight above and the scoring table's rows 6, 8, 9 and 10 are never
 * emitted — so the numbering of the remaining names is not something the
 * research established. Rule 11 is accepted by the automatch queue, which makes
 * it real, and it is still unnamed here. Guessing the remaining four from the
 * order a list happens to appear in would put plausible words on cards that are
 * wrong, which is the one failure this table exists to prevent.
 *
 * A number outside the table is not an error. It is a rule this build has never
 * heard of, and it reads as `Mode 12` rather than as nothing.
 */

/**
 * Rule number to the name the client gives it.
 *
 * Zero is Deathmatch and is a real rule rather than the absence of one: the
 * rotation stores it as a plain byte with no sentinel, so a room on Deathmatch
 * is a room whose rule entry is zero and a room that names no rule is also a
 * zero. The two cannot be told apart in the stored data, and Deathmatch is the
 * commoner of the two.
 */
const RuleNames: Record<number, string> = {
  0: 'Deathmatch',
  1: 'Team Deathmatch',
  2: 'Rescue Mission',
  3: 'Capture Mission',
  4: 'Sneaking Mission',
  5: 'Base Mission',
  6: 'Bomb Mission',
  7: 'Team Sneaking',
};

/**
 * What a room playing this rule is called, or a numbered fallback.
 *
 * The fallback keeps the number visible rather than hiding it, because an
 * unnamed rule is still a rule a reader can ask the host about, and `Mode 12` is
 * something to say out loud where a blank is not.
 */
export function ruleName(rule: number): string {
  return RuleNames[rule] ?? `Mode ${rule}`;
}

/** Whether this rule is one this build can name. */
export function isKnownRule(rule: number): boolean {
  return rule in RuleNames;
}

/**
 * The rules in the order the client offers them, for a filter to list.
 *
 * Offered rather than taken as the keys of the table, so the filter is in the
 * client's order — which is the order a player reading the game's own Create
 * Game screen knows them in — instead of the order the numbers happen to sort.
 * Unknown rules a room is actually playing are not in here and so cannot be
 * filtered for, which is the honest consequence of not having named them.
 */
export const KnownRules: { rule: number; label: string }[] = Object.entries(RuleNames)
  .map(([rule, label]) => ({ rule: Number(rule), label }))
  .sort((left, right) => left.rule - right.rule);