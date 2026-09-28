import * as LabelPrimitive from '@radix-ui/react-label';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/**
 * The word above a field.
 *
 * Radix's label is used rather than a bare `<label>` because it renders the
 * `for` attribute against the control it is given, so a field that is moved or
 * reordered keeps the pairing without the two ids having to be written twice.
 */
function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-sm font-medium leading-none text-foreground/80 peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
