import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingBlock, Panel, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import {
  ClientTitleCount,
  MaximumLevel,
  characterLevelProgress,
  isClientTitle,
} from '../lib/game';
import { CharacterTitleCell } from './MyCharactersPage';

/** One of the caller's own characters, as this page reads it. */
type OwnedCharacter = {
  id: number;
  name: string;
  rank: number;
  experience: number;
  totalRewards: number;
  comment: string;
  lastSeenAt: string | null;
  clan: { name: string; rank: number } | null;
};

/**
 * One of the account's own characters, in full.
 *
 * It is a page with an address of its own, like the news item, the letter and the
 * clan, because a character is a thing players paste to each other. It reads
 * through the account's own route, so the address names one of the reader's
 * characters: a character belonging to somebody else answers the same way a
 * character that does not exist does, and there is nothing to find by guessing ids.
 *
 * The progress is drawn rather than tabulated. The client's level is the count of
 * thresholds the character's experience has cleared, and the gauge is drawn at the
 * width that puts it that far into the level, so the bar is the figure and the
 * level is the one number written on it. The experience behind it is not written
 * out: a character at the ceiling is drawn full and says so, because the client
 * clamps there too and there is no next level to be short of.
 */
export function CharacterDetailPage() {
  const { identifier } = useParams();
  const { data, error, loading } = useApiResource<{ character: OwnedCharacter }>(
    `/api/account/characters/${identifier}`,
  );

  const character = data?.character ?? null;

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/characters"
        className="inline-flex items-center gap-2 text-base font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All characters
      </Link>

      <SectionHeading title={character?.name ?? 'Character'} />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel title="Progress">
        {character === null ? (
          loading ? (
            <LoadingBlock label="Reading the character…" />
          ) : error === null ? (
            <p className="text-base text-muted-foreground">That character could not be read.</p>
          ) : null
        ) : (
          <div className="space-y-5">
            <LevelGauge experience={character.experience} />

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-base text-muted-foreground">Worn title</p>
              <CharacterTitleCell rank={character.rank} />
              {character.rank > 0 && isClientTitle(character.rank) ? (
                <p className="text-base text-muted-foreground">
                  Title {character.rank} of the client&apos;s {ClientTitleCount}.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </Panel>

      {character === null ? null : (
        <Panel title="Record">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Total rewards" value={formatNumber(character.totalRewards)} />
            <Detail label="Clan" value={character.clan?.name ?? null} />
            <Detail
              label="Rank in clan"
              value={character.clan === null ? null : formatNumber(character.clan.rank)}
            />
            <Detail label="Last seen" value={formatDate(character.lastSeenAt)} />
          </dl>

          {character.comment.trim().length === 0 ? null : (
            <div className="mt-5">
              <p className="text-base uppercase tracking-widest text-muted-foreground">Comment</p>
              <p className="mt-1 text-base text-foreground/90">{character.comment}</p>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

/**
 * The level bar, reading as the client reads it: the level, out of the levels there
 * are.
 *
 * The bar is the level against the ceiling, which is the same thing the heading
 * says, and no experience is printed. The experience total is a real figure about
 * the character, but every character on a level draws the same bar and differs in
 * that number, so a page showing "1,240 experience" beside a bar the same length
 * as everybody else's says something true and something unhelpful at once. The
 * thresholds stay in `lib/game.ts`, where the level is derived from them; they are
 * not put in front of the reader.
 *
 * The bar is a `div` with a meter role rather than a progress element because the
 * figure being drawn is a level on a ladder rather than progress towards an end: a
 * native progress bar would carry its own label, and this one says "12 of 22" in
 * the heading above it already.
 */
export function LevelGauge({ experience }: { experience: number }) {
  const { level, ratio, atCeiling } = characterLevelProgress(experience);
  const percent = Math.round(ratio * 100);

  return (
    <div>
      <p className="text-2xl font-extrabold tracking-tight text-foreground">
        Level {formatNumber(level)}{' '}
        <span className="text-base font-semibold text-muted-foreground">
          of {formatNumber(MaximumLevel)}
        </span>
      </p>

      <div
        role="meter"
        aria-valuenow={level}
        aria-valuemin={0}
        aria-valuemax={MaximumLevel}
        aria-valuetext={`Level ${level} of ${MaximumLevel}`}
        aria-label="Level"
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {atCeiling ? (
        <p className="mt-2 text-base text-muted-foreground">
          Level {MaximumLevel} is the highest the table defines; this character is past its
          last threshold, and the bar is drawn full because the client draws it full there.
        </p>
      ) : null}
    </div>
  );
}

/** One labelled figure of a character. */
export function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-base uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base text-foreground/90">{value ?? '—'}</dd>
    </div>
  );
}
