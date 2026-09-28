import { Mailbox } from '../components/Mailbox';

/**
 * Everything to and from the caller's characters, in one list.
 *
 * It is a page of its own because "what has this account said and been said to
 * it" is a question the two other mailboxes each answer only half of, and it is
 * one row per message rather than one per direction: a message this account both
 * sent and received appears once, with the names on both sides of it.
 */
export function MailAllPage() {
  return <Mailbox mailbox="all" />;
}
