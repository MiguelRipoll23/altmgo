import { Globe } from 'lucide-react';
import { Badge } from './ui/badge';

/**
 * The address the reader's account publishes, as a badge on the overview.
 *
 * It is a read. The page used to offer the publish here too — a correction that
 * wrote the address for every character of the account — and it does not any more,
 * because the write belongs where the address is used rather than on the page that
 * reports it. The address is set when a host opens a game and the sign-in writes it
 * for the account; a button here that wrote it again would be a second place making
 * the same write, with nothing on the page saying which of the two had spoken last,
 * and the reader looking at the address is the one least able to tell.
 *
 * The connection row is written per character but the address is per account: every
 * character of an account listens on the same network, so a page that named one
 * character's address would be naming one of the same address's owners. The port is
 * not printed either. It is a client setting, the same figure on every host of a
 * deployment, so it would spend the badge on a number that says nothing.
 *
 * It is a badge, like the two counts beside it, and purple, which is the one colour
 * on the page used for nothing else: the counts are green and blue because green and
 * blue mean how busy the server is and how much it has done, and an address is a
 * thing about the reader, so it takes the colour that is not a claim about the
 * server. It is `verbatim` because the address is the reader's own data rather than
 * a label the dashboard chose — an uppercased address is the page rewriting the
 * thing it is reporting.
 */
export function PublishedAddress({ address }: { address: string | null }) {
  return (
    <Badge
      verbatim
      className="gap-1.5 border-purple-500/30 bg-purple-500/10 tracking-normal text-purple-300"
    >
      {/* The globe says what the digits beside it are before they are read: four
          groups of digits in a row look like any other four groups of digits, and a
          reader who does not already know that this is where their game is reachable
          has nothing to attach them to. */}
      <Globe className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{address ?? 'No address published'}</span>
    </Badge>
  );
}
