import {
  Flag,
  Gamepad2,
  LayoutDashboard,
  Mail,
  Medal,
  Newspaper,
  Swords,
  Trophy,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { DashboardShell } from './DashboardShell';
import type { SidebarSection } from './SidebarNav';

/**
 * The sections of the player dashboard, in the order they are offered.
 *
 * There is no role on any of them, and that is the definition of the frame: every
 * section here is a read, and every one of them is a read any signed-in account
 * may make. Nothing below is hidden from anybody.
 *
 * The order is the shape of a session rather than the shape of the schema: who is
 * on, who the reader is playing as, what the server has said to them, who they
 * play with and where, what is running, the two event ladders, and finally where
 * they stand on the boards. Characters sit second because they are what the
 * overview's published address belongs to — the page above names a figure without
 * saying whose it is — and News and mail follow as the two things addressed to the
 * reader personally: the client shows the news on the way in and the mail in the
 * inbox, and these are the same two lists without leaving the browser.
 *
 * Mail, Survival and rankings are the sections that are more than one page, so
 * they carry their sub-options. Their rows are headings with a disclosure rather
 * than links, because the bare section path is not a page — it is a redirect to
 * the first sub-option, and a row that goes there and bounces teaches a reader
 * that the column is not where they think it is.
 *
 * Nothing here writes. Every section is a read of what the server already holds,
 * because a read that is correct the moment it is made cannot disagree with the
 * client about the same figure, and a write made here would be a second source
 * of truth for something the game is already the source of.
 */
const sections: SidebarSection[] = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/dashboard/characters', label: 'Characters', icon: UserRound },
  { path: '/dashboard/news', label: 'News', icon: Newspaper },
  {
    path: '/dashboard/mail',
    label: 'Mail',
    icon: Mail,
    children: [
      { path: '/dashboard/mail/inbox', label: 'Inbox' },
      { path: '/dashboard/mail/outbox', label: 'Outbox' },
      { path: '/dashboard/mail/all', label: 'All' },
    ],
  },
  { path: '/dashboard/clans', label: 'Clans', icon: Flag },
  { path: '/dashboard/games', label: 'Games', icon: Gamepad2 },
  {
    path: '/dashboard/survival',
    label: 'Survival',
    icon: Swords,
    children: [
      { path: '/dashboard/survival/events', label: 'Events' },
      { path: '/dashboard/survival/teams', label: 'Teams' },
    ],
  },
  { path: '/dashboard/tournament', label: 'Tournament', icon: Trophy },
  {
    path: '/dashboard/rankings',
    label: 'Rankings',
    icon: Medal,
    children: [
      { path: '/dashboard/rankings/players', label: 'Players' },
      { path: '/dashboard/rankings/clans', label: 'Clans' },
    ],
  },
];

/** The player dashboard: the sections down the left, the page beside them. */
export function DashboardLayout({
  accountName,
  children,
}: {
  accountName: string | null;
  children: ReactNode;
}) {
  return (
    <DashboardShell
      sections={sections}
      accountName={accountName}
      brand={
        <p className="text-lg font-extrabold tracking-tight">
          <span className="text-primary">Alt</span>MGO
        </p>
      }
    >
      {children}
    </DashboardShell>
  );
}
