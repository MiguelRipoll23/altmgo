import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/**
 * The card a panel of the dashboard sits in.
 *
 * The dashboard's existing `Panel` becomes this: a titled section is the same
 * shape as an untitled one, and the only difference is whether a heading is
 * rendered above the content. Keeping them as one component is what stops the
 * two drifting apart into two slightly different borders.
 */
function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-lg backdrop-blur',
        className,
      )}
      {...props}
    />
  );
}

/** The heading band at the top of a card. */
function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

/** The title of a card. */
function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-xs font-semibold uppercase tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}

/** The sentence under a card's title. */
function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

/** The body of a card. */
function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

/** The action band at the foot of a card. */
function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-3 p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
