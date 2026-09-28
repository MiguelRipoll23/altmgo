import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DashboardRoute, OverviewSection, StaffSection } from './components/DashboardRoute';
import { CharactersPage } from './pages/CharactersPage';
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
 * reaching any of these is sent to sign in, and a signed-in one that is not
 * staff reaching a staff section is sent to the overview: the section is not
 * hidden from the DOM, it is simply not reachable, and the API refuses it
 * whatever the browser thinks.
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
          <Route path="survival" element={<StaffSection role="moderator" page={<SurvivalPage />} />} />
          <Route
            path="tournament"
            element={<StaffSection role="moderator" page={<TournamentPage />} />}
          />
          <Route path="rankings" element={<RankingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
