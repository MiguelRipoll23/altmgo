import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingBlock, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import {
  MaximumLevel,
  characterLevelProgress,
  characterTitle,
  isClientTitle,
} from '../lib/game';

/**
 * One of the caller's own characters, as the game would draw it.
 */
type OwnedCharacter = {
  id: number;
  name: string;
  rank: number;
  experience: number;
  totalRewards: number;
  comment: string;
  lastSeenAt: string | null;
  publicAddress: string | null;
  clan: { name: string; rank: number } | null;
};

/**
 * The characters this account owns, and what the game makes of each of them.
 *
 * It sits after the overview because it is the next question a returning player
 * has: the overview says the server is up and what address this account publishes,
 * and this says who they are publishing it as. Everything on the page is a number
 * the game already keeps — the experience the client's level is walked out of, the
 * rank the client's title badge is drawn from, the reward total its card prints —
 * so the page is showing the same character the client would, and the derivations
 * live in one module beside the tables they walk.
 *
 * The rank is drawn as its animal rather than as a number. A rank of 12 is a
 * storage identifier; an Owl is what the client shows, and a dashboard that
 * printed the number would be reporting the format rather than the rank.
 *
 * The characters are cards rather than a table, on the same reasoning as the
 * Survival teams and the tournament's fixtures: a character is a handful of figures
 * that belong together and are read one at a time, and a table of them asks a
 * reader to hold seven columns in their head to answer "how far along is this one".
 * Each card is the character's own page, so the whole card is the link — a
 * character is something a player pastes, and a card whose link is its name is a
 * card that can only be shared from one small part of itself.
 *
 * Nothing here writes. A character is created, renamed and levelled in the client,
 * and a page that could do any of it would be a second place for the client and
 * the dashboard to disagree about who somebody is.
 */
export function MyCharactersPage() {
  const { data, error, loading } = useApiResource<{ characters: OwnedCharacter[] }>(
    '/api/account/characters',
  );

  const characters = data?.characters ?? [];

  return (
    <div className="space-y-6">
      <SectionHeading title="Characters" />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      {characters.length === 0 ? (
        loading ? (
          <LoadingBlock label="Reading the characters…" />
        ) : (
          <p className="text-base text-muted-foreground">
            This account has no characters yet. Create one in the client.
          </p>
        )
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {characters.map((character) => (
            <li key={character.id}>
              <Link
                to={`/dashboard/characters/${character.id}`}
                className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-card/50 px-4 py-4 transition hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight text-foreground">
                    {character.name}
                  </h2>
                  {character.clan === null ? null : (
                    // `verbatim`: a clan names itself, so the badge shows the name
                    // as its owner wrote it rather than shouting it. The badge's
                    // uppercase is right for the states the dashboard words itself
                    // and wrong for the one thing on this card a person typed.
                    <Badge variant="secondary" verbatim>
                      {character.clan.name}
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">
                    Level {formatNumber(characterLevelProgress(character.experience).level)}
                  </p>
                  <p className="text-base text-muted-foreground">
                    {formatNumber(character.experience)} exp
                  </p>
                </div>

                <LevelBar experience={character.experience} />

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                  <CharacterTitleCell rank={character.rank} />
                  <span className="text-muted-foreground tabular-nums">
                    {formatNumber(character.totalRewards)} rewards
                  </span>
                </div>

                <p className="text-base text-muted-foreground">
                  Last seen {formatDate(character.lastSeenAt)}
                </p>

                <span className="mt-auto inline-flex items-center gap-1.5 text-base font-medium text-primary">
                  See the character
                  <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The level bar, at the height a card can carry.
 *
 * It is the gauge the client draws under a character: the list has six figures per
 * character and the bar is the one of them that cannot be read as a number, so it
 * is the one thing here that shows progress rather than stating a fact. The detail
 * page is where the level is written out beside it.
 */
function LevelBar({ experience }: { experience: number }) {
  const { level, ratio } = characterLevelProgress(experience);

  return (
    <div
      role="meter"
      aria-valuenow={level}
      aria-valuemin={0}
      aria-valuemax={MaximumLevel}
      aria-label="Level"
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
    </div>
  );
}

/**
 * A character's title, drawn as the animal the client draws.
 *
 * A rank past the client's own table is shown as a muted figure beside the name
 * rather than as a badge, because the client has no badge for it: the title is
 * real and it is latched, it is simply one the client cannot draw, and a page that
 * dressed it as a title the game shows would be claiming something the game does
 * not do.
 */
export function CharacterTitleCell({ rank }: { rank: number }) {
  if (rank === 0) {
    return <span className="text-muted-foreground">No title</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <span className={isClientTitle(rank) ? 'text-foreground' : 'text-muted-foreground'}>
        {characterTitle(rank)}
      </span>
      {isClientTitle(rank) ? null : <Badge variant="secondary">not drawn by the client</Badge>}
    </span>
  );
}
