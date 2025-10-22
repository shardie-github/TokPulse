import { ApolloProvider } from '@apollo/client';
import { AppProvider } from '@shopify/polaris';
import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { apolloClient } from '@/lib/apollo';
import { ThemeProvider } from '@/lib/theme';
import { Analytics } from '@/pages/Analytics';
import { Dashboard } from '@/pages/Dashboard';
import { Settings } from '@/pages/Settings';
import '@shopify/polaris/build/esm/styles.css';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <AppProvider i18n={{}}>
          <ThemeProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </AppProvider>
      </ApolloProvider>
    </ErrorBoundary>
  );
}

export default App;
