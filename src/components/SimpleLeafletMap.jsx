/**
 * Simple map component for OpenStreetMap/Leaflet
 */
import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SimpleMap.css';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SimpleLeafletMap = ({ route, center = [52.2297, 21.0122], zoom = 6 }) => {
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);
  const progressMarkerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const mapInstance = L.map(mapRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, []);

  // Update route visualization
  useEffect(() => {
    if (!map) return;

    // Clear existing polyline and markers
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];
    
    if (progressMarkerRef.current) {
      map.removeLayer(progressMarkerRef.current);
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
    }    try {
      // Create polyline (use validated coordinates)
      polylineRef.current = L.polyline(validCoordinates, {
        color: '#2196F3',
        weight: 4,
        opacity: 0.8
      }).addTo(map);

      // Add start marker with custom SVG
      const startIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
            <circle cx="16" cy="16" r="12" fill="#22c55e" stroke="#16a34a" stroke-width="2"/>
            <text x="16" y="22" text-anchor="middle" font-family="Arial" font-size="16" fill="white" font-weight="bold">GO</text>
          </svg>
        `),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const startMarker = L.marker(validCoordinates[0], {
        title: 'Start',
        icon: startIcon
      }).addTo(map);
    markersRef.current.push(startMarker);

    // Add finish marker with custom checkered flag SVG
    const endIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <text x="16" y="24" text-anchor="middle" font-family="Arial" font-size="24" fill="#000">🏁</text>
        </svg>
      `),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });      const endMarker = L.marker(validCoordinates[validCoordinates.length - 1], {
      title: '🏁 Finish',
      icon: endIcon
    }).addTo(map);
    markersRef.current.push(endMarker);

    // Add progress marker if there's covered distance
    if (route.coveredDistance > 0 && route.distance > 0) {
      const progressRatio = Math.min(route.coveredDistance / route.distance, 1);        const progressIndex = Math.floor((validCoordinates.length - 1) * progressRatio);
        
        if (progressIndex > 0 && progressIndex < validCoordinates.length) {
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

        // Create custom activity icon for progress marker
        const activityProgressIcon = L.icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50" height="50">
              <text x="25" y="38" text-anchor="middle" font-family="Arial" font-size="36" fill="#000">${activityIcon}</text>
            </svg>
          `),
          iconSize: [50, 50],
          iconAnchor: [25, 25],
          popupAnchor: [0, -25]
        });          progressMarkerRef.current = L.marker(validCoordinates[progressIndex], {
          title: `Progress: ${(route.coveredDistance / 1000).toFixed(1)}km (${((route.coveredDistance / route.distance) * 100).toFixed(1)}%)`,
          icon: activityProgressIcon
        }).addTo(map);
      }
      }

      // Fit bounds to route
      map.fitBounds(polylineRef.current.getBounds());

      console.log('Route displayed on Leaflet map:', route);
    } catch (error) {
      console.error('Error displaying route on Leaflet map:', error);
      // Don't crash the component, just log the error
    }
  }, [map, route]);

  return (
    <div className="simple-map">
      <div ref={mapRef} className="map-container" />
    </div>
  );
};

export default SimpleLeafletMap;
