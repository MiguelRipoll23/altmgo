import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/**
 * A multi-line field, for the text that does not fit on one line.
 *
 * `text-base` for the Safari reason the `Input` spells out: iOS zooms
 * a focused control under 16px and does not zoom it back. A textarea is the
 * worst case of the three, because typing in it is the longest a reader is ever
 * looking at the zoomed page.
 */
function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
