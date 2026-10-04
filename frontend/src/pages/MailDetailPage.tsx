import { ArrowLeft, Mail } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { LoadingBlock, Panel, SectionHeading, formatDate } from '../components/DataDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useApiResource } from '../components/useApiResource';

/** One message, as an inbox or a sent list shows it. */
type MailMessage = {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  /** The character that wrote it, on a letter from the game masters' mailbox. */
  senderCharacterName?: string | null;
  recipientName?: string;
  sentAt: string;
  /** Whether the recipient has opened it. Carried by the inbox read only. */
  isRead?: boolean;
  /** Whether the account received it rather than sent it. The inbox read only. */
  received?: boolean;
};

/**
 * One message, on its own page.
 *
 * The inbox and the outbox are two lists of the same messages, so this is one
 * page reached from either. The only thing that differs between them is where the
 * back link goes, and that is the reader's choice rather than the page's, so it
 * travels in the address.
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
 *
 * The letter is drawn in its card whether or not it has arrived, so the page is the
 * same page while it is being read, and the back link sits above the heading for the
 * same reason the news detail page puts it there: a page reached from a list is read
 * in that order.
 */
export function MailDetailPage({ back, label }: {
  /** Where the back link returns to: the list this message was opened from. */
  back: string;
  /** The words on the back link, which differ between a mailbox and a sent list. */
  label: string;
}) {
  const { identifier } = useParams();
  const { data, error, loading } = useApiResource<{ mail: MailMessage }>(`/api/mail/${identifier}`);

  const message = data?.mail ?? null;

  return (
    <div className="space-y-6">
      <Link
        to={back}
        className="inline-flex items-center gap-2 text-base font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        {label}
      </Link>

      <SectionHeading title={message?.subject ?? 'Mail'} />

      {error === null ? null : <StatusMessage kind="error">{error}</StatusMessage>}

      {/* The letter is drawn in a card whether or not it has arrived, so the page is
          the same page while it is being read: the reading sits inside the card the
          message will be drawn in rather than replacing the card with a sentence
          somewhere else on the page. */}
      <Panel>
        {message === null ? (
          loading ? (
            <LoadingBlock />
          ) : error === null ? (
            <p className="text-base text-muted-foreground">That message could not be read.</p>
          ) : null
        ) : (
          <>
            {/* Who it is from and who it is to are two answers to two questions, so
                they are two lines rather than one sentence separated by middots. The
                reader checking a letter is usually checking one of the two, and the
                one they are looking for is at the head of its own line instead of
                somewhere in the middle of a sentence. The body then reads as the
                letter, with the date on its own at the foot: when it was sent is
                true of the letter and not of the writer, and it belongs below the
                words rather than in the header above them. */}
            <div className="mb-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-base uppercase tracking-widest text-muted-foreground">
                  {/*
                    A letter in the game masters' mailbox carries the name of the
                    character that wrote it as well as the signature the writer chose,
                    and the character is the one a manager is answering: two players
                    may have signed themselves the same name.
                  */}
                  From {message.senderCharacterName ?? message.senderName}
                </p>
              </div>

              {message.recipientName === undefined ? null : (
                <p className="pl-6 text-base uppercase tracking-widest text-muted-foreground">
                  To {message.recipientName}
                </p>
              )}
            </div>

            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
              {message.body}
            </p>

            {/* The bottom left, with the date and the time together. A letter is
                stamped when it was written, and the hour is part of that: two
                letters exchanged the same day are told apart by it. */}
            <div className="mt-5">
              <time dateTime={message.sentAt} className="text-base text-muted-foreground">
                {formatDate(message.sentAt)}
              </time>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
