import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import { AuthProvider } from './state/AuthProvider';
import { ConfirmProvider } from './state/ConfirmProvider';
import { RoutesProvider } from './state/RoutesProvider';

const App = () => (
  <ErrorBoundary>
    <ConfirmProvider>
      <AuthProvider>
        <RoutesProvider>
          <HomePage />
        </RoutesProvider>
      </AuthProvider>
    </ConfirmProvider>
  </ErrorBoundary>
);

export default App;
