import { Menu, PanelLeft, PanelLeftClose } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AccountMenu } from './AccountMenu';
import { SidebarNav, type SidebarSection } from './SidebarNav';
import { Button } from './ui/button';

/** The width the column is given on a window wide enough to hold one. */
const WideWindow = '(min-width: 1024px)';

/** Whether the window is wide enough that the column is part of the layout. */
function isWideWindow(): boolean {
  return window.matchMedia(WideWindow).matches;
}

/** How much of the navigation column is on screen. */
type ColumnState = 'open' | 'reduced' | 'hidden';

/**
 * A wide window has no "away" state.
 *
 * Put away is a drawer idea. A drawer is a thing laid over a page that covers it,
 * so taking it away gives the page back its whole width and the way back is a
 * button floating where the drawer used to be. On a wide window the column is
 * beside the page rather than over it, and taking it away there gives back about
 * ten characters — while costing the reader the whole column and leaving them with
 * a floating button and a page. That is a worse version of what the reduced
 * column already does properly, so on a wide window the column reduces and never
 * goes.
 *
 * So `hidden` is honoured only where it means something: a narrow window, where
 * the column is a drawer over the page and the page genuinely needs the width
 * back. A stored `hidden` on a wide window — however it got there, whether the
 * reader was last on a phone, whether a window was resized, whether something
 * asked for it and was refused — draws as reduced. The state can still be stored,
 * because the same state has to mean the right thing on both kinds of window, but
 * it cannot put a desktop into the one state the desktop does not have.
 *
 * This is also what a reader means by "it collapsed when I came back". Whether
 * the column was put away while they were looking elsewhere or was already like
 * that, what they want to come back to is a slimmed column they can click, not a
 * button they have to click first.
 */
function drawnColumn(stored: ColumnState, wide: boolean): ColumnState {
  return wide && stored === 'hidden' ? 'reduced' : stored;
}

/**
 * The frame both dashboards are drawn in: a column of sections and the page
 * beside them, with the column able to be reduced or put away.
 *
 * It is one component for both frames because the two shells were the same shell
 * twice over, and a responsive frame is exactly the sort of thing that goes wrong
 * in one copy and not the other: a padding that accounts for the column on a
 * desktop and not on a phone, a control that exists in one frame and not the
 * other. What differs between them — which sections are offered, the wordmark and
 * where the account card leads out to — is passed in, and everything else is
 * drawn here once.
 *
 * The column is hidden on a narrow window from the start rather than after a
 * first render, because a phone that opens on a 256-pixel column has no page
 * visible at all, and a dashboard whose first impression is a drawer is a
 * dashboard nobody has seen the dashboard of. It is open on a wide one, where the
 * column is part of the layout rather than something laid over it.
 *
 * A wide window draws two of the three states, not three. The reduced one is the
 * column narrowed to its icons and left on screen, and it is a real state rather
 * than a nicety: narrowing the column and removing it are different requests on a
 * desktop. Away is right for a phone, where the column is a drawer over the page
 * and the page needs the width back. On a wide window the column is beside the
 * page, and removing it buys the page about ten characters — not worth losing the
 * reader's place in the frame to get, when the reader who asked for more room
 * usually wants to see a wide table rather than to stop navigating. So the reduce
 * control keeps the icons on screen and working, and a wide window has no state
 * that takes the column off at all. See `drawnColumn`.
 *
 * Only the list of sections scrolls, not the column. A column that scrolls as one
 * piece takes the wordmark and the account card away with it, so a long list
 * leaves a reader who wants the way out unable to reach the way out, and a reader
 * who has been handed to another account has to scroll back up to do it. The three
 * parts are pinned instead: the wordmark, the list, and the account card at the
 * foot, which is the one control on every page of both frames.
 */
export function DashboardShell({
  sections,
  accountName,
  brand,
  children,
}: {
  sections: SidebarSection[];
  accountName: string | null;
  /** The wordmark at the head of the column. */
  brand: ReactNode;
  children: ReactNode;
}) {
  // A narrow window only ever has two states — the drawer out or away — because
  // a reduced column on a phone is a column of icons with nothing under them and
  // no page beside them, which is not a layout. The initial read is made once,
  // before the first render, so a phone never flashes an open drawer.
  const [column, setColumn] = useState<ColumnState>(isWideWindow() ? 'open' : 'hidden');
  const location = useLocation();
  const arrived = useRef(false);

  // What is actually drawn, which is the stored state narrowed to what this kind
  // of window can be. See `drawnColumn`.
  const drawn = drawnColumn(column, isWideWindow());

  /** Whether the column is on screen in any form. */
  const shown = drawn !== 'hidden';

  /**
   * Narrows the column, or opens it back out.
   *
   * On a narrow window this is the drawer, so the two states are out and away and
   * there is nothing between them. On a wide one it steps between the full column
   * and the icon rail.
   */
  function toggleColumn() {
    if (!isWideWindow()) {
      setColumn(column === 'hidden' ? 'open' : 'hidden');
      return;
    }

    setColumn(column === 'open' ? 'reduced' : 'open');
  }

  // Following a link on a phone has to put the column away again: the page it
  // opened is behind the column, and a reader who tapped a section on a narrow
  // window is looking at the column rather than the section.
  //
  // On a wide window nothing is put away. The column is part of the layout there
  // rather than a drawer laid over the page, so a section that closes it every
  // time it is followed turns a desktop dashboard into one that has to be opened
  // again after every click — and the reader who opened it by hand would watch it
  // close itself for having been used.
  //
  // The first arrival is not a change of page either, and treating it as one would
  // put the column away on every load, on a wide window above all.
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }

    if (!isWideWindow()) {
      setColumn('hidden');
    }
  }, [location.pathname, location.search]);

  // Escape closes the drawer, and only the drawer.
  //
  // It was honoured on a wide window as well, on the reasoning that a column left
  // open on a desktop is a column the reader asked to have and Escape is a way of
  // changing that. That reasoning was wrong about what Escape means: the listener
  // is on the window, so it fires for an Escape pressed anywhere on the page —
  // closing a menu that had already closed itself, dismissing something that was
  // not this, or arriving with a tab regaining focus after the reader pressed it
  // before looking away. None of those are a request to take the navigation away,
  // and there was no way back: the column went to `hidden` and stayed there for
  // the rest of the session, with the floating button left on the page because
  // that is the only way back to the column from that state.
  //
  // So it is now the drawer case only. A drawer laid over the page with no
  // keyboard way out of it is a drawer some people cannot use at all, and that is
  // a real problem. On a wide window the column is beside the page rather than
  // over it, it has a control of its own at its head, and pressing Escape should
  // mean whatever the thing that had focus meant by it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isWideWindow()) {
        setColumn('hidden');
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A window narrowed past the width the column is laid out for has to put it
  // away, or a column that was beside the page is suddenly on top of it.
  useEffect(() => {
    const query = window.matchMedia(WideWindow);
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        setColumn('hidden');
      }
    };

    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, []);

  /**
   * Whether the page has been scrolled off its first screenful.
   *
   * The button that brings the column back floats over the page, so the page has
   * to start clear of it — but only at the top. A gutter held open for the whole
   * length of a long page is a stripe of nothing down the left of every screen
   * the reader scrolls through, to protect a corner they scrolled past long ago;
   * and the button is the reader's own way out of the drawer, so once they have
   * moved into the page it is over the page on purpose. Re-read on every scroll
   * because the question is asked of the window, not of the page.
   */
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {shown ? (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setColumn('hidden')}
          aria-hidden="true"
        />
      ) : null}

      <aside
        id="frame-navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex max-w-[85vw] flex-col gap-6 border-r border-border bg-card/60 pb-6 pt-5 transition-transform duration-200 ease-out',
          // The gutter and the width both move between the states, so the column is
          // padded when it has labels and not when it has only icons. Reducing the
          // width alone would leave the icons floating in a wide empty box, which
          // reads as a column that failed to draw.
          drawn === 'open' ? 'w-72 px-5 lg:w-64 lg:max-w-none' : 'w-20 px-3 lg:max-w-none',
          shown ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* The control that reduces the column sits at its head in both of the
            states where there is a head, and it is the same button either way:
            what changes is which way the panel points. It is inside the column
            rather than over the page because it acts on the column — a control
            floating on top of the page beside a visible column is two controls
            for the same thing, and one of them is somewhere the reader has to
            look for. */}
        <div className="flex items-center justify-between gap-2">
          {drawn === 'reduced' ? null : brand}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleColumn()}
            className={cn(drawn === 'reduced' && 'mx-auto')}
            aria-label={drawn === 'reduced' ? 'Expand the navigation' : 'Collapse the navigation'}
            aria-expanded={shown}
            aria-controls="frame-navigation"
          >
            {drawn === 'reduced' ? <PanelLeft /> : <PanelLeftClose />}
          </Button>
        </div>

        <SidebarNav sections={sections} reduced={drawn === 'reduced'} />

        <AccountMenu accountName={accountName} reduced={drawn === 'reduced'} />
      </aside>

      {shown ? null : (
        // The affordance of the away state, which is the only one that exists on a
        // narrow window: the column has been translated off the screen and the
        // control at its head went with it, so this is the only way back. It is
        // drawn over the page because there is no column left to put it in.
        //
        // It cannot appear on a wide window at all — see `drawnColumn` — so a
        // reader on a desktop never meets a page with a lone button where the
        // navigation should be.
        <Button
          variant="outline"
          size="icon"
          onClick={() => toggleColumn()}
          className="fixed left-3 top-3 z-30"
          aria-label="Show the navigation"
          aria-expanded={shown}
          aria-controls="frame-navigation"
        >
          <Menu />
        </Button>
      )}

      {/* The page's own gutter follows the column, and moves with it rather than
          jumping when the column does. */}
      <main
        className={cn(
          'min-w-0 transition-[padding] duration-200 ease-out',
          drawn === 'open' ? 'lg:pl-64' : drawn === 'reduced' ? 'lg:pl-20' : 'lg:pl-0',
        )}
      >
        <div
          className={cn(
            'mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8',
            // The button that brings the column back is drawn over the top of the
            // page, so the page starts clear of it rather than under it — and
            // gives the room back as soon as the reader has scrolled, because
            // after that the button is over the page on purpose. The reduced
            // column needs none of it: it sits beside the page rather than over
            // it, and the button it carries is inside the column.
            shown || scrolled ? undefined : 'pt-16 lg:pt-8',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
