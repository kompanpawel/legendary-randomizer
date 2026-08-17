import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/layout/BottomNav';
import { Spinner } from './components/ui/Spinner';
import { UpdatePrompt } from './components/ui/UpdatePrompt';

const SetupPage = lazy(() => import('./pages/SetupPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const DatabasePage = lazy(() => import('./pages/DatabasePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Spinner className="w-8 h-8" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-marvel-dark text-white">
        <main className="max-w-lg mx-auto">
          <Routes>
            <Route
              path="/"
              element={
                <PageSuspense>
                  <SetupPage />
                </PageSuspense>
              }
            />
            <Route
              path="/stats"
              element={
                <PageSuspense>
                  <StatsPage />
                </PageSuspense>
              }
            />
            <Route
              path="/database"
              element={
                <PageSuspense>
                  <DatabasePage />
                </PageSuspense>
              }
            />
            <Route
              path="/settings"
              element={
                <PageSuspense>
                  <SettingsPage />
                </PageSuspense>
              }
            />
          </Routes>
        </main>

        <BottomNav />
        <UpdatePrompt />
      </div>
    </BrowserRouter>
  );
}

