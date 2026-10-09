import { cn } from '../lib/utils';

/** A host- or player-reported ping, shown as a quick quality gauge. */
export function PingIndicator({
  ping,
  className,
}: {
  ping: number;
  className?: string;
}) {
  // The gauge reads red then green: the leftmost bars are the ones the connection
  // is losing and the green ones are what is left, so the worst reading is three
  // red and a perfect one is three green. A hundred milliseconds — the edge of
  // playable — is one red and two green, the example the ordering is written to
  // produce. A bar past its threshold is red rather than unlit, because an unlit
  // bar reads as "no signal at all" while every bar is a real part of the
  // connection rather than a level it failed to reach.
  const green = ping <= 50 ? 3 : ping <= 100 ? 2 : ping <= 200 ? 1 : 0;
  const red = 3 - green;
  const quality =
    green === 3 ? 'Excellent' : green === 2 ? 'Good' : green === 1 ? 'Fair' : 'Poor';

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        role="img"
        aria-label={`${quality} ping`}
        title={`${quality} ping`}
        className="flex shrink-0 items-end gap-0.5"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <span
            key={index}
            className={cn('h-4 w-1.5 rounded-sm', index < red ? 'bg-red-500' : 'bg-green-500')}
          />
        ))}
      </span>
    </span>
  );
}
