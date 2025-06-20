import L from 'leaflet';

/**
 * Geocode an address to get coordinates
 */
export const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    
    throw new Error('Location not found');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
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
 * Calculate route between multiple points using OSRM directly
 */
export const calculateRoute = async (points, options = {}) => {
  try {
    console.log('Calculating route for points:', points);
    
    // Convert addresses to coordinates if needed
    const coordinates = [];
    
    for (const point of points) {
      if (typeof point === 'string') {
        console.log('Geocoding address:', point);
        const coords = await geocodeAddress(point);
        coordinates.push([coords.lat, coords.lon]);
      } else if (point.lat && point.lon) {
        coordinates.push([point.lat, point.lon]);
      } else if (Array.isArray(point)) {
        coordinates.push([point[0], point[1]]); // Ensure [lat, lon] format
      }
    }

    if (coordinates.length < 2) {
      throw new Error('At least 2 points are required for route calculation');
    }

    console.log('Using coordinates for routing:', coordinates);

    // Use OSRM API for routing (free and reliable)
    const coordinatesString = coordinates.map(coord => `${coord[1]},${coord[0]}`).join(';'); // lon,lat format for OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;
    
    console.log('OSRM API URL:', osrmUrl);

    const response = await fetch(osrmUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OSRM API error:', response.status, errorText);
      throw new Error(`Routing service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OSRM API response data size:', JSON.stringify(data).length);
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const geometry = route.geometry;
      
      // Extract coordinates from GeoJSON
      let routeCoordinates = [];
      if (geometry && geometry.coordinates) {
        routeCoordinates = geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert [lon, lat] to [lat, lon]
      }
      
      console.log('Raw route coordinates count:', routeCoordinates.length);
      
      // Simplify route if it has too many points (for performance)
      const maxPoints = options.maxPoints || 1000;
      let simplifiedCoordinates = routeCoordinates;
      
      if (routeCoordinates.length > maxPoints) {
        console.log('Simplifying route - too many points:', routeCoordinates.length);
        
        // Use progressive simplification for very long routes
        let tolerance = 0.0001;
        while (simplifiedCoordinates.length > maxPoints && tolerance < 0.01) {
          simplifiedCoordinates = simplifyPolyline(routeCoordinates, tolerance);
          tolerance *= 2;
        }
        
        console.log('Simplified route coordinates count:', simplifiedCoordinates.length);
      }
      
      return {
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
        geometry: geometry,
        coordinates: simplifiedCoordinates,
        originalCoordinateCount: routeCoordinates.length,
        simplificationApplied: simplifiedCoordinates.length < routeCoordinates.length,
        fallback: false
      };
    }

    throw new Error('No route found from OSRM');
  } catch (error) {
    console.error('Route calculation error:', error);
    // Fallback to simple distance calculation
    console.log('Falling back to straight line calculation');
    return calculateStraightLineRoute(points);
  }
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
      geometry: null,
      coordinates: coordinates,
      fallback: true
    };
  } catch (error) {
    console.error('Fallback route calculation error:', error);
    return {
      distance: 0,
      duration: 0,
      geometry: null,
      coordinates: [],
      fallback: true,
      error: error.message
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
 * Decode polyline string to coordinates
 */
const decodePolyline = (encoded) => {
  if (!encoded) return [];
  
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
};

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
