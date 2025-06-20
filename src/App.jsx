import Home from './pages/Home'
import SimpleHome from './pages/SimpleHome'
import RouteTestPage from './pages/RouteTestPage'
import './App.css'

function App() {
  // Check URL for different modes
  const hash = window.location.hash;
  
  if (hash === '#test') {
    return <RouteTestPage />;
  } else if (hash === '#complex') {
    return <Home />; // Keep the complex version for reference
  } else {
    return <SimpleHome />; // Make simplified version the default
  }
}

export default App
