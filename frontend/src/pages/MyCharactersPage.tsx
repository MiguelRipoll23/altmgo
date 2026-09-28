import { Link } from 'react-router-dom';
import { DataTable, Panel, SectionHeading, formatDate, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import { characterLevel, characterTitle, isClientTitle } from '../lib/game';

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
      <SectionHeading
        title="Characters"
        subtitle="The characters on this account, with the level and title the game gives them."
      />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Panel
        title="Your characters"
        description={
          loading
            ? 'Reading your characters…'
            : `${formatNumber(characters.length)} ${characters.length === 1 ? 'character' : 'characters'} on this account`
        }
      >
        <DataTable
          rows={characters}
          rowKey={(row) => row.id}
          empty="This account has no characters yet. Create one in the client."
          loading={loading}
          loadingLabel="Reading the characters…"
          columns={[
            {
              header: 'Character',
              cell: (row) => (
                <Link
                  to={`/dashboard/characters/${row.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            {
              header: 'Title',
              cell: (row) => <CharacterTitleCell rank={row.rank} />,
            },
            {
              header: 'Level',
              cell: (row) => formatNumber(characterLevel(row.experience)),
              className: 'text-right tabular-nums',
            },
            {
              header: 'Experience',
              cell: (row) => formatNumber(row.experience),
              className: 'text-right tabular-nums',
            },
            {
              header: 'Rewards',
              cell: (row) => formatNumber(row.totalRewards),
              className: 'text-right tabular-nums',
            },
            {
              header: 'Clan',
              cell: (row) => (row.clan === null ? null : row.clan.name),
            },
            { header: 'Last seen', cell: (row) => formatDate(row.lastSeenAt) },
          ]}
        />
      </Panel>
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
