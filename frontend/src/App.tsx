import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute, AdminStaffSection } from './components/AdminRoute';
import { DashboardRoute, OverviewSection } from './components/DashboardRoute';
import { ClansPage } from './pages/ClansPage';
import { GamesPage } from './pages/GamesPage';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RankingsPage } from './pages/RankingsPage';
import { RegisterPage } from './pages/RegisterPage';
import { SignInPage } from './pages/SignInPage';
import { SurvivalPage } from './pages/SurvivalPage';
import { TournamentPage } from './pages/TournamentPage';
import { AccountsPage } from './pages/admin/AccountsPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AnnouncementsPage } from './pages/admin/AnnouncementsPage';
import { CharactersPage } from './pages/admin/CharactersPage';
import { DiscordPage } from './pages/admin/DiscordPage';
import { EventOperationsPage } from './pages/admin/EventOperationsPage';

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
          <Route path="news" element={<NewsPage />} />
          <Route path="clans" element={<ClansPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="survival" element={<SurvivalPage />} />
          <Route path="tournament" element={<TournamentPage />} />
          <Route path="rankings" element={<RankingsPage />} />
        </Route>

        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="clans" element={<ClansPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="survival" element={<SurvivalPage />} />
          <Route path="tournament" element={<TournamentPage />} />
          <Route path="characters" element={<CharactersPage />} />
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
          <Route
            path="announcements"
            element={<AdminStaffSection role="manager" page={<AnnouncementsPage />} />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
