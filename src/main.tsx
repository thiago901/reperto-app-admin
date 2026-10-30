import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LuLoader } from 'react-icons/lu';
import { AuthProvider, useAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { UsersPage } from './pages/UsersPage';
import { GroupsPage } from './pages/GroupsPage';
import { StemsPage } from './pages/StemsPage';
import { SystemPage } from './pages/SystemPage';
import { SupportPage } from './pages/SupportPage';
import { FinancePage } from './pages/FinancePage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

function Gate() {
  const { state } = useAuth();
  if (state.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-950">
        <LuLoader size={22} className="animate-spin text-primary-400" />
      </div>
    );
  }
  if (state.status !== 'admin') return <LoginPage />;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<OverviewPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="grupos" element={<GroupsPage />} />
        <Route path="faixas" element={<StemsPage />} />
        <Route path="atendimento" element={<SupportPage />} />
        <Route path="financas" element={<FinancePage />} />
        <Route path="sistema" element={<SystemPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
