import { ArrowLeft, LockKeyhole, Map as MapIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import {
  LoadingBlock,
  Panel,
  SectionHeading,
  formatDate,
  formatNumber,
} from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import type { Game } from '../components/GameCard';
import { useApiResource } from '../components/useApiResource';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { mapImage, mapName } from '../lib/maps';
import { ruleName } from '../lib/gameModes';

type GameRound = {
  rule: number;
  map: number;
  flag: number;
};

type GamePlayer = {
  characterId: number;
  name: string;
  experience: number;
  team: number;
  ping: number;
  joinedAt: string;
};

type HostGameSettings = {
  stance: number;
  maximumPlayers: number;
  briefingTime: number;
  dedicated: boolean;
  nonStat: boolean;
  friendlyFire: boolean;
  autoAim: boolean;
  uniquesEnabled: boolean;
  enemyNametags: boolean;
  silentMode: boolean;
  autoAssign: boolean;
  teamsSwitch: boolean;
  ghosts: boolean;
  voiceChat: boolean;
  levelLimitEnabled: boolean;
  levelLimitBase: number;
  levelLimitTolerance: number;
  teamKillKick: number;
  idleKick: number;
  settingsLobbySubtype: number;
  rotationRules: number[] | null;
  rotationMaps: number[] | null;
  rotationFlags: number[] | null;
  weaponRestrictions: string | null;
  ruleTimers: number[] | null;
  uniqueRed: number;
  uniqueBlue: number;
  commonA: number;
  commonB: number;
  captureExtraTime: boolean;
  sneakingSnakeKills: number;
};

type GameDetails = Game & {
  hostIdentifier: number;
  lobbyIdentifier: number;
  currentGame: number;
  lobbySubtype: number;
  stance: number;
  createdAt: string | null;
  updatedAt: string;
  rotation: GameRound[];
  hostSettings: HostGameSettings | null;
  roster: GamePlayer[];
};

const HostSettingLabels: [keyof HostGameSettings, string][] = [
  ['stance', 'Stance'],
  ['maximumPlayers', 'Maximum players'],
  ['briefingTime', 'Briefing time'],
  ['dedicated', 'Dedicated host'],
  ['nonStat', 'Non-stat game'],
  ['friendlyFire', 'Friendly fire'],
  ['autoAim', 'Auto aim'],
  ['uniquesEnabled', 'Unique characters'],
  ['enemyNametags', 'Enemy name tags'],
  ['silentMode', 'Silent mode'],
  ['autoAssign', 'Auto assign teams'],
  ['teamsSwitch', 'Team switching'],
  ['ghosts', 'Ghosts'],
  ['voiceChat', 'Voice chat'],
  ['levelLimitEnabled', 'Level limit enabled'],
  ['levelLimitBase', 'Level limit base'],
  ['levelLimitTolerance', 'Level limit tolerance'],
  ['teamKillKick', 'Team-kill kick'],
  ['idleKick', 'Idle kick'],
  ['settingsLobbySubtype', 'Settings lobby subtype'],
  ['rotationRules', 'Saved rotation rules'],
  ['rotationMaps', 'Saved rotation maps'],
  ['rotationFlags', 'Saved rotation flags'],
  ['weaponRestrictions', 'Weapon restrictions (hex)'],
  ['ruleTimers', 'Rule timers'],
  ['uniqueRed', 'Red unique character'],
  ['uniqueBlue', 'Blue unique character'],
  ['commonA', 'Common setting A'],
  ['commonB', 'Common setting B'],
  ['captureExtraTime', 'Capture extra time'],
  ['sneakingSnakeKills', 'Sneaking Snake kills'],
];

/** The complete room snapshot exposed by the game server's live database rows. */
export function GameDetailPage() {
  const { identifier } = useParams();
  const { data, error, loading } = useApiResource<{ game: GameDetails }>(
    identifier === undefined ? null : `/api/games/${identifier}`,
  );
  const game = data?.game ?? null;
  const hostSettings = game?.hostSettings ?? null;

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/games"
        className="inline-flex items-center gap-2 text-base font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All games
      </Link>

      <SectionHeading title={game?.name ?? 'Game details'} />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}
      {loading && game === null ? <LoadingBlock centered /> : null}
      {!loading && error === null && game === null ? (
        <p className="text-base text-muted-foreground">That game is no longer being hosted.</p>
      ) : null}

      {game === null ? null : (
        <>
          <Panel title="Room">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                  {game.name}
                </h2>
                {game.hasPassword ? (
                  <Badge variant="warning">
                    <LockKeyhole className="size-3.5" aria-hidden="true" />
                    Password protected
                  </Badge>
                ) : (
                  <Badge variant="success">Open</Badge>
                )}
              </div>
              {game.comment.length === 0 ? (
                <p className="text-base text-muted-foreground">No comment</p>
              ) : (
                <p className="whitespace-pre-wrap text-base text-foreground/90">{game.comment}</p>
              )}
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Game ID" value={formatNumber(game.id)} />
                <Detail label="Host" value={game.hostName ?? 'Unknown'} />
                <Detail label="Host character ID" value={formatNumber(game.hostIdentifier)} />
                <Detail label="Lobby" value={game.lobbyName ?? 'Unknown'} />
                <Detail label="Lobby ID" value={formatNumber(game.lobbyIdentifier)} />
                <Detail label="Playing" value={`${formatNumber(game.players)} of ${formatNumber(game.maximumPlayers)}`} />
                <Detail label="Host ping" value={`${formatNumber(game.ping)} ms`} />
                <Detail label="Room status" value={String(game.status)} />
                <Detail label="Room stance" value={String(game.stance)} />
                <Detail label="Lobby subtype" value={String(game.lobbySubtype)} />
                <Detail label="Created" value={formatDate(game.createdAt)} />
                <Detail label="Last updated" value={formatDate(game.updatedAt)} />
              </dl>
            </div>
          </Panel>

          <Panel
            title="Host's saved settings"
            description="These are the host's current saved settings and may differ from the room if changed after it was created."
          >
            {hostSettings === null ? (
              <p className="text-base text-muted-foreground">
                No saved host-settings row is available for this room.
              </p>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {HostSettingLabels.map(([key, label]) => (
                  <Detail
                    key={key}
                    label={label}
                    value={formatSettingValue(hostSettings[key])}
                  />
                ))}
              </dl>
            )}
          </Panel>

          <Panel title="Current map and rotation">
            <div className="space-y-5">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted/20">
                {mapImage(game.map) === null ? (
                  <div className="flex size-full items-center justify-center">
                    <MapIcon className="size-10 text-muted-foreground/50" aria-hidden="true" />
                  </div>
                ) : (
                  <img
                    src={mapImage(game.map) ?? undefined}
                    alt={mapName(game.map)}
                    className="size-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12">
                  <p className="text-lg font-bold text-white">{mapName(game.map)}</p>
                  <p className="text-base text-white/90">{ruleName(game.rule)}</p>
                </div>
              </div>

              {game.rotation.length === 0 ? (
                <p className="text-base text-muted-foreground">No readable rotation is stored.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Round</TableHead>
                      <TableHead scope="col">Mode</TableHead>
                      <TableHead scope="col">Map</TableHead>
                      <TableHead scope="col">Flag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {game.rotation.map((round, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            {index + 1}
                            {index === game.currentGame ? (
                              <Badge variant="success">Current</Badge>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell>{ruleName(round.rule)}</TableCell>
                        <TableCell>{mapName(round.map)}</TableCell>
                        <TableCell className="tabular-nums">{round.flag}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Panel>

          <Panel
            title="Roster"
            description={`${formatNumber(game.roster.length)} ${game.roster.length === 1 ? 'member' : 'members'} currently in the room`}
          >
            {game.roster.length === 0 ? (
              <p className="text-base text-muted-foreground">No players are currently listed.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Character</TableHead>
                    <TableHead scope="col">Team slot</TableHead>
                    <TableHead scope="col" className="text-right">Experience</TableHead>
                    <TableHead scope="col" className="text-right">Ping</TableHead>
                    <TableHead scope="col">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {game.roster.map((player) => (
                    <TableRow key={player.characterId}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {player.name}
                          {player.characterId === game.hostIdentifier ? (
                            <Badge variant="secondary">Host</Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        {player.team === 254 ? 'No team' : `Slot ${player.team}`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(player.experience)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(player.ping)} ms
                      </TableCell>
                      <TableCell>{formatDate(player.joinedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-base uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-base text-foreground/90">{value}</dd>
    </div>
  );
}

function formatSettingValue(value: boolean | number | number[] | string | null): string {
  if (value === null) {
    return 'Not set';
  }

  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled';
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? 'None' : value.map(formatNumber).join(', ');
  }

  if (typeof value === 'string') {
    return value.length === 0 ? 'None' : `0x${value}`;
  }

  return formatNumber(value);
}
