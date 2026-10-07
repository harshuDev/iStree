import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Splash } from './components/ui';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/queries';
import { AuthPage } from './pages/AuthPage';
import { TodayPage } from './pages/TodayPage';

// Secondary screens load on demand (all chunks are still precached for offline).
const CheckInPage = lazy(() => import('./pages/CheckInPage').then((m) => ({ default: m.CheckInPage })));
const CyclePage = lazy(() => import('./pages/CyclePage').then((m) => ({ default: m.CyclePage })));
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((m) => ({ default: m.InsightsPage })));
const InstallPage = lazy(() => import('./pages/InstallPage').then((m) => ({ default: m.InstallPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

/** Sends new users through onboarding once. */
function RequireOnboarded({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useSettings();
  const location = useLocation();
  if (isLoading && !settings) return <Splash />;
  if (settings && !settings.onboarding_completed && location.pathname !== '/install') {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/welcome" element={<OnboardingPage />} />
        <Route
          element={
            <RequireOnboarded>
              <AppShell />
            </RequireOnboarded>
          }
        >
          <Route index element={<TodayPage />} />
          <Route path="cycle" element={<CyclePage />} />
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="install" element={<InstallPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
