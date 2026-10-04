import { AlertCircle, CheckCircle2, Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Card } from './ui/card';

/** How a status banner reads: a success, a refusal, or something in progress. */
export type StatusKind = 'success' | 'error' | 'progress';

/** The icon each kind of status wears, and the words that go with it. */
const appearances: Record<StatusKind, { className: string; icon: LucideIcon }> = {
  success: {
    className: 'border-success/30 bg-success/10 text-success',
    icon: CheckCircle2,
  },
  error: {
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
    icon: AlertCircle,
  },
  progress: {
    className: 'border-border bg-muted text-muted-foreground',
    icon: Loader2,
  },
};

/**
 * One line telling the operator what just happened.
 *
 * The icon is not decoration: "the write went through" and "the write was
 * refused" are both a sentence in the same place on the page, and the shape
 * beside it is what tells them apart at a glance while the sentence is still
 * being read.
 */
export function StatusMessage({ kind, children }: { kind: StatusKind; children: ReactNode }) {
  const { className, icon: Icon } = appearances[kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-base font-medium',
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', kind === 'progress' && 'animate-spin')} />
      <span>{children}</span>
    </div>
  );
}

/**
 * A dismissible banner for a write that has just landed.
 *
 * It is a card rather than a `StatusMessage` because it is the outcome of
 * something the operator did rather than the state of a page: it names what
 * changed and then goes away when they have read it, instead of sitting above
 * the content for ever saying what it said five minutes ago.
 */
export function OutcomeNotice({
  tone,
  children,
}: {
  tone: 'success' | 'error';
  children: ReactNode;
}) {
  return (
    <Card className={cn('flex items-start gap-2.5 p-4 text-base font-medium', appearances[tone].className)}>
      {children}
    </Card>
  );
}
