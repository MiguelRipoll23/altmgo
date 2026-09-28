/**
 * The class strings every page is built from. They are lifted from the home page
 * the game server serves, so the two look like one site rather than two that
 * happen to share a colour.
 */

/** The card a form or a panel sits in. */
export const panelClassName =
  'rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur sm:p-8';

/** A field label above its input. */
export const labelClassName = 'block text-sm font-medium text-slate-300';

/** A text or password input. */
export const inputClassName =
  'mt-2 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition focus:border-mgo-500 focus:ring-2 focus:ring-mgo-500/30';

/** The small note under a field. */
export const hintClassName = 'mt-1.5 text-xs text-slate-500';

/** The one action on a form. */
export const primaryButtonClassName =
  'cursor-pointer rounded-lg bg-mgo-500 px-4 py-3 text-sm font-bold uppercase tracking-widest text-slate-950 transition hover:bg-mgo-400 focus:outline-none focus:ring-2 focus:ring-mgo-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60';

/** The action that is not the point of the page, and a link that looks like it. */
export const secondaryButtonClassName =
  'cursor-pointer rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-bold uppercase tracking-widest text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-mgo-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60';

/** Both primary actions, which are stacked and so are full width. */
export const blockButtonClassName = 'block w-full text-center';
