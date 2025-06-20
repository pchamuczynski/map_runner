/**
 * Simple OpenStreetMap integration using OSRM
 */

// Calculate route using OSRM
export const calculateRoute = async (points) => {
  console.log('Calculating route with OSRM for:', points);
  
  if (points.length !== 2) {
    throw new Error('Only start and end points supported for now');
  }

  const [start, end] = points;

  // Geocode addresses to coordinates if needed
  const startCoords = typeof start === 'string' ? await geocode(start) : start;
  const endCoords = typeof end === 'string' ? await geocode(end) : end;

  // Use OSRM for routing
  const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?overview=full&geometries=geojson`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== 'Ok') {
    throw new Error(`OSRM routing failed: ${data.code}`);
  }

  const route = data.routes[0];
  const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert to [lat, lng]

  return {
    coordinates,
    distance: route.distance, // meters
    duration: route.duration, // seconds
    provider: 'osrm'
  };
};

// Simple geocoding using Nominatim
const geocode = async (address) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (!data.length) {
    throw new Error(`Geocoding failed for: ${address}`);
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
};

// Format distance for display
export const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
};

// Format duration for display
export const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

// Search for places with autocomplete using Nominatim
export const searchPlaces = async (query) => {
  if (!query || query.length < 3) return [];
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=en,cs,de,fr,es,it,pl,ru`;
    
    const response = await fetch(url);
    const data = await response.json();

    return data.map(item => ({
      id: item.place_id,
      description: item.display_name,
      main_text: item.name || item.display_name.split(',')[0],
      secondary_text: item.display_name.split(',').slice(1).join(',').trim()
    }));
  } catch (error) {
    console.error('Place search failed:', error);
    return [];
  }
};
