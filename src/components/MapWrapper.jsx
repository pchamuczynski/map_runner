import { useState, useEffect, useRef } from 'react';
import { isGoogleMapsEnabled, logMapConfiguration } from '../utils/mapConfig';
import './MapWrapper.css';

// Dynamic map component that loads the appropriate provider
const MapWrapper = (props) => {
  const [MapComponent, setMapComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const mountedRef = useRef(true);
  const loadAttemptRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    loadAttemptRef.current += 1;
    const currentAttempt = loadAttemptRef.current;
    
    const loadMapComponent = async () => {
      try {
        console.log(`🗺️ MapWrapper: Loading attempt #${currentAttempt}`);
        setLoadingMessage('Configuring map provider...');
        const config = logMapConfiguration();

        let component;
        if (isGoogleMapsEnabled()) {
          console.log('🌍 MapWrapper: Using Google Maps provider');
          setLoadingMessage('Loading Google Maps...');
          
          try {
            const GoogleMapComponent = (await import('../components/GoogleMapComponent')).default;
            component = GoogleMapComponent;
            console.log('✅ MapWrapper: Google Maps component loaded successfully');
            setLoadingMessage('Initializing Google Maps...');
          } catch (googleError) {
            console.error('❌ MapWrapper: Failed to load Google Maps component:', googleError);
            console.log('🔄 MapWrapper: Falling back to OpenStreetMap...');
            setLoadingMessage('Loading OpenStreetMap (fallback)...');
            const LeafletMapComponent = (await import('../components/MapComponent')).default;
            component = LeafletMapComponent;
          }
        } else {
          console.log('🌍 MapWrapper: Using OpenStreetMap provider');
          setLoadingMessage('Loading OpenStreetMap...');
          const LeafletMapComponent = (await import('../components/MapComponent')).default;
          component = LeafletMapComponent;
          console.log('✅ MapWrapper: OpenStreetMap component loaded successfully');
        }

        // Only update state if this is the latest attempt and component is still mounted
        if (mountedRef.current && currentAttempt === loadAttemptRef.current) {
          setMapComponent(() => component);
          setIsLoading(false);
          setError(null);
          console.log('MapWrapper: Map component ready');
        }
      } catch (err) {
        console.error('MapWrapper: Error loading map component:', err);
        if (mountedRef.current && currentAttempt === loadAttemptRef.current) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    // Small delay to prevent rapid re-renders
    const timeoutId = setTimeout(loadMapComponent, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (currentAttempt === loadAttemptRef.current) {
        mountedRef.current = false;
      }
    };
  }, []); // Empty dependency array to prevent re-loading

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="map-wrapper-container loading">
        <div className="map-loading-overlay">
          <div className="map-loading-content">
            <div className="map-loading-spinner"></div>
            {loadingMessage}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-wrapper-container">
        <div className="map-error-overlay">
          <div className="map-error-content">
            <h3 className="map-error-title">Map Loading Error</h3>
            <p className="map-error-message">{error}</p>
            <p className="map-error-message">
              This might be due to:
              <br />• Invalid Google Maps API key
              <br />• Missing API permissions
              <br />• Network connectivity issues
            </p>
            <button 
              className="map-error-button"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!MapComponent) {
    return (
      <div className="map-wrapper-container">
        <div className="map-error-overlay">
          <div className="map-error-content">
            <h3 className="map-error-title">Map Component Not Available</h3>
            <p className="map-error-message">Unable to load the map component.</p>
            <button 
              className="map-error-button"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('MapWrapper: Rendering map component');
  return (
    <div className="map-wrapper-container loaded">
      <MapComponent {...props} />
    </div>
  );
};

export default MapWrapper;
