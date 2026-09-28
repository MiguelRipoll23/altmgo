import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute, AdminStaffSection } from './components/AdminRoute';
import { DashboardRoute, OverviewSection } from './components/DashboardRoute';
import { ClansPage } from './pages/ClansPage';
import { ClanDetailPage } from './pages/ClanDetailPage';
import { GamesPage } from './pages/GamesPage';
import { HomePage } from './pages/HomePage';
import { CharacterDetailPage } from './pages/CharacterDetailPage';
import { MailAllPage } from './pages/MailAllPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { MailInboxPage } from './pages/MailInboxPage';
import { MailOutboxPage } from './pages/MailOutboxPage';
import { MyCharactersPage } from './pages/MyCharactersPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RankingsClansPage } from './pages/RankingsClansPage';
import { RankingsPlayersPage } from './pages/RankingsPlayersPage';
import { RegisterPage } from './pages/RegisterPage';
import { SignInPage } from './pages/SignInPage';
import { SurvivalEventsPage } from './pages/SurvivalEventsPage';
import { SurvivalEventPage } from './pages/SurvivalEventPage';
import { SurvivalTeamsPage } from './pages/SurvivalTeamsPage';
import { TournamentEventPage } from './pages/TournamentEventPage';
import { TournamentPage } from './pages/TournamentPage';
import { AccountsPage } from './pages/admin/AccountsPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminCharacterDetailPage } from './pages/admin/CharacterDetailPage';
import { CharactersPage } from './pages/admin/CharactersPage';
import { DiscordPage } from './pages/admin/DiscordPage';
import { EventOperationsPage } from './pages/admin/EventOperationsPage';
import { AdminMailPage } from './pages/admin/MailPage';
import { AdminNewsPage } from './pages/admin/NewsPage';

/**
 * Every page of the site, and the two frames the signed-in pages share.
 *
 * The dashboard and the admin dashboard are separate route trees rather than two
 * sets of tabs in one page, so each can be linked to, reloaded and put in a second
 * window — which is how an operator actually uses one: the list they care about open
 * beside the control they are adjusting. They are separate rather than one tree
 * with a switch in the sidebar because they answer different questions. The
 * dashboard is a set of reads any signed-in account may make; the admin frame is the
 * work of running the server. An account moves between them from the card at the
 * foot of the sidebar, which is the one control present on every page of both.
 *
 * Each layout reads the token and the roles itself rather than taking them as props,
 * because every route needs them and passing them through each one would be four
 * arguments that are always the same. A signed-out browser reaching either is sent
 * to sign in, and remembers where it was going.
 *
 * The read sections are written out under both frames rather than shared as one
 * fragment of `<Route>` elements. The components are the same either way — an
 * operator reading a clan roster wants it in the frame they are working in, and a
 * second copy of a read-only page would be a second thing to keep correct — but a
 * shared fragment would give the two copies the same generated route id, and the id
 * is the key the router resolves relative paths by. Five lines repeated is cheaper
 * than an id that collides.
 *
 * A section the sidebar splits into sub-options is a set of routes rather than one
 * route with a view chosen inside it: survival's events and teams, rankings'
 * players and clans, and the three mailboxes are each their own page with its own
 * path, so each can be linked to, reloaded and opened in a second window on its
 * own, and the sidebar's sub-option is the same address the page is at. The bare
 * section path redirects to its first sub-option rather than being a page of its
 * own, so there is no address that shows the section without showing something in
 * it.
 *
 * A detail page under a set of sub-options keeps the sub-option in its own
 * segment, so a mailbox is named by the path — `/mail/outbox/41` rather than
 * `/mail/41?box=outbox`. A page reached from two of its own lists then has one
 * address per list rather than one address and a parameter that says which list
 * was meant, and no id ever shares a route with the name of a list it is not in.
 *
 * A record reached from a list of records is a page under the list, rather than a
 * panel that opened underneath it: a clan used to expand at the foot of the
 * directory, which grew the page every time one was opened and gave the record no
 * address of its own to be sent to anybody.
 *
 * The same holds for the sections of a record rather than a list of them: one
 * tournament event is read in three places — its registrations, its bracket and
 * its fixtures — and each is a segment under the event rather than a switch
 * inside the event's page. The bare event path is the registrations, so the
 * address a card has always led to is still an address and not a redirect.
 *
 * The player's own characters are pages in the player tree, and the staff search
 * over every account is the admin frame's: they were the same address once, and
 * the frame whose route registered first was the frame that answered. The staff
 * reads are under `/api/admin` for that reason, while the reads both frames make
 * of the same rows — news, clans, games, the events, the boards — stay shared,
 * because a second copy of a read any player may make is a second thing to keep
 * correct.
 *
 * The staff sections exist once, in the admin tree: Discord, accounts and
 * announcements speak for the server and need a manager, and the event operations
 * run the events and need a moderator. The check in the route decides what the
 * browser draws; the API decides what it is allowed to do.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signin" element={<SignInPage />} />

        <Route path="/dashboard" element={<DashboardRoute />}>
          <Route index element={<OverviewSection />} />
          <Route path="characters" element={<MyCharactersPage />} />
          <Route path="characters/:identifier" element={<CharacterDetailPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route
            path="news/:identifier"
            element={<NewsDetailPage scope="player" listPath="/dashboard/news" />}
          />
          <Route path="mail" element={<Navigate to="mail/inbox" replace />} />
          <Route path="mail/inbox" element={<MailInboxPage />} />
          <Route path="mail/outbox" element={<MailOutboxPage />} />
          <Route path="mail/all" element={<MailAllPage />} />
          <Route
            path="mail/inbox/:identifier"
            element={<MailDetailPage scope="inbox" back="/dashboard/mail/inbox" label="Inbox" />}
          />
          <Route
            path="mail/outbox/:identifier"
            element={<MailDetailPage scope="inbox" back="/dashboard/mail/outbox" label="Outbox" />}
          />
          <Route
            path="mail/all/:identifier"
            element={<MailDetailPage scope="inbox" back="/dashboard/mail/all" label="All mail" />}
          />
          <Route path="clans" element={<ClansPage />} />
          <Route path="clans/:identifier" element={<ClanDetailPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="survival" element={<Navigate to="survival/events" replace />} />
          <Route path="survival/events" element={<SurvivalEventsPage />} />
          <Route path="survival/events/:identifier" element={<SurvivalEventPage />} />
          <Route path="survival/teams" element={<SurvivalTeamsPage />} />
          <Route path="tournament" element={<TournamentPage />} />
          <Route
            path="tournament/:identifier"
            element={<TournamentEventPage area="registrations" />}
          />
          <Route
            path="tournament/:identifier/bracket"
            element={<TournamentEventPage area="bracket" />}
          />
          <Route
            path="tournament/:identifier/fixtures"
            element={<TournamentEventPage area="fixtures" />}
          />
          <Route path="rankings" element={<Navigate to="rankings/players" replace />} />
          <Route path="rankings/players" element={<RankingsPlayersPage />} />
          <Route path="rankings/clans" element={<RankingsClansPage />} />
        </Route>

        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="news" element={<AdminNewsPage />} />
          <Route
            path="news/:identifier"
            element={<NewsDetailPage scope="manager" listPath="/admin/news" />}
          />
          <Route path="mail" element={<Navigate to="mail/inbox" replace />} />
          <Route path="mail/inbox" element={<AdminMailPage box="inbox" />} />
          <Route path="mail/outbox" element={<AdminMailPage box="outbox" />} />
          <Route
            path="mail/:identifier"
            element={
              <AdminStaffSection
                role="manager"
                page={<MailDetailPage scope="outbox" back="/admin/mail/inbox" label="Player mail" />}
              />
            }
          />
          <Route path="clans" element={<ClansPage basePath="/admin" />} />
          <Route path="clans/:identifier" element={<ClanDetailPage basePath="/admin" />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="survival" element={<Navigate to="survival/events" replace />} />
          <Route path="survival/events" element={<SurvivalEventsPage basePath="/admin" />} />
          <Route
            path="survival/events/:identifier"
            element={<SurvivalEventPage basePath="/admin" />}
          />
          <Route path="survival/teams" element={<SurvivalTeamsPage />} />
          <Route path="tournament" element={<TournamentPage basePath="/admin" />} />
          <Route
            path="tournament/:identifier"
            element={<TournamentEventPage basePath="/admin" area="registrations" />}
          />
          <Route
            path="tournament/:identifier/bracket"
            element={<TournamentEventPage basePath="/admin" area="bracket" />}
          />
          <Route
            path="tournament/:identifier/fixtures"
            element={<TournamentEventPage basePath="/admin" area="fixtures" />}
          />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="characters/:identifier" element={<AdminCharacterDetailPage />} />
          <Route
            path="discord"
            element={<AdminStaffSection role="manager" page={<DiscordPage />} />}
          />
          <Route
            path="event-operations"
            element={<AdminStaffSection role="moderator" page={<EventOperationsPage />} />}
          />
          <Route
            path="accounts"
            element={<AdminStaffSection role="manager" page={<AccountsPage />} />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
