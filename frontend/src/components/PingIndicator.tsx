import { cn } from '../lib/utils';

/** A host- or player-reported ping, shown as a quick quality gauge. */
export function PingIndicator({
  ping,
  className,
}: {
  ping: number;
  className?: string;
}) {
  const quality = ping <= 50 ? 'Excellent' : ping <= 100 ? 'Good' : ping <= 200 ? 'Fair' : 'Poor';
  const colour =
    ping <= 50 ? 'bg-emerald-500' : ping <= 100 ? 'bg-amber-500' : 'bg-red-500';
  const lit = ping <= 50 ? 1 : ping <= 100 ? 2 : ping <= 200 ? 3 : 4;

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        role="img"
        aria-label={`${quality} ping`}
        title={`${quality} ping`}
        className="flex shrink-0 items-end gap-0.5"
      >
        {BarHeights.map((height, index) => (
          <span
            key={height}
            className={cn('w-1 rounded-sm', height, index < lit ? colour : 'bg-muted')}
          />
        ))}
      </span>
    </span>
  );
}

const BarHeights = ['h-2', 'h-3', 'h-4', 'h-5'];
