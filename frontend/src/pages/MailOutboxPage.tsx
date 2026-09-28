import { Mailbox } from '../components/Mailbox';

/**
 * What the caller's own characters have sent.
 *
 * It is a page of its own rather than a tab inside one mail page, so that it can be
 * linked to and reloaded on its own. A message listed here is one row shared with
 * the inbox, and the read flag on it belongs to the person who received it, which
 * is why nothing here is marked as read or unread.
 */
export function MailOutboxPage() {
  return <Mailbox mailbox="outbox" />;
}
