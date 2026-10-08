import { ArrowLeft, Gamepad2, LockKeyhole, Map as MapIcon, UserRound, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingBlock, SectionHeading, formatNumber } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import type { Game } from '../components/GameCard';
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
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 sm:p-7">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-widest text-white/75">
                    {mapName(currentRound?.map ?? game.map)}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {ruleName(currentRound?.rule ?? game.rule)}
                  </h2>
                </div>
                {game.hasPassword ? (
                  <Badge variant="warning" className="bg-black/40">
                    <LockKeyhole className="size-4" aria-hidden="true" />
                    Password protected
                  </Badge>
                ) : (
                  <Badge variant="success" className="bg-black/40">
                    Open to join
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="grid gap-5 pt-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,1fr)] sm:items-center sm:pt-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Hosted by
                </p>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {game.hostName ?? 'Unknown host'}
                </p>
                {game.comment.trim() === '' ? null : (
                  <p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">
                    {game.comment}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold text-foreground">
                    <Users className="size-4 text-primary" aria-hidden="true" />
                    Players
                  </span>
                  <span className="font-bold tabular-nums text-foreground">
                    {formatNumber(game.players)}{' '}
                    <span className="font-medium text-muted-foreground">
                      / {formatNumber(game.maximumPlayers)}
                    </span>
                  </span>
                </div>
                <div
                  role="meter"
                  aria-label="Players in game"
                  aria-valuemin={0}
                  aria-valuemax={game.maximumPlayers}
                  aria-valuenow={Math.min(game.players, game.maximumPlayers)}
                  aria-valuetext={`${game.players} of ${game.maximumPlayers} players`}
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{
                      width: `${game.maximumPlayers > 0
                        ? (Math.min(game.players, game.maximumPlayers) / game.maximumPlayers) * 100
                        : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {game.maximumPlayers - game.players > 0
                    ? `${formatNumber(game.maximumPlayers - game.players)} spots open`
                    : 'Game is full'}
                </p>
              </div>
            </CardContent>
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
                              {active ? <Badge variant="success">Now playing</Badge> : null}
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
            {game.roster.length === 0 ? null : (
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {game.roster.map((player) => {
                    const isHost = player.characterId === game.hostIdentifier;

                    return (
                      <li
                        key={player.characterId}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/50 p-3"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                          {player.name}
                        </span>
                        {isHost ? <Badge variant="secondary">Host</Badge> : null}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
