import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import MapWrapper from '../components/MapWrapper';
import RouteCreationForm from '../components/RouteCreationForm';
import { getRoutingService } from '../utils/mapConfig';
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
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

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

  const handleDeleteRoute = (routeId) => {
    if (confirm('Are you sure you want to delete this route?')) {
      setRoutes(prev => prev.filter(route => route.id !== routeId));
      
      // Clear visualization if the deleted route was selected
      if (selectedRoute && selectedRoute.id === routeId) {
        setSelectedRoute(null);
        setRouteVisualization(null);
        setRouteMarkers([]);
      }
    }
  };

  const handleReorderRoutes = (newRoutes) => {
    setRoutes(newRoutes);
  };

  const handleAcceptRoute = (routeData) => {
    // Use the calculated distance from route data if available
    const distance = routeData.distance || '0km';
    
    // Add the new route to the routes list
    const newRoute = {
      id: Date.now(),
      name: routeData.name || 'Unnamed Route',
      from: routeData.from,
      to: routeData.to,
      stops: routeData.stops || [],
      activities: routeData.activities || [],
      distance: distance,
      waypoints: routeData.coordinates || routeVisualization || [],
      calculatedDistance: routeData.calculatedDistance || 0,
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

  const handleRouteSelect = async (route) => {
    setSelectedRoute(route);
    setIsLoadingRoute(true);
    
    try {
      // If route doesn't have proper coordinates, recalculate the route
      if (!route.waypoints || route.waypoints.length < 2 || !Array.isArray(route.waypoints[0])) {
        console.log('Recalculating route for visualization...');
        
        // Build the route points array
        const routePoints = [route.from];
        if (route.stops && route.stops.length > 0) {
          routePoints.push(...route.stops.map(stop => stop.location));
        }
        routePoints.push(route.to);
        
        // Calculate the route
        const result = await calculateRoute(routePoints);
        
        if (result.coordinates && result.coordinates.length > 0) {
          // Update the route with calculated coordinates
          const updatedRoute = {
            ...route,
            waypoints: result.coordinates,
            calculatedDistance: result.distance
          };
          
          // Update the route in storage
          setRoutes(prev => prev.map(r => r.id === route.id ? updatedRoute : r));
          
          // Visualize the calculated route
          setRouteVisualization(result.coordinates);
          
          // Create markers for the route
          const routeMarkers = [
            { position: result.coordinates[0], label: 'Start' },
            { position: result.coordinates[result.coordinates.length - 1], label: 'End' }
          ];
          
          if (route.stops && route.stops.length > 0) {
            // Add stop markers (approximate positions)
            const stopInterval = Math.floor(result.coordinates.length / (route.stops.length + 1));
            route.stops.forEach((stop, index) => {
              const markerIndex = stopInterval * (index + 1);
              if (result.coordinates[markerIndex]) {
                routeMarkers.splice(-1, 0, {
                  position: result.coordinates[markerIndex],
                  label: `Stop ${index + 1}`
                });
              }
            });
          }
          
          setRouteMarkers(routeMarkers);
        }
      } else {
        // Route already has coordinates, use them directly
        setRouteVisualization(route.waypoints);
        
        const routeMarkers = route.waypoints.map((waypoint, index) => {
          let position;
          if (Array.isArray(waypoint)) {
            position = [waypoint[0], waypoint[1]];
          } else if (waypoint.lat && waypoint.lon) {
            position = [waypoint.lat, waypoint.lon];
          } else {
            return null;
          }
          
          return {
            position: position,
            label: index === 0 ? 'Start' : 
                   index === route.waypoints.length - 1 ? 'End' : 
                   `Stop ${index}`
          };
        }).filter(Boolean);
        
        setRouteMarkers(routeMarkers);
      }
    } catch (error) {
      console.error('Error visualizing route:', error);
      // Clear any existing visualization
      setRouteVisualization(null);
      setRouteMarkers([]);
    } finally {
      setIsLoadingRoute(false);
    }
    
    console.log('Selected route:', route);
  };

  const handleRouteVisualization = (routeData) => {
    console.log('🎨 Home - Received route visualization data:', routeData);
    
    // Handle route data from the form's route calculation
    if (routeData && routeData.coordinates) {
      console.log('✅ Home - Setting route visualization with coordinates:', routeData.coordinates.length);
      setRouteVisualization(routeData);
    } else if (routeData) {
      console.log('⚠️ Home - Setting route visualization without coordinates property:', routeData);
      setRouteVisualization(routeData);
    } else {
      console.log('❌ Home - Clearing route visualization');
      setRouteVisualization(null);
    }
  };

  // Debug function to test route creation directly
  const debugTestRoute = async () => {
    console.log('🔧 Debug - Testing route creation directly');
    try {
      const routingService = await getRoutingService();
      console.log('✅ Debug - Routing service loaded:', routingService);
      
      const testResult = await routingService.calculateRoute(['Warsaw, Poland', 'Krakow, Poland']);
      console.log('✅ Debug - Route calculated:', testResult);
      
      if (testResult.coordinates) {
        console.log('✅ Debug - Setting test route visualization');
        setRouteVisualization(testResult);
      }
    } catch (error) {
      console.error('❌ Debug - Route test failed:', error);
    }
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
      {/* Debug button - remove in production */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
        <button 
          onClick={debugTestRoute}
          style={{ 
            padding: '8px 16px', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🔧 Debug Test Route
        </button>
      </div>
      
      <Sidebar 
        onAddRoute={handleAddRoute} 
        routes={routes} 
        onRouteSelect={handleRouteSelect}
        selectedRoute={selectedRoute}
        isLoadingRoute={isLoadingRoute}
        onDeleteRoute={handleDeleteRoute}
        onReorderRoutes={handleReorderRoutes}
      />
      <MapWrapper 
        onMapClick={handleMapClick}
        isCreatingRoute={isCreatingRoute}
        routeMarkers={routeMarkers}
        activeField={activeField}
        routeVisualization={routeVisualization}
      />
      
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
