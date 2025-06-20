/**
 * Map provider configuration utility
 * Allows switching between Google Maps and OpenStreetMap/Leaflet
 */

// Check if Google Maps should be used based on environment variables
const useGoogleMaps = import.meta.env.VITE_USE_GOOGLE_MAPS === 'true';
const hasGoogleMapsKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Determine which map provider to use
export const MAP_PROVIDER = {
  GOOGLE: 'google',
  LEAFLET: 'leaflet'
};

export const getCurrentMapProvider = () => {
  if (useGoogleMaps && hasGoogleMapsKey) {
    return MAP_PROVIDER.GOOGLE;
  }
  return MAP_PROVIDER.LEAFLET;
};

export const isGoogleMapsEnabled = () => {
  return getCurrentMapProvider() === MAP_PROVIDER.GOOGLE;
};

export const getMapProviderName = () => {
  return isGoogleMapsEnabled() ? 'Google Maps' : 'OpenStreetMap';
};

// Configuration for different map providers
export const MAP_CONFIG = {
  [MAP_PROVIDER.GOOGLE]: {
    name: 'Google Maps',
    defaultCenter: { lat: 52.2297, lng: 21.0122 },
    defaultZoom: 13,
    tileAttribution: '&copy; Google Maps',
    features: {
      directions: true,
      places: true,
      streetView: true,
      traffic: true,
      satelliteView: true
    }
  },
  [MAP_PROVIDER.LEAFLET]: {
    name: 'OpenStreetMap',
    defaultCenter: [52.2297, 21.0122],
    defaultZoom: 13,
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    features: {
      directions: true,
      places: false,
      streetView: false,
      traffic: false,
      satelliteView: false
    }
  }
};

export const getCurrentMapConfig = () => {
  return MAP_CONFIG[getCurrentMapProvider()];
};

// Service imports based on provider
export const getRoutingService = async () => {
  if (isGoogleMapsEnabled()) {
    const service = await import('../services/googleMapsService');
    return service;
  } else {
    const service = await import('../services/routingService');
    return service;
  }
};

export const getMapComponent = async () => {
  if (isGoogleMapsEnabled()) {
    const component = await import('../components/GoogleMapComponent');
    return component.default;
  } else {
    const component = await import('../components/MapComponent');
    return component.default;
  }
};

// Helper function to log current configuration
export const logMapConfiguration = () => {
  const provider = getCurrentMapProvider();
  const config = getCurrentMapConfig();
  
  console.log('🗺️ Map Runner v2 - Map Configuration:', {
    provider: provider,
    name: config.name,
    features: config.features,
    hasApiKey: hasGoogleMapsKey,
    envUseGoogle: useGoogleMaps,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'
  });
  
  return { provider, config, hasApiKey: hasGoogleMapsKey };
};
