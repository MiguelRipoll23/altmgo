import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DashboardRoute, OverviewSection, StaffSection } from './components/DashboardRoute';
import { CharactersPage } from './pages/CharactersPage';
import { DiscordPage } from './pages/DiscordPage';
import { GamesPage } from './pages/GamesPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RankingsPage } from './pages/RankingsPage';
import { RegisterPage } from './pages/RegisterPage';
import { SignInPage } from './pages/SignInPage';
import { SurvivalPage } from './pages/SurvivalPage';
import { TournamentPage } from './pages/TournamentPage';

/**
 * Every page of the site, and the layout the dashboard sections share.
 *
 * The dashboard is a set of routes under one path rather than one page with tabs
 * inside it, so a section can be linked to, reloaded and put in a second window
 * — which is how an operator actually uses one: the list they care about open
 * beside the control they are adjusting.
 *
 * The layout reads the token and the roles itself rather than taking them as
 * props, because every dashboard route needs them and passing them through each
 * one would be four arguments that are always the same. A signed-out browser
 * reaching any of these is sent to sign in.
 *
 * Survival and Tournament are open to every signed-in account rather than to
 * staff: they are public information in the game, and each page decides which of
 * its controls to draw from the roles. The Discord section is the one place the
 * route itself is gated, because the whole of it is staff work.
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
          <Route path="characters" element={<CharactersPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="survival" element={<SurvivalPage />} />
          <Route path="tournament" element={<TournamentPage />} />
          <Route path="rankings" element={<RankingsPage />} />
          <Route
            path="discord"
            element={<StaffSection role="moderator" page={<DiscordPage />} />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
