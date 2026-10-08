import { ArrowLeft, Gamepad2, LockKeyhole, Map as MapIcon, UserRound, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingBlock, SectionHeading, formatNumber } from '../components/DataDisplay';
import { ClanEmblem } from '../components/ClanEmblem';
import { StatusMessage } from '../components/StatusMessage';
import type { Game } from '../components/GameCard';
import { PingIndicator } from '../components/PingIndicator';
import { Badge } from '../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { useApiResource } from '../components/useApiResource';
import { ruleName } from '../lib/gameModes';
import { mapImage, mapName } from '../lib/maps';

type GameRound = {
  rule: number;
  map: number;
  flag: number;
};

type GamePlayer = {
  characterId: number;
  name: string;
  ping: number;
  clan: { id: number; name: string; hasEmblem: boolean } | null;
};

type GameDetails = Game & {
  hostIdentifier: number;
  currentGame: number;
  rotation: GameRound[];
  roster: GamePlayer[];
};

/** A player-friendly view of the map, playlist, and people in a live game. */
export function GameDetailPage() {
  const { identifier } = useParams();
  const { data, error, loading } = useApiResource<{ game: GameDetails }>(
    identifier === undefined ? null : `/api/games/${identifier}`,
  );
  const game = data?.game ?? null;
  const currentRound = game?.rotation[game.currentGame];

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/games"
        className="inline-flex items-center gap-2 text-base font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        All games
      </Link>

      <SectionHeading title={game?.name ?? 'Game details'} className="mb-0" />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}
      {loading && game === null ? <LoadingBlock centered /> : null}
      {!loading && error === null && game === null ? (
        <p className="text-base text-muted-foreground">This game is no longer being hosted.</p>
      ) : null}

      {game === null ? null : (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative aspect-[16/7] min-h-52 overflow-hidden bg-muted/30 sm:min-h-64">
              {mapImage(currentRound?.map ?? game.map) === null ? (
                <div className="flex size-full items-center justify-center">
                  <MapIcon className="size-12 text-muted-foreground/50" aria-hidden="true" />
                </div>
              ) : (
                <img
                  src={mapImage(currentRound?.map ?? game.map) ?? undefined}
                  alt={mapName(currentRound?.map ?? game.map)}
                  className="absolute inset-0 size-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-widest text-white/75">
                    {mapName(currentRound?.map ?? game.map)}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {ruleName(currentRound?.rule ?? game.rule)}
                  </h2>
                </div>
                <div className="shrink-0 text-right text-white drop-shadow-md">
                  <p className="text-lg font-extrabold tabular-nums leading-none sm:text-xl">
                    {formatNumber(game.players)}
                    <span className="font-medium text-white/75">
                      {' '}/ {formatNumber(game.maximumPlayers)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/75">
                    Players
                  </p>
                </div>
              </div>
              <div className="absolute right-4 top-4">
                {game.hasPassword ? (
                  <Badge variant="warning" className="bg-black/60">
                    <LockKeyhole className="size-4" aria-hidden="true" />
                    Password protected
                  </Badge>
                ) : null}
              </div>
            </div>

            <CardContent className="pt-5 sm:pt-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Hosted by
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-lg font-bold text-foreground">
                    {game.hostName ?? 'Unknown host'}
                  </p>
                  <PingIndicator ping={game.ping} />
                </div>
                {game.comment.trim() === '' ? null : (
                  <p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">
                    {game.comment}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-primary" aria-hidden="true" />
                Players in this game
              </CardTitle>
              <CardDescription>
                {game.roster.length === 0
                  ? 'Nobody is listed in the room yet.'
                  : `${formatNumber(game.roster.length)} ${game.roster.length === 1 ? 'player' : 'players'} in the room`}
              </CardDescription>
            </CardHeader>
            {game.roster.length === 0 ? (
              <CardContent>
                <p className="text-base text-muted-foreground">
                  Nobody is listed in the room yet.
                </p>
              </CardContent>
            ) : (
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {game.roster.map((player) => {
                    const isHost = player.characterId === game.hostIdentifier;
                    return (
                      <li
                        key={player.characterId}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/50 p-3"
                      >
                        {player.clan === null ? (
                          <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground/50"
                            aria-label="No clan emblem"
                            title="No clan"
                          >
                            <UserRound className="size-5" aria-hidden="true" />
                          </span>
                        ) : (
                          <ClanEmblem
                            clanId={player.clan.id}
                            name={player.clan.name}
                            hasEmblem={player.clan.hasEmblem}
                            size="size-10"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                          {player.name}
                        </span>
                        <PingIndicator ping={player.ping} />
                        {isHost ? <Badge variant="secondary">Host</Badge> : null}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="size-4 text-primary" aria-hidden="true" />
                Playlist
              </CardTitle>
              <CardDescription>
                {game.rotation.length === 0
                  ? 'The round list is not available.'
                  : `${formatNumber(game.rotation.length)} ${game.rotation.length === 1 ? 'round' : 'rounds'} in rotation`}
              </CardDescription>
            </CardHeader>
            {game.rotation.length === 0 ? (
              <CardContent>
                <p className="text-base text-muted-foreground">
                  No playlist information is available for this game.
                </p>
              </CardContent>
            ) : (
              <CardContent>
                <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {game.rotation.map((round, index) => {
                    const active = index === game.currentGame;
                    const image = mapImage(round.map);

                    return (
                      <li key={`${index}-${round.rule}-${round.map}`}>
                        <div
                          className={`overflow-hidden rounded-xl border ${
                            active
                              ? 'border-primary ring-1 ring-primary'
                              : 'border-border'
                          }`}
                        >
                          <div className="relative aspect-video overflow-hidden bg-muted/30">
                            {image === null ? (
                              <div className="flex size-full items-center justify-center">
                                <MapIcon
                                  className="size-8 text-muted-foreground/50"
                                  aria-hidden="true"
                                />
                              </div>
                            ) : (
                              <img
                                src={image}
                                alt={mapName(round.map)}
                                loading="lazy"
                                className="size-full object-cover"
                              />
                            )}
                            <div className="absolute left-3 top-3 flex items-center gap-2">
                              <Badge variant="secondary">Round {index + 1}</Badge>
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="font-bold text-foreground">{mapName(round.map)}</p>
                            <p className="mt-1 text-base text-muted-foreground">
                              {ruleName(round.rule)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
