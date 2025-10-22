import React, { Suspense } from 'react';
import { AdvancedErrorBoundary } from '../components/AdvancedErrorBoundary';
import { LoadingSpinner } from '../components/AdvancedLoading';
import { KPIsGrid } from '../components/KPIsGrid';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { ThemeProvider } from '../contexts/ThemeContext';
import { fetchReport } from '../lib/data.ts';
import { registerPWA } from '../lib/pwa';
import { useStore } from '../state/store';

// Lazy chunks for heavier widgets
const ChannelShareChart = React.lazy(() => import('../components/ChannelShareChart'));
const FunnelChart = React.lazy(() => import('../components/FunnelChart'));
const ActivityFeed = React.lazy(() => import('../components/ActivityFeed'));
const MediaWidget = React.lazy(() => import('../components/MediaWidget'));
const Leaderboard = React.lazy(() => import('../components/Leaderboard'));
const StreakWidget = React.lazy(() => import('../components/StreakWidget'));
const XPBar = React.lazy(() => import('../components/XPBar'));
const ProPanel = React.lazy(() => import('../components/ProPanel'));
const CommandPalette = React.lazy(() => import('../components/CommandPalette'));
const TrialBanner = React.lazy(() => import('../components/TrialBanner'));
const ExportButton = React.lazy(() => import('../components/ExportButton'));
const SettingsDrawer = React.lazy(() => import('../components/SettingsDrawer'));
const SupportWidget = React.lazy(() => import('../components/SupportWidget'));
const ReactShowcase = React.lazy(() => import('../components/ReactShowcase'));

function DashboardContent() {
  React.useEffect(() => {
    registerPWA();
  }, []);
  React.useEffect(() => {
    (async () => {
      const r = await fetchReport();
      if (!r) return;
      const S = useStore.getState();
      S.kpis = r.kpis;
      (S as any).funnel = r.funnel;
      (S as any).feed = r.feed;
      (S as any).share = r.share;
    })();
  }, []);

  return (
    <div className="min-h-screen grid md:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
      <aside className="hidden md:block">
        <Sidebar />
      </aside>
      <main className="p-4 md:p-6 lg:p-8 space-y-6">
        <Topbar />

        <Suspense
          fallback={
            <div className="card p-3">
              <LoadingSpinner text="Loading banner..." />
            </div>
          }
        >
          <TrialBanner />
        </Suspense>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <section className="xl:col-span-2 space-y-6">
            <KPIsGrid />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Suspense
                fallback={
                  <div className="card p-4">
                    <LoadingSpinner text="Loading chart..." />
                  </div>
                }
              >
                <ChannelShareChart />
              </Suspense>
              <Suspense
                fallback={
                  <div className="card p-4">
                    <LoadingSpinner text="Loading chart..." />
                  </div>
                }
              >
                <FunnelChart />
              </Suspense>
            </div>
            <Suspense
              fallback={
                <div className="card p-4">
                  <LoadingSpinner text="Loading activity..." />
                </div>
              }
            >
              <ActivityFeed />
            </Suspense>
          </section>
          <section className="space-y-6">
            <Suspense
              fallback={
                <div className="card p-4">
                  <LoadingSpinner text="Loading widget..." />
                </div>
              }
            >
              <MediaWidget />
            </Suspense>
            <Suspense
              fallback={
                <div className="card p-4">
                  <LoadingSpinner text="Loading leaderboard..." />
                </div>
              }
            >
              <Leaderboard />
            </Suspense>
            <Suspense
              fallback={
                <div className="card p-4">
                  <LoadingSpinner text="Loading streak..." />
                </div>
              }
            >
              <StreakWidget />
            </Suspense>
            <Suspense
              fallback={
                <div className="card p-4">
                  <LoadingSpinner text="Loading XP bar..." />
                </div>
              }
            >
              <XPBar />
            </Suspense>
            <Suspense
              fallback={
                <div className="card p-4">
                  <LoadingSpinner text="Loading pro panel..." />
                </div>
              }
            >
              <ProPanel />
            </Suspense>
            <SettingsDrawer />
          </section>
        </div>
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <SupportWidget />
      </Suspense>
    </div>
  );
}

export default function App() {
  const [showShowcase, setShowShowcase] = React.useState(false);

  return (
    <ThemeProvider>
      <AdvancedErrorBoundary>
        {showShowcase ? (
          <div className="min-h-screen">
            <div className="fixed top-4 left-4 z-50">
              <button
                onClick={() => setShowShowcase(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <LoadingSpinner size="lg" text="Loading showcase..." />
                </div>
              }
            >
              <ReactShowcase />
            </Suspense>
          </div>
        ) : (
          <div className="min-h-screen">
            <div className="fixed top-4 right-4 z-50">
              <button
                onClick={() => setShowShowcase(true)}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-lg"
              >
                🚀 React Showcase
              </button>
            </div>
            <DashboardContent />
          </div>
        )}
      </AdvancedErrorBoundary>
    </ThemeProvider>
  );
}
