/**
 * Simple Google Maps integration for route calculation
 */

let google = null;

// Initialize Google Maps API
export const initGoogleMaps = async () => {
  if (google) return google;
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not found');
  }

  // Load Google Maps API
  return new Promise((resolve, reject) => {
    if (window.google) {
      google = window.google;
      resolve(google);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      google = window.google;
      resolve(google);
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
};

// Calculate route between points
export const calculateRoute = async (points) => {
  console.log('Calculating route for:', points);
  
  const google = await initGoogleMaps();
  const directionsService = new google.maps.DirectionsService();

  // Simple case: just start and end
  if (points.length !== 2) {
    throw new Error('Only start and end points supported for now');
  }

  const [start, end] = points;

  return new Promise((resolve, reject) => {
    directionsService.route({
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK') {
        const route = result.routes[0];
        const leg = route.legs[0];
        
        // Extract coordinates from overview path
        const coordinates = route.overview_path.map(point => [
          point.lat(), 
          point.lng()
        ]);

        resolve({
          coordinates,
          distance: leg.distance.value, // meters
          duration: leg.duration.value, // seconds
          provider: 'google'
        });
      } else {
        reject(new Error(`Route calculation failed: ${status}`));
      }
    });
  });
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

// Search for places with autocomplete
export const searchPlaces = async (query) => {
  if (!query || query.length < 3) return [];
  
  const google = await initGoogleMaps();
  const service = new google.maps.places.AutocompleteService();

  return new Promise((resolve) => {
    service.getPlacePredictions({
      input: query,
      types: ['geocode'], // Focus on geographical locations
      language: 'en' // Can be made configurable
    }, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        const suggestions = predictions.map(prediction => ({
          id: prediction.place_id,
          description: prediction.description,
          main_text: prediction.structured_formatting.main_text,
          secondary_text: prediction.structured_formatting.secondary_text
        }));
        resolve(suggestions);
      } else {
        resolve([]);
      }
    });
  });
};
