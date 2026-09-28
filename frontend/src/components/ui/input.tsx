import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/**
 * A single-line field.
 *
 * The invalid state is a ring rather than a border colour, so a field that
 * cannot be read as invalid is still readable as a field: the ring sits outside
 * the border and the text inside it is unchanged.
 *
 * 16px, and not one pixel less, is the floor for text anywhere in the dashboard.
 * For a field it began as a Safari requirement — iOS zooms any control it
 * focuses that computes to under 16px, and does not zoom it back — and it is
 * kept everywhere else because a floor the fields have and the labels do not is
 * a floor that gets re-litigated at the next small screen.
 */
function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-background/60 px-3 py-1 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:ring-2 aria-invalid:ring-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
