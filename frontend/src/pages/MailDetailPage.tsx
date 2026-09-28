import { ArrowLeft, Mail } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';

/** One message, as an inbox or a sent list shows it. */
type MailMessage = {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  recipientName?: string;
  sentAt: string;
  /** Whether the recipient has opened it. Carried by the inbox read only. */
  isRead?: boolean;
  /** Whether the account received it rather than sent it. The inbox read only. */
  received?: boolean;
};

/** Which read answers for the message: the player's inbox or the manager's outbox. */
export type MailScope = 'inbox' | 'outbox';

/**
 * One message, on its own page.
 *
 * The same page answers for both sides of a letter: the inbox a player reads and
 * the outbox a manager sent it from. They are the same words about the same
 * message and they are reached from two different lists in two different frames,
 * so they are one component with a scope rather than two pages that would drift.
 *
 * It is a page rather than an expansion under the list for the reason the news
 * detail page is: a link to a letter is a thing people paste to each other, and a
 * pasted link has to open the letter and not a list it once sat in.
 *
 * The mailbox a message was opened from is part of the address rather than a
 * piece of state, so the back link returns to the list the reader was actually
 * reading — a letter found in the outbox goes back to the outbox rather than to
 * whichever mailbox happens to be first — and so a shared link names the list the
 * sender was reading rather than leaving the reader to guess.
 */
export function MailDetailPage({
  scope,
  back,
  label,
}: {
  scope: MailScope;
  /** Where the back link returns to: the list this message was opened from. */
  back: string;
  /** The words on the back link, which differ between a mailbox and a sent list. */
  label: string;
}) {
  const { identifier } = useParams();
  const path = scope === 'outbox' ? `/api/manager/mail/${identifier}` : `/api/mail/${identifier}`;
  const { data, error, loading } = useApiResource<{ mail: MailMessage }>(path);

  const message = data?.mail ?? null;

  return (
    <div className="space-y-6">
      <SectionHeading title="Mail" subtitle="One message, in full." />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      <Link
        to={back}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        {label}
      </Link>

      {message === null ? (
        loading ? (
          <p className="text-sm text-muted-foreground">Reading the message…</p>
        ) : error === null ? (
          <p className="text-sm text-muted-foreground">That message could not be read.</p>
        ) : null
      ) : (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <h2 className="text-xl font-extrabold tracking-tight text-foreground">
              {message.subject}
            </h2>
          </div>

          <p className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">
            From {message.senderName}
            {message.recipientName === undefined ? null : ` · To ${message.recipientName}`} · Sent{' '}
            {formatDate(message.sentAt)}
          </p>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {message.body}
          </p>
        </Panel>
      )}
    </div>
  );
}
