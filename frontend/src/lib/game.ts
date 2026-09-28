/**
 * The two mappings the game derives from a character's stored numbers, kept here
 * because the game itself derives them rather than storing them.
 *
 * Both are ports of the game server's own definitions — `LevelUtils` and
 * `AnimalRankService` in `mgo2-server`, under `src/Shared/Domain/Characters` — and
 * they are ports rather than approximations because a dashboard that derives a
 * level by a different rule is a dashboard that disagrees with the game about the
 * same character on the same screen. The server stores the experience and the rank
 * number; the client turns those into a level and a title, and this turns them
 * into the same two things.
 *
 * Nothing here talks to the API. It is the display side of a number the API sends.
 */

/**
 * Experience at which each level is reached, ascending: level `n` is reached at
 * `Thresholds[n - 1]`.
 *
 * The table is not in the client's binary. The client walks a 128-entry array in
 * `.bss` that is zero at load and filled at runtime by a native from a stage
 * script; these are that script's argument list, read out of the server repo's
 * own notes. The walk counts the entries at or below the experience and returns
 * the count, so a level is the number of thresholds cleared and the length of the
 * table is the ceiling: level 22 at 4,600 experience, and everything above that
 * still 22.
 */
const LevelThresholds = [
  125, 250, 375, 500, 650, 800, 950, 1100, 1275, 1450,
  1625, 1800, 2000, 2200, 2400, 2600, 2850, 3100, 3350, 3600,
  4100, 4600,
];

/** The highest level the table defines. Zero is a real level, not a missing one. */
export const MaximumLevel = LevelThresholds.length;

/** The level a character of this experience displays, derived as the client does. */
export function characterLevel(experience: number): number {
  let level = 0;

  // The walk is written as a break rather than a condition on the lookup, because
  // reading one entry past the end of the table is the very mistake the ceiling is
  // here to prevent: the loop counts the entries at or below the experience and
  // stops at the first that is above it, and at the end of the table there is no
  // next entry to compare against, which is what makes the last level the last.
  for (;;) {
    const threshold = LevelThresholds[level];

    if (threshold === undefined || threshold > experience) {
      return level;
    }

    level += 1;
  }
}

/** The first experience total that displays as this level. */
export function experienceAtLevel(level: number): number {
  if (level <= 0) {
    return 0;
  }

  // A level past the table clamps to its last entry rather than being refused, the
  // same way the client clamps its own centre column to the range it has.
  return LevelThresholds[Math.min(level, LevelThresholds.length) - 1] ?? 0;
}

/**
 * How far along the ladder a character is, for a gauge.
 *
 * The ratio is the level against the ceiling — level 12 is 12 of 22 — and not how
 * far through the current level they are. It was the second, and that made the bar
 * wrong for most of the characters on the server: the game starts every new
 * character at `ExperienceAtLevel(12)`, which is exactly the threshold that level 12
 * begins at, so a brand new character had a ratio of precisely zero and a bar with
 * nothing in it. The reading was "this character has done nothing since the moment
 * they were created", which is true and is not what a level bar is for.
 *
 * It is also what the client draws. The level table's own notes record that the
 * automatch gauge is twenty-three columns wide — levels zero through twenty-two —
 * with a centre column that clamps at either end, so the client's gauge is a ladder
 * of levels and not a fill within one. A continuous bar over the same ladder is the
 * nearest honest equivalent in a list of cards.
 *
 * `atCeiling` says the character has run out of table: the client clamps its own
 * gauge to the last level rather than refusing to draw one, so the bar is drawn full
 * and the page says the ceiling is reached rather than inventing a twenty-third
 * level to be short of.
 */
export function characterLevelProgress(experience: number): {
  level: number;
  /** How much of the way from level zero to the ceiling this character is, from 0 to 1. */
  ratio: number;
  atCeiling: boolean;
} {
  const level = characterLevel(experience);

  return {
    level,
    ratio: Math.min(1, Math.max(0, level / MaximumLevel)),
    atCeiling: level >= MaximumLevel,
  };
}

/**
 * Rank identifiers, which are the client's own: the server derives a number and
 * the client draws an animal. Zero is no rank at all.
 *
 * The first twenty-two are the client's title table, in the order it draws them:
 * the worn title is the rank number, and the client has a badge for each of those
 * and no badge past it. Beyond twenty-two the server's own vocabulary continues —
 * the reward service can latch those — and the names are still the server's, so
 * they are shown rather than being reported as a bare number, with the ceiling
 * documented on `characterTitle`.
 *
 * The gaps are real. The identifiers are the client's, not a sequence, so there is
 * no twenty-fifth animal and nothing here fills one in.
 */
const AnimalRanks: Record<number, string> = {
  1: 'Foxhound',
  2: 'Fox',
  3: 'Doberman',
  4: 'Hound',
  5: 'Crocodile',
  6: 'Eagle',
  7: 'Jaws',
  8: 'Water Bear',
  9: 'Sloth',
  10: 'Flying Squirrel',
  11: 'Pigeon',
  12: 'Owl',
  13: 'Tsuchinoko',
  14: 'Snake',
  15: 'Kerotan',
  16: 'GA-KO',
  17: 'Chameleon',
  18: 'Chicken',
  19: 'Bear',
  20: 'Tortoise',
  21: 'Bee',
  22: 'Rat',
  23: 'Fighting Fish',
  24: 'Komodo Dragon',
  26: 'Killer Whale',
  27: 'Elephant',
  28: 'Cuckoo',
  29: 'Hog',
  40: 'Octopus',
  42: 'Panda',
  43: 'Puma',
  44: 'Scorpion',
  46: 'Mantis',
  48: 'Night Owl',
  50: 'Hawk',
  52: 'Ocelot',
};

/** How many of those the client carries a badge for, and draws as a worn title. */
export const ClientTitleCount = 22;

/** What a character of this rank is called, or the word for having none. */
export function characterTitle(rank: number): string {
  if (rank === 0) {
    return 'No title';
  }

  return AnimalRanks[rank] ?? `Rank ${rank}`;
}

/**
 * Whether the client can draw this rank as a title at all.
 *
 * It is a real answer rather than an edge case: the client walks a twenty-two
 * entry table and reads past the end of it above that, which is why the server
 * never latches a title past it. A character holding a higher number is not
 * broken, it is a number the game has no badge for, and the page says so instead
 * of drawing something the client would not.
 */
export function isClientTitle(rank: number): boolean {
  return rank >= 1 && rank <= ClientTitleCount;
}
