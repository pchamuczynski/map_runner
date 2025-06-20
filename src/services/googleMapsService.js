import { Loader } from '@googlemaps/js-api-loader';

// Configuration for Google Maps
const GOOGLE_MAPS_CONFIG = {
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '', // You'll need to add this to your .env file
  version: 'weekly',
  libraries: ['places', 'geometry'] // Removed 'directions' as it's part of core API
};

let googleMapsLoader = null;
let isGoogleMapsLoaded = false;

/**
 * Initialize Google Maps API
 */
export const initializeGoogleMaps = async () => {
  if (isGoogleMapsLoaded) {
    return window.google;
  }

  if (!GOOGLE_MAPS_CONFIG.apiKey) {
    throw new Error('Google Maps API key is required. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.');
  }

  try {
    if (!googleMapsLoader) {
      googleMapsLoader = new Loader(GOOGLE_MAPS_CONFIG);
    }

    await googleMapsLoader.load();
    isGoogleMapsLoaded = true;
    console.log('Google Maps API loaded successfully');
    return window.google;
  } catch (error) {
    console.error('Error loading Google Maps API:', error);
    throw error;
  }
};

/**
 * Geocode an address using Google Places API
 */
export const geocodeAddress = async (address) => {
  try {
    const google = await initializeGoogleMaps();
    const geocoder = new google.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const result = results[0];
          const location = result.geometry.location;
          
          resolve({
            lat: location.lat(),
            lon: location.lng(),
            display_name: result.formatted_address,
            place_id: result.place_id
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

/**
 * Reverse geocode coordinates using Google Maps API
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const google = await initializeGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    const latlng = new google.maps.LatLng(lat, lng);

    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const result = results[0];
          
          resolve({
            coordinates: [lat, lng],
            display_name: result.formatted_address,
            lat: lat,
            lon: lng,
            place_id: result.place_id
          });
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
};

/**
 * Calculate route using Google Directions API
 */
export const calculateRoute = async (points, options = {}) => {
  try {
    console.log('🗺️ Google Maps - Starting route calculation');
    console.log('📍 Input points:', points);
    console.log('⚙️ Options:', options);
    
    const google = await initializeGoogleMaps();
    const directionsService = new google.maps.DirectionsService();

    // Convert addresses to coordinates if needed
    const coordinates = [];
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      console.log(`📍 Processing point ${i + 1}/${points.length}:`, point);
      
      if (typeof point === 'string') {
        console.log('🔍 Geocoding address:', point);
        try {
          const coords = await geocodeAddress(point);
          console.log('✅ Geocoded successfully:', coords);
          coordinates.push({ lat: coords.lat, lng: coords.lon });
        } catch (error) {
          console.error('❌ Geocoding failed for:', point, error);
          throw new Error(`Failed to geocode address: ${point} - ${error.message}`);
        }
      } else if (point.lat && point.lon) {
        coordinates.push({ lat: point.lat, lng: point.lon });
      } else if (point.lat && point.lng) {
        coordinates.push({ lat: point.lat, lng: point.lng });
      } else if (Array.isArray(point)) {
        coordinates.push({ lat: point[0], lng: point[1] });
      } else {
        console.error('❌ Invalid point format:', point);
        throw new Error(`Invalid point format: ${JSON.stringify(point)}`);
      }
    }

    if (coordinates.length < 2) {
      throw new Error('At least 2 points are required for route calculation');
    }

    console.log('✅ All points processed successfully');
    console.log('📊 Final coordinates:', coordinates);

    if (coordinates.length < 2) {
      throw new Error('At least 2 points are required for route calculation');
    }

    // Prepare waypoints (all points except start and end)
    const waypoints = coordinates.slice(1, -1).map((coord, index) => {
      console.log(`🚩 Creating waypoint ${index + 1}:`, coord);
      return {
        location: new google.maps.LatLng(coord.lat, coord.lng),
        stopover: true
      };
    });

    const request = {
      origin: new google.maps.LatLng(coordinates[0].lat, coordinates[0].lng),
      destination: new google.maps.LatLng(coordinates[coordinates.length - 1].lat, coordinates[coordinates.length - 1].lng),
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false, // Keep the order as specified
      avoidHighways: false,
      avoidTolls: false
    };

    console.log('🚀 Sending Google Maps Directions request:', {
      origin: `${coordinates[0].lat}, ${coordinates[0].lng}`,
      destination: `${coordinates[coordinates.length - 1].lat}, ${coordinates[coordinates.length - 1].lng}`,
      waypointCount: waypoints.length,
      travelMode: request.travelMode
    });

    return new Promise((resolve, reject) => {
      directionsService.route(request, (result, status) => {
        console.log('📨 Google Maps Directions API response:', { status, result });
        
        if (status === 'OK' && result) {
          console.log('✅ Google Maps route calculation successful');
          
          const route = result.routes[0];
          console.log('📊 Route details:', {
            legs: route.legs.length,
            overviewPathLength: route.overview_path?.length || 0,
            bounds: route.bounds,
            copyrights: route.copyrights
          });
          
          // Extract route coordinates from the result
          const routeCoordinates = [];
          
          // Use overview_path for the main route line
          if (route.overview_path && route.overview_path.length > 0) {
            console.log('📍 Using overview_path for route coordinates');
            route.overview_path.forEach(point => {
              routeCoordinates.push([point.lat(), point.lng()]);
            });
          } else {
            console.log('📍 Using legs/steps for route coordinates (fallback)');
            // Fallback: extract from legs and steps
            const legs = route.legs;
            legs.forEach(leg => {
              leg.steps.forEach(step => {
                // Get the start point of each step
                const startLat = step.start_location.lat();
                const startLng = step.start_location.lng();
                routeCoordinates.push([startLat, startLng]);
                
                // Get the end point of the last step in the last leg
                if (leg === legs[legs.length - 1] && step === leg.steps[leg.steps.length - 1]) {
                  const endLat = step.end_location.lat();
                  const endLng = step.end_location.lng();
                  routeCoordinates.push([endLat, endLng]);
                }
              });
            });
          }

          // Calculate total distance and duration
          let totalDistance = 0;
          let totalDuration = 0;
          
          const legs = route.legs;
          legs.forEach((leg, index) => {
            console.log(`📏 Leg ${index + 1}: ${leg.distance?.text || 'unknown'}, ${leg.duration?.text || 'unknown'}`);
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
          });

          console.log('📊 Route totals:', {
            coordinateCount: routeCoordinates.length,
            distance: `${totalDistance}m (${(totalDistance/1000).toFixed(1)}km)`,
            duration: `${totalDuration}s (${Math.round(totalDuration/60)}min)`
          });

          // Apply simplification if route is too complex
          let simplifiedCoordinates = routeCoordinates;
          const maxPoints = options.maxPoints || 1000;
          let simplificationApplied = false;

          if (routeCoordinates.length > maxPoints) {
            console.log(`⚡ Simplifying route - ${routeCoordinates.length} > ${maxPoints} points`);
            simplifiedCoordinates = simplifyPolyline(routeCoordinates, 0.0001);
            simplificationApplied = true;
            console.log(`✅ Simplified to ${simplifiedCoordinates.length} points`);
          }

          const finalResult = {
            distance: totalDistance, // in meters
            duration: totalDuration, // in seconds
            coordinates: simplifiedCoordinates,
            originalCoordinateCount: routeCoordinates.length,
            simplificationApplied: simplificationApplied,
            fallback: false,
            provider: 'google',
            directionsResult: result // Keep the full result for advanced usage
          };

          console.log('🎉 Google Maps route calculation complete:', {
            coordinateCount: finalResult.coordinates.length,
            distance: finalResult.distance,
            provider: finalResult.provider
          });

          resolve(finalResult);
        } else {
          console.error('❌ Google Maps route calculation failed:', { 
            status, 
            result: result || 'null',
            possibleReasons: status === 'ZERO_RESULTS' 
              ? 'No route could be found between the specified locations'
              : status === 'OVER_QUERY_LIMIT'
              ? 'API quota exceeded'
              : status === 'REQUEST_DENIED'
              ? 'API key invalid or API not enabled'
              : status === 'INVALID_REQUEST'
              ? 'Invalid request parameters'
              : 'Unknown error'
          });
          reject(new Error(`Google Maps routing failed: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error('Google Maps route calculation error:', error);
    // Fallback to straight-line calculation
    console.log('Falling back to straight line calculation');
    return calculateStraightLineRoute(points);
  }
};

/**
 * Simplify polyline to reduce number of points (Douglas-Peucker algorithm)
 */
const simplifyPolyline = (points, tolerance = 0.0001) => {
  if (points.length <= 2) return points;
  
  // Find the point with the maximum distance from line between start and end
  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftPoints = simplifyPolyline(points.slice(0, maxIndex + 1), tolerance);
    const rightPoints = simplifyPolyline(points.slice(maxIndex), tolerance);
    
    // Combine results, removing duplicate middle point
    return leftPoints.slice(0, -1).concat(rightPoints);
  } else {
    // If no point is far enough, return just start and end
    return [start, end];
  }
};

/**
 * Calculate perpendicular distance from point to line
 */
const perpendicularDistance = (point, lineStart, lineEnd) => {
  const [x0, y0] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const A = x2 - x1;
  const B = y2 - y1;
  const C = x1 - x0;
  const D = y1 - y0;
  
  const dot = A * C + B * D;
  const lenSq = A * A + B * B;
  
  if (lenSq === 0) {
    // Line is a point
    return Math.sqrt(C * C + D * D);
  }
  
  const param = dot / lenSq;
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * A;
    yy = y1 + param * B;
  }
  
  const dx = x0 - xx;
  const dy = y0 - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Fallback: Calculate straight-line distance between points
 */
const calculateStraightLineRoute = async (points) => {
  try {
    console.log('Using straight-line fallback for points:', points);
    const coordinates = [];
    
    for (const point of points) {
      if (typeof point === 'string') {
        const coords = await geocodeAddress(point);
        coordinates.push([coords.lat, coords.lon]);
      } else if (point.lat && point.lon) {
        coordinates.push([point.lat, point.lon]);
      } else if (point.lat && point.lng) {
        coordinates.push([point.lat, point.lng]);
      } else if (Array.isArray(point)) {
        coordinates.push(point);
      }
    }

    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const distance = calculateHaversineDistance(
        coordinates[i][0], coordinates[i][1],
        coordinates[i + 1][0], coordinates[i + 1][1]
      );
      totalDistance += distance;
    }

    console.log('Fallback calculation complete. Total distance:', totalDistance, 'km');

    return {
      distance: totalDistance * 1000, // convert to meters
      duration: (totalDistance * 1000) / 1.4, // rough walking speed estimate (1.4 m/s)
      coordinates: coordinates,
      fallback: true,
      provider: 'fallback'
    };
  } catch (error) {
    console.error('Fallback route calculation error:', error);
    return {
      distance: 0,
      duration: 0,
      coordinates: [],
      fallback: true,
      error: error.message,
      provider: 'fallback'
    };
  }
};

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Format distance for display
 */
export const formatDistance = (distanceInMeters) => {
  if (distanceInMeters >= 1000) {
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(distanceInMeters)}m`;
};

/**
 * Format duration for display
 */
export const formatDuration = (durationInSeconds) => {
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Search for places using Google Places API
 */
export const searchPlaces = async (query, options = {}) => {
  try {
    const google = await initializeGoogleMaps();
    const service = new google.maps.places.PlacesService(document.createElement('div'));

    const request = {
      query: query,
      fields: ['name', 'formatted_address', 'geometry', 'place_id'],
      ...options
    };

    return new Promise((resolve, reject) => {
      service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const places = results.map(place => ({
            name: place.name,
            display_name: place.formatted_address,
            lat: place.geometry.location.lat(),
            lon: place.geometry.location.lng(),
            place_id: place.place_id
          }));
          resolve(places);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  } catch (error) {
    console.error('Places search error:', error);
    throw error;
  }
};
