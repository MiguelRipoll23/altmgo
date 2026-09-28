/** How a status banner reads: a success, a refusal, or something in progress. */
export type StatusKind = 'success' | 'error' | 'progress';

const classNames: Record<StatusKind, string> = {
  success: 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300',
  error: 'rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300',
  progress: 'rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-300',
};

/** One line telling the player what just happened. */
export function StatusMessage({ kind, children }: { kind: StatusKind; children: string }) {
  return <p className={classNames[kind]}>{children}</p>;
}
