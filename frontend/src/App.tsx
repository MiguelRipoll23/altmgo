import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { MagicLinkPage } from './pages/MagicLinkPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { SignInPage } from './pages/SignInPage';

/**
 * Every page of the site.
 *
 * The bare single-segment route is the host link: the game server sends a host
 * to `/{code}`, so that path is the magic link page and it decides for itself
 * whether the segment is a code or a typo. The named routes above it win by
 * being static, which is what keeps `/dashboard` a page rather than a code.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/:code" element={<MagicLinkPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
