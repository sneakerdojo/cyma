import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { WizardProvider } from './features/octo/WizardContext';

const OctoPage = lazy(() => import('./pages/OctoPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

export default function App() {
  return (
    <BrowserRouter>
      <WizardProvider>
        <div className="min-h-screen bg-bg text-text font-body">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/octo"
              element={
                <Suspense fallback={<div className="min-h-screen bg-bg" />}>
                  <OctoPage />
                </Suspense>
              }
            />
            <Route
              path="/privacy"
              element={
                <Suspense fallback={<div className="min-h-screen bg-bg" />}>
                  <PrivacyPage />
                </Suspense>
              }
            />
          </Routes>
        </div>
      </WizardProvider>
    </BrowserRouter>
  );
}
