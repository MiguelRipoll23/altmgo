import type { ReactNode } from 'react';

/**
 * How wide the content column is. Forms are narrow, lists are not, and a page
 * whose whole content is a pair of stacked buttons is narrower still — a card
 * that wide for two buttons reads as a page that lost its content.
 */
export type PageLayoutWidth = 'narrow' | 'form' | 'wide';

const widths: Record<PageLayoutWidth, string> = {
  narrow: 'max-w-sm',
  form: 'max-w-md',
  wide: 'max-w-3xl',
};

/**
 * The page itself: the dark background, the two soft glows, and the centred
 * column.
 *
 * The background is carried by the body now that the stylesheet owns it, so the
 * glows are the only thing this has to draw: they are decoration that has no
 * token behind it, and a token would be a colour named after a decoration.
 */
export function PageLayout({
  children,
  width = 'form',
}: {
  children: ReactNode;
  width?: PageLayoutWidth;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(30,64,175,0.18),transparent_60%)] text-foreground antialiased">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className={`w-full ${widths[width]}`}>{children}</div>
      </main>
    </div>
  );
}

/** The wordmark and the sentence under it. */
export function PageHeading({ subtitle }: { subtitle: ReactNode }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Welcome to <span className="text-primary">Alt</span>MGO
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
