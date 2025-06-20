/**
 * Simple map component for Google Maps
 */
import { useState, useEffect, useRef } from 'react';
import { initGoogleMaps } from '../services/simpleGoogleMaps';
import './SimpleMap.css';

const SimpleGoogleMap = ({ route, center = { lat: 52.2297, lng: 21.0122 }, zoom = 6 }) => {
  const [map, setMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);
  const progressMarkerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        const google = await initGoogleMaps();
        
        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        });

        setMap(mapInstance);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Google Maps:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initMap();
  }, []);

  // Update route visualization
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing polyline and markers
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (progressMarkerRef.current) {
      progressMarkerRef.current.setMap(null);
      progressMarkerRef.current = null;
    }

    if (!route || !route.coordinates || route.coordinates.length < 2) {
      return;
    }

    // Validate route coordinates
    const validCoordinates = route.coordinates.filter(coord => 
      Array.isArray(coord) && 
      coord.length >= 2 && 
      typeof coord[0] === 'number' && 
      typeof coord[1] === 'number' &&
      !isNaN(coord[0]) && 
      !isNaN(coord[1])
    );

    if (validCoordinates.length < 2) {
      console.warn('Route has insufficient valid coordinates:', route);
      return;
    }

    try {
      // Convert coordinates to Google Maps format (use validated coordinates)
      const path = validCoordinates.map(coord => ({
        lat: coord[0],
        lng: coord[1]
      }));

      // Create polyline
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#2196F3',
        strokeOpacity: 1.0,
        strokeWeight: 4
      });

      polylineRef.current.setMap(map);

    // Add start marker with custom SVG
    const startMarker = new google.maps.Marker({
      position: path[0],
      map,
      title: 'Start',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <circle cx="16" cy="16" r="12" fill="#22c55e" stroke="#16a34a" stroke-width="2"/>
            <text x="16" y="22" text-anchor="middle" font-family="Arial" font-size="16" fill="white" font-weight="bold">GO</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });
    markersRef.current.push(startMarker);

    // Add finish marker with checkered flag emoji
    const endMarker = new google.maps.Marker({
      position: path[path.length - 1],
      map,
      title: '🏁 Finish',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <text x="16" y="24" text-anchor="middle" font-family="Arial" font-size="24" fill="#000">🏁</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });
    markersRef.current.push(endMarker);

    // Add progress marker if there's covered distance
    if (route.coveredDistance > 0 && route.distance > 0) {
      const progressRatio = Math.min(route.coveredDistance / route.distance, 1);
      const progressIndex = Math.floor((path.length - 1) * progressRatio);
      
      if (progressIndex > 0 && progressIndex < path.length) {
        // Get the most recent workout activity for the progress marker
        const getProgressIcon = () => {
          if (route.workouts && route.workouts.length > 0) {
            const sortedWorkouts = route.workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastActivity = sortedWorkouts[0].activity;
            
            switch (lastActivity) {
              case 'Running':
                return '🏃';
              case 'Walking':
                return '🚶';
              case 'Cycling':
                return '🚴';
              case 'Hiking':
                return '🥾';
              default:
                return '📍';
            }
          }
          return '📍';
        };

        const activityIcon = getProgressIcon();
        
        progressMarkerRef.current = new google.maps.Marker({
          position: path[progressIndex],
          map,
          title: `Progress: ${(route.coveredDistance / 1000).toFixed(1)}km (${((route.coveredDistance / route.distance) * 100).toFixed(1)}%)`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50" height="50">
                <text x="25" y="38" text-anchor="middle" font-family="Arial" font-size="36" fill="#000">${activityIcon}</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(50, 50),
            anchor: new google.maps.Point(25, 25)
          },
          zIndex: 1000
        });
      }
      }

      // Fit bounds to route
      const bounds = new google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds);

      console.log('Route displayed on Google Maps:', route);
    } catch (error) {
      console.error('Error displaying route on Google Maps:', error);
      // Don't crash the component, just log the error
    }
  }, [map, route]);

  if (error) {
    return (
      <div className="simple-map error">
        <div className="error-message">
          <h3>Google Maps Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simple-map">
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading Google Maps...</p>
        </div>
      )}
      <div ref={mapRef} className="map-container" />
    </div>
  );
};

export default SimpleGoogleMap;
