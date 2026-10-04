import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/**
 * The modal a page opens over itself.
 *
 * Radix's own, for the same reason the select is: the focus trap, the inert page
 * behind it and the ways out are behaviours that are easy to get almost right and
 * hard to get right by hand, and a dialog that leaks focus back onto the page
 * underneath is a dialog some readers cannot use at all.
 *
 * The content is the whole window on a narrow one and a centred card from `sm`
 * up. A dialog on a phone that floats in the middle of the screen leaves the page
 * showing around all four of its edges, which reads as a thing beside the page
 * rather than as what the reader is doing now; filling the window is what a
 * screen that small can afford and what a reader expects it to do. The same
 * dialog is the same component at both sizes — only the frame changes — so a
 * control added to it cannot exist on one kind of screen and not the other.
 */
function Dialog({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-black/70 backdrop-blur-sm', className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />

      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // The whole window on a narrow one. The border and rounding arrive with
          // the centred card at `sm`, where there is page visible around the frame
          // for them to separate it from.
          'fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-card p-6 shadow-2xl focus:outline-none',
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-border',
          className,
        )}
        {...props}
      >
        {children}

        {/* One way out that is not the frame's own edge. On a phone the whole
            window is the dialog, so there is no outside to press; and on a wide
            one the overlay behind it is a target a reader has to find. */}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />;
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        // Pinned to the foot of the frame, so the buttons of a full-window dialog
        // sit where the thumb already is rather than wherever the content ends.
        'mt-auto flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-extrabold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-base text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
