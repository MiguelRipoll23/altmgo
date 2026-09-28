import { Mailbox } from '../components/Mailbox';

/**
 * What has been sent to the caller's characters.
 *
 * It is a page of its own rather than a tab inside one mail page, so that it can
 * be linked to and reloaded on its own — the same reason the outbox and the whole
 * of a character's mail are pages rather than a state somebody arrived in and left.
 */
export function MailInboxPage() {
  return <Mailbox mailbox="inbox" />;
}
