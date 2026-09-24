import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import { AuthProvider } from './state/AuthProvider';
import { RoutesProvider } from './state/RoutesProvider';

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <RoutesProvider>
        <HomePage />
      </RoutesProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
