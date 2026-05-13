import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/HomePage';
import ChatLauncher from './components/ChatLauncher';
import ChatOverlay from './components/ChatOverlay';
import { WizardProvider } from './features/octo/WizardContext';

const OctoPage = lazy(() => import('./pages/OctoPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const OfferingPage = lazy(() => import('./pages/OfferingPage'));
const VoiceAgentSimPage = lazy(() => import('./pages/VoiceAgentSimPage'));

const Loader = () => <div className="min-h-screen bg-bg" />;

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <WizardProvider>
        <div className="min-h-screen bg-bg text-text font-body">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/octo"
              element={
                <Suspense fallback={<Loader />}>
                  <OctoPage />
                </Suspense>
              }
            />
            <Route
              path="/privacy"
              element={
                <Suspense fallback={<Loader />}>
                  <PrivacyPage />
                </Suspense>
              }
            />
            <Route
              path="/products/:slug"
              element={
                <Suspense fallback={<Loader />}>
                  <OfferingPage expectCategory="product" />
                </Suspense>
              }
            />
            <Route
              path="/services/:slug"
              element={
                <Suspense fallback={<Loader />}>
                  <OfferingPage expectCategory="service" />
                </Suspense>
              }
            />
            <Route
              path="/voice-sim"
              element={
                <Suspense fallback={<Loader />}>
                  <VoiceAgentSimPage />
                </Suspense>
              }
            />
          </Routes>
          {/*
            Persistent floating "Talk to our AI agent" affordance — visible
            on every page (except utility routes like /privacy). Hidden when
            the chat modal is open. The single, unmistakable way for
            visitors to engage Octo at any point during browsing.
          */}
          <ChatLauncher />
          {/*
            Site-wide chat overlay. Renders the conversation modal on top of
            whichever route is mounted, so "Talk to our AI agent" works from
            sub-pages (product detail, service detail) — not just the hero.
          */}
          <ChatOverlay />
        </div>
      </WizardProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
