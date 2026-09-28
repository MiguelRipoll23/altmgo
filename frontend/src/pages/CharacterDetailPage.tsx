import { ArrowLeft, Link2 } from 'lucide-react';
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
  publicAddress: string | null;
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
 * thresholds its experience has cleared, which means the useful question is not
 * "what is the level" but "how far into it" — so the gauge is the figure and the
 * two experience totals are written on it, the same way the client draws the
 * number under the bar. A character at the ceiling is drawn full and says so,
 * because the client clamps there too and there is no next level to be short of.
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
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All characters
      </Link>

      <SectionHeading
        title={character?.name ?? 'Character'}
        subtitle="The character as the game stores it: its progress, its title and the address it publishes."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel title="Progress">
        {character === null ? (
          loading ? (
            <LoadingBlock label="Reading the character…" />
          ) : error === null ? (
            <p className="text-sm text-muted-foreground">That character could not be read.</p>
          ) : null
        ) : (
          <div className="space-y-5">
            <LevelGauge experience={character.experience} />

            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">Worn title</p>
              <CharacterTitleCell rank={character.rank} />
              {character.rank > 0 && isClientTitle(character.rank) ? (
                <p className="text-xs text-muted-foreground">
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
            <Detail label="Experience" value={formatNumber(character.experience)} />
            <Detail label="Total rewards" value={formatNumber(character.totalRewards)} />
            <Detail label="Clan" value={character.clan?.name ?? null} />
            <Detail
              label="Rank in clan"
              value={character.clan === null ? null : formatNumber(character.clan.rank)}
            />
            <Detail label="Last seen" value={formatDate(character.lastSeenAt)} />
            <Detail label="Published address" value={character.publicAddress} />
          </dl>

          {character.comment.trim().length === 0 ? null : (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Comment</p>
              <p className="mt-1 text-sm text-foreground/90">{character.comment}</p>
            </div>
          )}

          <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
            <Link2 className="mt-0.5 size-3.5 shrink-0" />
            The address is the one the game server last saw this character connect from. It is
            corrected by publishing from the client, and it is the address another player joins
            this character&apos;s game on.
          </p>
        </Panel>
      )}
    </div>
  );
}

/**
 * The level bar, with the two totals written on it.
 *
 * The bar is a `div` rather than a progress element because the figure being
 * drawn is a position within a band rather than progress towards an end, and a
 * native progress bar would say "22 of 22" for a character at the ceiling, which
 * is not what the client's gauge says at all.
 */
export function LevelGauge({ experience }: { experience: number }) {
  const { level, from, to, ratio, atCeiling } = characterLevelProgress(experience);
  const percent = Math.round(ratio * 100);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xl font-extrabold tracking-tight text-foreground">
          Level {formatNumber(level)}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatNumber(experience)} experience
        </p>
      </div>

      <div
        role="meter"
        aria-valuenow={level}
        aria-valuemin={0}
        aria-valuemax={MaximumLevel}
        aria-label="Level"
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {atCeiling ? (
          <>Level {MaximumLevel} is the highest the table defines; this character is past its last threshold.</>
        ) : (
          <>
            Level {formatNumber(level + 1)} at {formatNumber(to)} experience —{' '}
            {formatNumber(to - experience)} to go.
          </>
        )}
      </p>
      {!atCeiling ? (
        <p className="mt-1 text-xs text-muted-foreground">
          This level began at {formatNumber(from)} experience.
        </p>
      ) : null}
    </div>
  );
}

/** One labelled figure of a character. */
export function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground/90">{value ?? '—'}</dd>
    </div>
  );
}
