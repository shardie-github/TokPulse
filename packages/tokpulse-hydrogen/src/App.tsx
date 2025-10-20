import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import { ApolloProvider } from '@apollo/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/lib/theme';
import { apolloClient } from '@/lib/apollo';
import { Dashboard } from '@/pages/Dashboard';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import '@shopify/polaris/build/esm/styles.css';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <AppProvider>
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