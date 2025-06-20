# Route Polyline Analysis - Why Routes Don't Stick Perfectly to Roads

## Investigation Summary

After examining the routing implementation in Map Runner v2, I can explain why the route polylines don't always stick perfectly to public roads when zoomed in.

## Root Cause Analysis

### 1. **Routing Service Limitations**

#### Google Maps Routing (simpleGoogleMaps.js)
- Uses `route.overview_path` which is a **simplified/generalized** version of the actual route
- The overview path contains fewer coordinate points than the detailed step-by-step directions
- Google Maps provides this simplified path for performance reasons when displaying route overviews
- **Issue**: At high zoom levels, the straight lines between sparse coordinate points become visible and don't follow road curves precisely

#### OSRM Routing (simpleOSRM.js)
- Uses `overview=full&geometries=geojson` parameter
- While this requests the full geometry, OSRM still provides a **generalized polyline** for performance
- The level of detail depends on the OSRM server configuration and the route distance
- **Issue**: For long-distance routes, OSRM automatically reduces coordinate density to keep response sizes manageable

### 2. **Coordinate Density vs Performance Trade-off**

Both routing services balance:
- **Performance**: Fewer coordinates = faster API responses and rendering
- **Accuracy**: More coordinates = better road adherence but larger data size
- **Scale**: Long routes (hundreds of km) get more generalization than short local routes

### 3. **Visualization Method**

The current implementation:
```javascript
// Google Maps
const coordinates = route.overview_path.map(point => [point.lat(), point.lng()]);

// OSRM  
const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
```

Both create polylines by connecting these coordinates with **straight lines**, which become apparent when:
- Zooming in on curved sections of roads
- Viewing routes through mountainous or winding terrain
- Examining urban areas with complex street layouts

## Solutions and Improvements

### Option 1: Use Detailed Step-by-Step Directions (Google Maps)
```javascript
// Instead of overview_path, use detailed steps
const coordinates = [];
result.routes[0].legs.forEach(leg => {
  leg.steps.forEach(step => {
    step.path.forEach(point => {
      coordinates.push([point.lat(), point.lng()]);
    });
  });
});
```

**Pros**: Much more accurate road following
**Cons**: Significantly more API calls and data transfer

### Option 2: Request Higher Precision from OSRM
```javascript
// Use different OSRM parameters for higher precision
const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?overview=full&geometries=geojson&steps=true`;
```

**Pros**: More detailed route geometry
**Cons**: Larger response sizes, potential API rate limiting

### Option 3: Hybrid Approach - Scale-Aware Detail
```javascript
// Request different detail levels based on route length
const getDetailLevel = (distance) => {
  if (distance < 10000) return 'full'; // < 10km: full detail
  if (distance < 100000) return 'simplified'; // < 100km: medium detail  
  return 'false'; // > 100km: overview only
};
```

### Option 4: Client-Side Route Smoothing
- Apply mathematical smoothing algorithms to interpolate between route points
- Use Bezier curves or spline interpolation to create smoother transitions
- **Note**: This can create paths that don't follow actual roads

## Current Behavior is Expected

The current implementation follows **industry standard practices**:

1. **Google Maps Web**: Uses the same `overview_path` approach for route previews
2. **Navigation Apps**: Switch to detailed step-by-step only during active navigation
3. **Mapping Services**: Prioritize overview performance over pixel-perfect accuracy for route planning

## Recommendation

**Keep the current implementation** because:

1. **Performance**: Fast loading and smooth map interaction
2. **API Efficiency**: Reduces API costs and rate limiting
3. **User Experience**: Route overview is accurate enough for planning purposes
4. **Industry Standard**: Matches behavior of major mapping applications

The polyline accuracy is **appropriate for the use case** - users need to see their overall progress and route shape, not precise turn-by-turn navigation details.

## When This Matters Most

The generalization is most noticeable with:
- **Long routes** (100+ km): More generalization applied
- **Mountainous terrain**: Winding roads get simplified
- **High zoom levels**: Straight-line segments become apparent
- **Complex urban areas**: Highway interchanges and curves

For **local/short routes** (< 10km), the accuracy is typically excellent even at high zoom levels.

## Technical Note

This is a **limitation of routing services**, not a bug in the implementation. All major mapping platforms face this same trade-off between performance and precision.
