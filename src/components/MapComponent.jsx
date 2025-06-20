import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import MapInstructions from './MapInstructions';
import './MapComponent.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks for location selection
const MapClickHandler = ({ onMapClick, isCreatingRoute }) => {
  useMapEvents({
    click: useCallback((e) => {
      if (isCreatingRoute && onMapClick) {
        onMapClick(e.latlng);
      }
    }, [isCreatingRoute, onMapClick])
  });
  return null;
};

const MapComponent = ({ 
  center = [52.2297, 21.0122], 
  zoom = 13, 
  onMapClick,
  isCreatingRoute = false,
  routeMarkers = [],
  activeField = null,
  routeVisualization = null
}) => {
  const [tempMarker, setTempMarker] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const mapRef = useRef(null);
  const reverseGeocodingTimeout = useRef(null);

  // Memoize processed coordinates to prevent unnecessary re-renders
  const processedCoordinates = useMemo(() => {
    if (!routeVisualization) return [];
    
    let coordinates = [];
    
    if (Array.isArray(routeVisualization)) {
      // Handle array of coordinates from routing service
      coordinates = routeVisualization.map(point => {
        if (Array.isArray(point)) {
          // Handle [lat, lon] format
          return [point[0], point[1]];
        } else if (point.lat && point.lon) {
          // Handle {lat, lon} format
          return [point.lat, point.lon];
        }
        return null;
      }).filter(Boolean);
    } else if (routeVisualization.coordinates && Array.isArray(routeVisualization.coordinates)) {
      // Handle route object with coordinates array
      coordinates = routeVisualization.coordinates.map(point => {
        if (Array.isArray(point)) {
          return [point[0], point[1]];
        } else if (point.lat && point.lon) {
          return [point.lat, point.lon];
        }
        return null;
      }).filter(Boolean);
    }
    
    // Additional simplification for display if needed
    if (coordinates.length > 2000) {
      console.log('Further simplifying coordinates for display performance');
      const step = Math.ceil(coordinates.length / 1500);
      const simplified = [];
      for (let i = 0; i < coordinates.length; i += step) {
        simplified.push(coordinates[i]);
      }
      // Always include the last point
      if (simplified[simplified.length - 1] !== coordinates[coordinates.length - 1]) {
        simplified.push(coordinates[coordinates.length - 1]);
      }
      console.log(`Simplified ${coordinates.length} points to ${simplified.length} for display`);
      return simplified;
    }
    
    return coordinates;
  }, [routeVisualization]);

  // Debounced reverse geocoding to avoid excessive API calls
  const debouncedReverseGeocode = useCallback(async (latlng, callback) => {
    if (reverseGeocodingTimeout.current) {
      clearTimeout(reverseGeocodingTimeout.current);
    }
    
    reverseGeocodingTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`
        );
        const data = await response.json();
        
        callback({
          coordinates: [latlng.lat, latlng.lng],
          display_name: data.display_name || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`,
          lat: latlng.lat,
          lon: latlng.lng
        });
      } catch (error) {
        console.error('Error with reverse geocoding:', error);
        callback({
          coordinates: [latlng.lat, latlng.lng],
          display_name: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`,
          lat: latlng.lat,
          lon: latlng.lng
        });
      }
    }, 300); // 300ms debounce
  }, []);

  // Handle map click for location selection
  const handleMapClick = useCallback(async (latlng) => {
    if (!isCreatingRoute || !onMapClick) return;

    setTempMarker(latlng);
    
    // Use debounced reverse geocoding
    debouncedReverseGeocode(latlng, onMapClick);
  }, [isCreatingRoute, onMapClick, debouncedReverseGeocode]);

  // Update route coordinates when visualization changes
  useEffect(() => {
    console.log('MapComponent - Route visualization updated, coordinates count:', processedCoordinates.length);
    setRouteCoordinates(processedCoordinates);
  }, [processedCoordinates]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (reverseGeocodingTimeout.current) {
        clearTimeout(reverseGeocodingTimeout.current);
      }
    };
  }, []);

  // Memoize polyline options to prevent re-renders
  const polylineOptions = useMemo(() => ({
    color: "#2196F3",
    weight: 6,
    opacity: 0.9,
    dashArray: "0",
    // Optimize for performance
    smoothFactor: 1,
    noClip: false
  }), []);

  return (
    <div className={`map-container ${isCreatingRoute ? 'creating-route' : ''}`}>
      {isCreatingRoute && (
        <MapInstructions isVisible={true} activeField={activeField} />
      )}
      
      {/* Performance feedback */}
      {routeCoordinates.length > 0 && (
        <div className={`route-performance-info ${routeCoordinates.length > 1500 ? 'warning' : ''}`}>
          {routeCoordinates.length > 1500 
            ? `⚠️ Large route (${routeCoordinates.length.toLocaleString()} points) - simplified for performance`
            : `📍 Route: ${routeCoordinates.length.toLocaleString()} points`
          }
        </div>
      )}
      
      {/* Loading indicator */}
      {isCreatingRoute && routeCoordinates.length === 0 && (
        <div className="route-loading-indicator">
          <div className="spinner"></div>
          Calculating route...
        </div>
      )}
      
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        ref={mapRef}
        // Improve map performance settings
        preferCanvas={true}
        updateWhenIdle={false}
        updateWhenZooming={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          updateWhenIdle={true}
          updateWhenZooming={false}
          keepBuffer={2}
        />
        
        <MapClickHandler onMapClick={handleMapClick} isCreatingRoute={isCreatingRoute} />

        {/* Show route visualization */}
        {routeCoordinates.length >= 2 && (
          <Polyline 
            positions={routeCoordinates} 
            pathOptions={polylineOptions}
          />
        )}

        {/* Show route markers - only start and end */}
        {routeCoordinates.length >= 2 && (
          <>
            <Marker key="route-start" position={routeCoordinates[0]}>
              <Popup>Start</Popup>
            </Marker>
            <Marker key="route-end" position={routeCoordinates[routeCoordinates.length - 1]}>
              <Popup>End</Popup>
            </Marker>
          </>
        )}

        {/* Show existing route markers */}
        {routeMarkers.map((marker, index) => (
          <Marker key={`marker-${index}`} position={marker.position}>
            <Popup>{marker.label}</Popup>
          </Marker>
        ))}

        {/* Show temporary marker when creating route */}
        {tempMarker && isCreatingRoute && (
          <Marker position={[tempMarker.lat, tempMarker.lng]}>
            <Popup>Selected location</Popup>
          </Marker>
        )}

        {/* Default marker when not creating routes */}
        {!isCreatingRoute && routeMarkers.length === 0 && routeCoordinates.length === 0 && (
          <Marker position={center}>
            <Popup>
              Map Runner v2 - Ready to track your routes!
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
