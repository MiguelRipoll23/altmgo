import { ArrowLeft, Link2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  LoadingBlock,
  Panel,
  SectionHeading,
  formatDate,
  formatNumber,
} from '../../components/DataDisplay';
import { StatusMessage } from '../../components/StatusMessage';
import { useApiResource } from '../../components/useApiResource';
import {
  ClientTitleCount,
  isClientTitle,
  characterTitle,
} from '../../lib/game';
import { Detail, LevelGauge } from '../CharacterDetailPage';
import { CharacterTitleCell } from '../MyCharactersPage';

/** One character as the staff section reads it, before its own page's extra fields. */
type StaffCharacter = {
  id: number;
  name: string;
  accountName: string;
  rank: number;
  experience: number;
  totalRewards: number;
  lobbyName: string | null;
  publicAddress: string | null;
  lastSeen: string | null;
  previousName: string | null;
  comment: string;
  createdAt: string;
  lastSeenAt: string | null;
};

type CharacterProfile = { character: StaffCharacter };

/**
 * One character, as the staff section read it out of the list and drew underneath.
 *
 * It was a panel at the foot of the directory: the search stayed on screen, the
 * list stayed on screen, and the profile the reader had asked for arrived below
 * everything they had not. It had no address, so it could not be sent to a
 * colleague, refreshed, or opened beside the directory it came from. It is a page
 * for the same reason the clan is one — a character is the thing a moderator
 * goes looking for, and the answer should be the thing the address names.
 *
 * It is the player's own character page plus the fields only a member of staff
 * would ask for: the account it belongs to, the name it was renamed away from,
 * and the comment left on it. It reads through the admin route rather than the
 * account's, because the reader is not the owner.
 */
export function AdminCharacterDetailPage() {
  const { identifier } = useParams();
  const { data, error, loading } = useApiResource<CharacterProfile>(
    `/api/admin/characters/${identifier}`,
  );

  const character = data?.character ?? null;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/characters"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All characters
      </Link>

      <SectionHeading
        title={character?.name ?? 'Character'}
        subtitle="The character as the game stores it: the account it belongs to, its progress, and the address it published."
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
        <>
          <Panel title="Record">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Account" value={character.accountName} />
              <Detail label="Previous name" value={character.previousName} />
              <Detail
                label="Rank"
                value={
                  character.rank === 0
                    ? null
                    : `${formatNumber(character.rank)} — ${characterTitle(character.rank)}`
                }
              />
              <Detail
                label="Total rewards"
                value={formatNumber(character.totalRewards)}
              />
              <Detail label="Lobby" value={character.lobbyName} />
              <Detail label="Published address" value={character.publicAddress} />
              <Detail label="Created" value={formatDate(character.createdAt)} />
              <Detail label="Last seen" value={formatDate(character.lastSeenAt)} />
              <Detail label="Quiet for" value={quietFor(character.lastSeenAt)} />
            </dl>

            {character.comment.trim().length === 0 ? null : (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Comment
                </p>
                <p className="mt-1 text-sm text-foreground/90">{character.comment}</p>
              </div>
            )}

            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <Link2 className="mt-0.5 size-3.5 shrink-0" />
              The address is the one the game server last saw this character connect from. It
              is corrected by publishing from the client.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}

/**
 * How long since the character was last seen, in the reader's own terms.
 *
 * It sits beside the date rather than replacing it, because the two answer
 * different questions: the date says when, and this says whether the silence is
 * minutes old or weeks — which is the part a moderator is actually reading.
 */
function quietFor(lastSeen: string | null): string | null {
  if (lastSeen === null) {
    return null;
  }

  const elapsed = Date.now() - new Date(lastSeen).getTime();
  if (Number.isNaN(elapsed)) {
    return null;
  }

  const days = Math.floor(elapsed / 86_400_000);
  if (days < 1) {
    const hours = Math.floor(elapsed / 3_600_000);
    return hours < 1 ? 'Under an hour' : `${formatNumber(hours)} hours`;
  }

  return days === 1 ? 'A day' : `${formatNumber(days)} days`;
}
