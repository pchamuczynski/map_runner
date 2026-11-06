import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import PrivacyPage from './pages/PrivacyPage';
import { AuthProvider } from './state/AuthProvider';
import { ConfirmProvider } from './state/ConfirmProvider';
import { RoutesProvider } from './state/RoutesProvider';

const isPrivacyPath = () => window.location.pathname.replace(/\/+$/, '') === '/privacy';

const App = () => (
  <ErrorBoundary>
    {isPrivacyPath() ? (
      <PrivacyPage />
    ) : (
      <ConfirmProvider>
        <AuthProvider>
          <RoutesProvider>
            <HomePage />
          </RoutesProvider>
        </AuthProvider>
      </ConfirmProvider>
    )}
  </ErrorBoundary>
);

export default App;
