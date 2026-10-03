import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/**
 * A short label worn by a row: a state a team is in, a role an account holds, a
 * room that is password protected.
 *
 * A badge is a fact about a row rather than an action, so it carries no border
 * of its own beyond the tint that separates it from the row behind it.
 *
 * It is uppercased because almost everything a badge says here is a state the
 * dashboard chose the word for — `password`, `important`, `closed`, `replays
 * only` — and those read as labels rather than as text somebody typed. The one
 * thing that is not is a name: a clan names itself, and uppercasing a name
 * rewrites it into something its owner did not write and cannot get back by
 * looking. `verbatim` turns the transformation off for those, rather than the
 * badge losing it and every label going back to sentence case.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-base font-semibold tracking-wider',
  {
    variants: {
      variant: {
        default: 'border-primary/30 bg-primary/10 text-primary',
        secondary: 'border-border bg-muted text-muted-foreground',
        outline: 'border-border text-foreground/80',
        success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  verbatim = false,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants> & {
  /**
   * Whether the badge shows its text as given rather than uppercasing it. For
   * names, which are the reader's own text and not a state the dashboard named.
   */
  verbatim?: boolean;
}) {
  return (
    <span
      className={cn(badgeVariants({ variant }), verbatim ? 'normal-case' : 'uppercase', className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
