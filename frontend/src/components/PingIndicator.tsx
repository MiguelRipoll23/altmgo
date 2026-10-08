import { cn } from '../lib/utils';

/** A host- or player-reported ping, shown as a quick quality gauge. */
export function PingIndicator({
  ping,
  className,
}: {
  ping: number;
  className?: string;
}) {
  const good = ping <= 100;
  const quality = good ? 'Good' : 'Bad';
  const colour = good ? 'bg-green-500' : 'bg-red-500';
  const lit = ping <= 50 ? 3 : good ? 2 : 1;

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
            className={cn('h-3 w-1.5 rounded-sm', index < lit ? colour : 'bg-muted')}
          />
        ))}
      </span>
    </span>
  );
}
