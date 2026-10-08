import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardRoute, OverviewSection } from './components/DashboardRoute';
import { ClansPage } from './pages/ClansPage';
import { ClanDetailPage } from './pages/ClanDetailPage';
import { GamesPage } from './pages/GamesPage';
import { OverviewPage } from './pages/OverviewPage';
import { HomePage } from './pages/HomePage';
import { CharacterDetailPage } from './pages/CharacterDetailPage';
import { MailDetailPage } from './pages/MailDetailPage';
import { MailInboxPage } from './pages/MailInboxPage';
import { MailOutboxPage } from './pages/MailOutboxPage';
import { MyCharactersPage } from './pages/MyCharactersPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RankingsClansPage } from './pages/RankingsClansPage';
import { RankingsPlayersPage } from './pages/RankingsPlayersPage';
import { SurvivalEventsPage } from './pages/SurvivalEventsPage';
import { SurvivalEventPage } from './pages/SurvivalEventPage';
import { SurvivalTeamsPage } from './pages/SurvivalTeamsPage';
import { TournamentEventPage } from './pages/TournamentEventPage';
import { TournamentPage } from './pages/TournamentPage';

/**
 * Every page of the site, and the one frame the signed-in pages share.
 *
 * There is one frame and it is read-only: every page below draws what the game
 * server already holds — who is connected, which lobby they are in, what is
 * published, which teams are on the ladder, who is in the bracket. Nothing here
 * writes, because a write made in the browser is a second source of truth for a
 * figure the game is already the source of, and the two would disagree the moment
 * the client acted on its own copy.
 *
 * The layout reads the token itself rather than taking it as a prop, because every
 * route needs it and passing it through each one would be an argument that is
 * always the same. A signed-out browser is sent to sign in, and remembers where it
 * was going.
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
 */

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/dashboard" element={<DashboardRoute />}>
          <Route index element={<OverviewSection />} />
          <Route path="characters" element={<MyCharactersPage />} />
          <Route path="characters/:identifier" element={<CharacterDetailPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route
            path="news/:identifier"
            element={<NewsDetailPage listPath="/dashboard/news" />}
          />
          <Route path="mail" element={<Navigate to="/dashboard/mail/inbox" replace />} />
          <Route path="mail/inbox" element={<MailInboxPage />} />
          <Route path="mail/outbox" element={<MailOutboxPage />} />
          <Route
            path="mail/inbox/:identifier"
            element={<MailDetailPage back="/dashboard/mail/inbox" label="Inbox" />}
          />
          <Route
            path="mail/outbox/:identifier"
            element={<MailDetailPage back="/dashboard/mail/outbox" label="Outbox" />}
          />
          <Route path="clans" element={<ClansPage />} />
          <Route path="clans/:identifier" element={<ClanDetailPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="survival" element={<Navigate to="/dashboard/survival/events" replace />} />
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
          <Route path="rankings" element={<Navigate to="/dashboard/rankings/players" replace />} />
          <Route path="rankings/players" element={<RankingsPlayersPage />} />
          <Route path="rankings/clans" element={<RankingsClansPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
