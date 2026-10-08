import type { ReactNode } from 'react';

/**
 * How wide the content column is. Forms are narrow, lists are not, and a page
 * whose whole content is a pair of stacked buttons is narrower still — a card
 * that wide for two buttons reads as a page that lost its content.
 */
export type PageLayoutWidth = 'narrow' | 'form' | 'wide' | 'landing';

const widths: Record<PageLayoutWidth, string> = {
  narrow: 'max-w-sm',
  form: 'max-w-md',
  wide: 'max-w-3xl',
  landing: 'max-w-5xl',
};

/**
 * The page itself: the background, the two soft glows, and the centred column.
 *
 * The background is carried by the body now that the stylesheet owns it, so the
 * glows are the only thing this has to draw: they are decoration that has no
 * token behind it, and a token would be a colour named after a decoration.
 * `page-glow` draws them from the palette's own glow colours rather than from a
 * gradient written into this class name, so they follow the system theme too.
 *
 * The column is centred in the window rather than hung from the top, which is the
 * whole of what a sign-in page is: a short form and nothing else to read, so it
 * sits in the middle of the screen the way every other sign-in page does instead
 * of leaving a column of empty space beneath it. The padding around it is the one
 * place the breathing room is explicit, and it grows with the window for the same
 * reason the column does.
 */
export function PageLayout({
  children,
  width = 'form',
}: {
  children: ReactNode;
  width?: PageLayoutWidth;
}) {
  return (
    <div className="page-glow flex min-h-screen flex-col text-foreground antialiased">
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className={`w-full ${widths[width]}`}>{children}</div>
      </main>
    </div>
  );
}

/**
 * The wordmark and the sentence under it.
 *
 * The gap under the heading is the only one drawn here; the gap above it belongs
 * to the layout. A heading that also carries a margin of its own pushes the pair
 * away from the card by a number nobody chose, which is the kind of thing that
 * reads as the page being slightly wrong rather than as a margin.
 */
export function PageHeading({ subtitle }: { subtitle: ReactNode }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Welcome to <span className="text-primary">Alt</span>MGO
      </h1>
      <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>
    </div>
  );
}
