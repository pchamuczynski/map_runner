/**
 * Performance utilities for route optimization and monitoring
 */

/**
 * Measure performance of a function
 */
export const measurePerformance = async (name, fn) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.log(`${name} took ${(end - start).toFixed(2)}ms`);
  return result;
};

/**
 * Memory usage tracker
 */
export const trackMemoryUsage = (label) => {
  if (performance.memory) {
    console.log(`${label} - Memory Usage:`, {
      used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
    });
  }
};

/**
 * Debounce function to prevent excessive calls
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Throttle function to limit call frequency
 */
export const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(null, args);
    }
  };
};

/**
 * Check if a route is considered "large" and may need optimization
 */
export const isLargeRoute = (coordinates) => {
  return coordinates && coordinates.length > 1000;
};

/**
 * Get performance recommendations based on route size
 */
export const getPerformanceRecommendations = (routeData) => {
  const recommendations = [];
  
  if (!routeData || !routeData.coordinates) {
    return recommendations;
  }
  
  const coordinateCount = routeData.coordinates.length;
  
  if (coordinateCount > 2000) {
    recommendations.push({
      type: 'warning',
      message: 'Very large route detected. Consider breaking into segments.',
      details: `${coordinateCount.toLocaleString()} coordinate points`
    });
  } else if (coordinateCount > 1000) {
    recommendations.push({
      type: 'info',
      message: 'Large route - automatic optimization applied.',
      details: `${coordinateCount.toLocaleString()} coordinate points`
    });
  }
  
  if (routeData.fallback) {
    recommendations.push({
      type: 'warning',
      message: 'Using straight-line calculation.',
      details: 'Routing service unavailable - distances may not be accurate.'
    });
  }
  
  if (routeData.simplificationApplied) {
    recommendations.push({
      type: 'success',
      message: 'Route optimized for performance.',
      details: `Simplified from ${routeData.originalCoordinateCount?.toLocaleString() || 'unknown'} to ${coordinateCount.toLocaleString()} points`
    });
  }
  
  return recommendations;
};

/**
 * Calculate estimated rendering time based on route complexity
 */
export const estimateRenderingTime = (coordinateCount) => {
  // Rough estimation based on typical performance
  // These are just estimates and will vary by device
  if (coordinateCount < 100) return 'Instant';
  if (coordinateCount < 500) return '< 100ms';
  if (coordinateCount < 1000) return '< 200ms';
  if (coordinateCount < 2000) return '< 500ms';
  return '> 500ms';
};

/**
 * Performance monitoring hook data
 */
export const createPerformanceMonitor = () => {
  const metrics = {
    routeCalculations: 0,
    totalCalculationTime: 0,
    averageCoordinateCount: 0,
    largeRouteCount: 0
  };
  
  return {
    recordRouteCalculation: (duration, coordinateCount) => {
      metrics.routeCalculations++;
      metrics.totalCalculationTime += duration;
      metrics.averageCoordinateCount = 
        (metrics.averageCoordinateCount * (metrics.routeCalculations - 1) + coordinateCount) / 
        metrics.routeCalculations;
      
      if (coordinateCount > 1000) {
        metrics.largeRouteCount++;
      }
    },
    
    getMetrics: () => ({
      ...metrics,
      averageCalculationTime: metrics.routeCalculations > 0 
        ? metrics.totalCalculationTime / metrics.routeCalculations 
        : 0,
      largeRoutePercentage: metrics.routeCalculations > 0 
        ? (metrics.largeRouteCount / metrics.routeCalculations) * 100 
        : 0
    }),
    
    reset: () => {
      Object.keys(metrics).forEach(key => {
        metrics[key] = 0;
      });
    }
  };
};
