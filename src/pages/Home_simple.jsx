import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
// import MapComponent from '../components/MapComponent';
import RouteCreationForm from '../components/RouteCreationForm';
// import { calculateRouteDistance, formatDistance } from '../utils/helpers';
import './Home.css';

const Home = () => {
  // Load routes from localStorage on initial load
  const [routes, setRoutes] = useState(() => {
    const savedRoutes = localStorage.getItem('mapRunnerRoutes');
    return savedRoutes ? JSON.parse(savedRoutes) : [];
  });
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [routeMarkers, setRouteMarkers] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeVisualization, setRouteVisualization] = useState(null);

  // Save routes to localStorage whenever routes change
  useEffect(() => {
    localStorage.setItem('mapRunnerRoutes', JSON.stringify(routes));
  }, [routes]);

  const handleAddRoute = () => {
    setIsCreatingRoute(true);
    setSelectedMapLocation(null);
    setRouteMarkers([]);
  };

  const handleCancelRoute = () => {
    setIsCreatingRoute(false);
    setSelectedMapLocation(null);
    setRouteMarkers([]);
    setActiveField(null);
    setRouteVisualization(null);
  };

  const handleAcceptRoute = (routeData) => {
    // Calculate actual distance from the route visualization
    const distance = '0km'; // Simplified for testing
    
    // Add the new route to the routes list
    const newRoute = {
      id: Date.now(),
      name: routeData.name || 'Unnamed Route',
      from: routeData.from,
      to: routeData.to,
      stops: routeData.stops || [],
      activities: routeData.activities || [],
      distance: distance,
      waypoints: routeVisualization || [],
      created: new Date()
    };

    setRoutes(prev => [...prev, newRoute]);
    setIsCreatingRoute(false);
    setSelectedMapLocation(null);
    setRouteMarkers([]);
    setActiveField(null);
    setRouteVisualization(null);
    
    console.log('New route created:', newRoute);
  };

  const handleMapClick = (locationData) => {
    if (isCreatingRoute) {
      setSelectedMapLocation(locationData);
    }
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    console.log('Selected route:', route);
  };

  const handleRouteVisualization = (waypoints) => {
    setRouteVisualization(waypoints);
  };

  const handleMarkersUpdate = (markers) => {
    const formattedMarkers = markers.map((marker, index) => ({
      position: [marker.lat, marker.lon],
      label: index === 0 ? 'Start' : 
             index === markers.length - 1 ? 'End' : 
             `Stop ${index}`
    }));
    setRouteMarkers(formattedMarkers);
  };

  return (
    <div className="home-container">
      <Sidebar 
        onAddRoute={handleAddRoute} 
        routes={routes} 
        onRouteSelect={handleRouteSelect}
        selectedRoute={selectedRoute}
      />
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f0f0f0',
        color: '#666'
      }}>
        <div>
          <h2>Map will be here</h2>
          <p>Map component temporarily disabled for debugging</p>
        </div>
      </div>
      
      {isCreatingRoute && (
        <RouteCreationForm
          onCancel={handleCancelRoute}
          onAccept={handleAcceptRoute}
          selectedMapLocation={selectedMapLocation}
          onSetActiveField={setActiveField}
          activeField={activeField}
          onUpdateRoute={handleRouteVisualization}
          onUpdateMarkers={handleMarkersUpdate}
        />
      )}
    </div>
  );
};

export default Home;
