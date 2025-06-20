import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { initializeGoogleMaps, reverseGeocode } from '../services/googleMapsService';
import MapInstructions from './MapInstructions';
import './GoogleMapComponent.css';

const GoogleMapComponent = ({ 
  center = { lat: 52.2297, lng: 21.0122 }, 
  zoom = 13, 
  onMapClick,
  isCreatingRoute = false,
  routeMarkers = [],
  activeField = null,
  routeVisualization = null
}) => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [polyline, setPolyline] = useState(null);
  const [tempMarker, setTempMarker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  
  const mapRef = useRef(null);
  const reverseGeocodingTimeout = useRef(null);
  const googleRef = useRef(null);

  // Memoize processed coordinates to prevent unnecessary re-renders
  const processedCoordinates = useMemo(() => {
    console.log('🗺️ GoogleMapComponent - Processing route visualization:', routeVisualization);
    
    if (!routeVisualization) {
      console.log('❌ No route visualization data');
      return [];
    }
    
    let coordinates = [];
    
    if (Array.isArray(routeVisualization)) {
      // Handle array of coordinates from routing service
      console.log('📍 Processing array of coordinates, length:', routeVisualization.length);
      coordinates = routeVisualization.map((point, index) => {
        if (Array.isArray(point)) {
          // Handle [lat, lon] format
          return { lat: point[0], lng: point[1] };
        } else if (point.lat && point.lon) {
          // Handle {lat, lon} format
          return { lat: point.lat, lng: point.lon };
        } else if (point.lat && point.lng) {
          // Handle {lat, lng} format
          return { lat: point.lat, lng: point.lng };
        }
        console.warn(`⚠️ Invalid coordinate format at index ${index}:`, point);
        return null;
      }).filter(Boolean);
    } else if (routeVisualization.coordinates && Array.isArray(routeVisualization.coordinates)) {
      // Handle route object with coordinates array
      console.log('📍 Processing route object with coordinates, length:', routeVisualization.coordinates.length);
      coordinates = routeVisualization.coordinates.map((point, index) => {
        if (Array.isArray(point)) {
          return { lat: point[0], lng: point[1] };
        } else if (point.lat && point.lon) {
          return { lat: point.lat, lng: point.lon };
        } else if (point.lat && point.lng) {
          return { lat: point.lat, lng: point.lng };
        }
        console.warn(`⚠️ Invalid coordinate format at index ${index}:`, point);
        return null;
      }).filter(Boolean);
    } else {
      console.warn('⚠️ Unrecognized route visualization format:', routeVisualization);
    }
    
    console.log('📊 Processed coordinates count:', coordinates.length);
    
    // Additional simplification for display if needed
    if (coordinates.length > 2000) {
      console.log('⚡ Further simplifying coordinates for Google Maps display performance');
      const step = Math.ceil(coordinates.length / 1500);
      const simplified = [];
      for (let i = 0; i < coordinates.length; i += step) {
        simplified.push(coordinates[i]);
      }
      // Always include the last point
      if (simplified[simplified.length - 1] !== coordinates[coordinates.length - 1]) {
        simplified.push(coordinates[coordinates.length - 1]);
      }
      console.log(`✅ Simplified ${coordinates.length} points to ${simplified.length} for Google Maps display`);
      return simplified;
    }
    
    return coordinates;
  }, [routeVisualization]);

  // Initialize Google Maps (only once)
  useEffect(() => {
    const initMap = async () => {
      try {
        setIsLoading(true);
        const google = await initializeGoogleMaps();
        googleRef.current = google;

        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: center,
            zoom: zoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            gestureHandling: 'greedy', // Allow single-finger panning
            zoomControl: true,
            mapTypeControl: true,
            scaleControl: true,
            streetViewControl: true,
            rotateControl: false,
            fullscreenControl: true,
            styles: [
              // Optional: Add custom map styling here
            ]
          });

          setMap(mapInstance);
          console.log('Google Maps initialized successfully');
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        setLoadError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initMap();
  }, []); // Empty dependency array - only initialize once

  // Handle click listener setup separately
  useEffect(() => {
    if (!map || !googleRef.current) return;

    let clickListener = null;

    if (isCreatingRoute && onMapClick) {
      clickListener = map.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        // Remove previous temp marker
        if (tempMarker) {
          tempMarker.setMap(null);
        }

        // Create temporary marker
        const marker = new googleRef.current.maps.Marker({
          position: { lat, lng },
          map: map,
          title: 'Selected location',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new googleRef.current.maps.Size(32, 32)
          }
        });

        setTempMarker(marker);

        // Use debounced reverse geocoding
        debouncedReverseGeocode(lat, lng, onMapClick);
      });
    }

    // Cleanup function
    return () => {
      if (clickListener) {
        googleRef.current.maps.event.removeListener(clickListener);
      }
    };
  }, [map, isCreatingRoute, onMapClick]); // Removed tempMarker and debouncedReverseGeocode from dependencies

  // Update map center and zoom when props change
  useEffect(() => {
    if (map && center && zoom) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  // Debounced reverse geocoding to avoid excessive API calls
  const debouncedReverseGeocode = useCallback(async (lat, lng, callback) => {
    if (reverseGeocodingTimeout.current) {
      clearTimeout(reverseGeocodingTimeout.current);
    }
    
    reverseGeocodingTimeout.current = setTimeout(async () => {
      try {
        const result = await reverseGeocode(lat, lng);
        callback(result);
      } catch (error) {
        console.error('Error with reverse geocoding:', error);
        callback({
          coordinates: [lat, lng],
          display_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat: lat,
          lon: lng
        });
      }
    }, 300); // 300ms debounce
  }, []);

  // Update route visualization
  useEffect(() => {
    if (!map || !googleRef.current) return;

    // Clear existing polyline
    if (polyline) {
      polyline.setMap(null);
      setPolyline(null);
    }

    // Clear existing route markers (use ref to avoid state dependency)
    markers.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });

    if (processedCoordinates.length >= 2) {
      console.log('🎨 Google Maps - Creating route visualization with', processedCoordinates.length, 'points');
      console.log('📍 First point:', processedCoordinates[0]);
      console.log('📍 Last point:', processedCoordinates[processedCoordinates.length - 1]);

      // Create polyline
      const routePolyline = new googleRef.current.maps.Polyline({
        path: processedCoordinates,
        geodesic: true,
        strokeColor: '#2196F3',
        strokeOpacity: 0.9,
        strokeWeight: 6
      });

      routePolyline.setMap(map);
      setPolyline(routePolyline);
      console.log('✅ Polyline added to map');

      // Add start and end markers
      const newMarkers = [];

      // Start marker
      const startMarker = new googleRef.current.maps.Marker({
        position: processedCoordinates[0],
        map: map,
        title: 'Start',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new googleRef.current.maps.Size(32, 32)
        }
      });
      newMarkers.push(startMarker);
      console.log('✅ Start marker added');

      // End marker
      const endMarker = new googleRef.current.maps.Marker({
        position: processedCoordinates[processedCoordinates.length - 1],
        map: map,
        title: 'End',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new googleRef.current.maps.Size(32, 32)
        }
      });
      newMarkers.push(endMarker);
      console.log('✅ End marker added');

      setMarkers(newMarkers);

      // Fit map to route bounds
      const bounds = new googleRef.current.maps.LatLngBounds();
      processedCoordinates.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds);
      console.log('✅ Map bounds adjusted to fit route');
    } else {
      console.log('❌ Not enough coordinates for route visualization:', processedCoordinates.length);
      setMarkers([]);
    }
  }, [map, processedCoordinates]); // Removed markers from dependencies

  // Update existing route markers
  useEffect(() => {
    if (!map || !googleRef.current) return;

    // Add existing route markers
    routeMarkers.forEach((markerData, index) => {
      const marker = new googleRef.current.maps.Marker({
        position: { lat: markerData.position[0], lng: markerData.position[1] },
        map: map,
        title: markerData.label,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new googleRef.current.maps.Size(24, 24)
        }
      });

      // Add info window
      const infoWindow = new googleRef.current.maps.InfoWindow({
        content: markerData.label
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });
  }, [map, routeMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reverseGeocodingTimeout.current) {
        clearTimeout(reverseGeocodingTimeout.current);
      }
      if (tempMarker) {
        tempMarker.setMap(null);
      }
      if (polyline) {
        polyline.setMap(null);
      }
      markers.forEach(marker => marker.setMap(null));
    };
  }, []);

  if (loadError) {
    return (
      <div className="map-container">
        <div className="map-error">
          <h3>Google Maps Error</h3>
          <p>{loadError}</p>
          <p>Please check your Google Maps API key configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-container ${isCreatingRoute ? 'creating-route' : ''}`}>
      {isCreatingRoute && (
        <MapInstructions isVisible={true} activeField={activeField} />
      )}
      
      {/* Performance feedback */}
      {processedCoordinates.length > 0 && (
        <div className={`route-performance-info ${processedCoordinates.length > 1500 ? 'warning' : ''}`}>
          {processedCoordinates.length > 1500 
            ? `⚠️ Large route (${processedCoordinates.length.toLocaleString()} points) - simplified for performance`
            : `📍 Route: ${processedCoordinates.length.toLocaleString()} points`
          }
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="map-loading-indicator">
          <div className="spinner"></div>
          Loading Google Maps...
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className="google-map"
        style={{ 
          height: '100%', 
          width: '100%',
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />
    </div>
  );
};

export default GoogleMapComponent;
