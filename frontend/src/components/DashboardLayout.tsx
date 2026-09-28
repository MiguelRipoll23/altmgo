import {
  Flag,
  Gamepad2,
  LayoutDashboard,
  Mail,
  Medal,
  Newspaper,
  Shield,
  Swords,
  Trophy,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { StaffRole } from '../session';
import { DashboardShell } from './DashboardShell';
import type { SidebarSection } from './SidebarNav';

/**
 * The sections of the player dashboard, in the order they are offered.
 *
 * There is no role on any of them, and that is the definition of the frame: every
 * section here is a read, and every one of them is a read any signed-in account
 * may make.
 *
 * The order is the shape of a session rather than the shape of the schema: who is
 * on, what the server has said to them, who they play with and where, what is
 * running, the two event ladders, and finally where they stand on the boards.
 * News and mail sit second and third because they are the two things addressed to
 * the reader personally — the client shows the news on the way in and the mail in
 * the inbox, and these are the same two lists without leaving the browser.
 *
 * Mail, Survival and rankings are the sections that are more than one page, so
 * they carry their sub-options. Each sub-option is a page with its own path rather
 * than a view of one page, so it can be linked to and reloaded on its own; the
 * section itself leads to the first of them.
 *
 * Nothing here writes. Everything that changes the server moved to the admin frame,
 * which is reached from the account card at the foot of this column: a signed-in
 * player has no use for it, so a section here implying there is more of the
 * dashboard than there is would be a link to nothing.
 */
const sections: SidebarSection[] = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
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
  roles,
  children,
}: {
  accountName: string;
  roles: StaffRole[];
  children: ReactNode;
}) {
  return (
    <DashboardShell
      sections={sections}
      accountName={accountName}
      roles={roles}
      frame={{ to: '/admin', label: 'Admin dashboard', icon: Shield }}
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
