# Google Maps Integration Guide

## Overview

Map Runner v2 now supports both **Google Maps** and **OpenStreetMap** (via Leaflet) as map providers. By default, the application uses OpenStreetMap, but you can easily switch to Google Maps by following this guide.

## Quick Setup

### Option 1: Use OpenStreetMap (Default - No API Key Required)
The application works out-of-the-box with OpenStreetMap. No additional configuration needed.

### Option 2: Switch to Google Maps (Requires API Key)

1. **Get a Google Maps API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API
     - Directions API
     - Geocoding API

2. **Configure the API Key**:
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env and add your API key
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   VITE_USE_GOOGLE_MAPS=true
   ```

3. **Restart the Development Server**:
   ```bash
   npm run dev
   ```

## Environment Configuration

### .env File Structure
```bash
# Google Maps Configuration
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_USE_GOOGLE_MAPS=true

# Optional: Keep commented out to use OpenStreetMap
# VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
# VITE_USE_GOOGLE_MAPS=true
```

### Security Best Practices

1. **Never commit your API key** to version control
2. **Restrict your API key** in Google Cloud Console:
   - Set HTTP referrer restrictions
   - Limit to specific APIs only
   - Monitor usage and set quotas

3. **Use environment-specific keys**:
   - Development: Restricted to localhost
   - Production: Restricted to your domain

## Features Comparison

| Feature | OpenStreetMap | Google Maps |
|---------|---------------|-------------|
| **Basic Maps** | ✅ Free | ✅ Paid |
| **Route Calculation** | ✅ Via OSRM | ✅ Via Google Directions |
| **Geocoding** | ✅ Via Nominatim | ✅ Via Google Geocoding |
| **Places Search** | ❌ Limited | ✅ Advanced |
| **Street View** | ❌ No | ✅ Yes |
| **Traffic Data** | ❌ No | ✅ Yes |
| **Satellite View** | ❌ No | ✅ Yes |
| **Offline Support** | ❌ No | ❌ No |
| **API Limits** | Free (rate limited) | Paid (quota based) |

## Technical Implementation

### Automatic Provider Detection
The application automatically detects which map provider to use based on your environment configuration:

```javascript
// utils/mapConfig.js
const useGoogleMaps = import.meta.env.VITE_USE_GOOGLE_MAPS === 'true';
const hasGoogleMapsKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const getCurrentMapProvider = () => {
  if (useGoogleMaps && hasGoogleMapsKey) {
    return MAP_PROVIDER.GOOGLE;
  }
  return MAP_PROVIDER.LEAFLET;
};
```

### Dynamic Component Loading
The `MapWrapper` component dynamically loads the appropriate map implementation:

```javascript
// components/MapWrapper.jsx
if (isGoogleMapsEnabled()) {
  const GoogleMapComponent = (await import('../components/GoogleMapComponent')).default;
  component = GoogleMapComponent;
} else {
  const LeafletMapComponent = (await import('../components/MapComponent')).default;
  component = LeafletMapComponent;
}
```

### Service Layer Abstraction
Both map providers use a unified service interface:

```javascript
// services/googleMapsService.js & services/routingService.js
export const calculateRoute = async (points, options = {}) => { /* ... */ };
export const geocodeAddress = async (address) => { /* ... */ };
export const formatDistance = (distanceInMeters) => { /* ... */ };
export const formatDuration = (durationInSeconds) => { /* ... */ };
```

## Google Maps API Configuration

### Required APIs
Make sure these APIs are enabled in your Google Cloud Console:

1. **Maps JavaScript API** - For displaying maps
2. **Places API** - For location search and autocomplete
3. **Directions API** - For route calculation
4. **Geocoding API** - For address to coordinates conversion

### API Key Restrictions
For security, configure these restrictions in Google Cloud Console:

1. **Application Restrictions**:
   ```
   HTTP referrers (web sites)
   - http://localhost:*
   - https://yourdomain.com/*
   ```

2. **API Restrictions**:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API

### Quota Management
Monitor your usage and set appropriate quotas:

- **Maps JavaScript API**: ~$7 per 1000 loads
- **Directions API**: ~$5 per 1000 requests
- **Places API**: ~$17 per 1000 requests
- **Geocoding API**: ~$5 per 1000 requests

## Troubleshooting

### Common Issues

1. **"Google Maps API key is required" Error**:
   - Ensure `VITE_GOOGLE_MAPS_API_KEY` is set in your `.env` file
   - Restart the development server after adding the key

2. **Map Not Loading**:
   - Check browser console for API key errors
   - Verify API key restrictions in Google Cloud Console
   - Ensure required APIs are enabled

3. **Route Calculation Failing**:
   - Check Directions API is enabled
   - Verify API key has Directions API access
   - Check API quota limits

4. **Geocoding Not Working**:
   - Ensure Geocoding API is enabled
   - Check API key restrictions
   - Verify locations are valid

### Debug Mode
Enable debug logging by adding to your `.env`:
```bash
VITE_DEBUG=true
```

This will show detailed logs about:
- Map provider selection
- API calls and responses
- Route calculation details
- Performance metrics

## Performance Considerations

### Google Maps Advantages
- **Better Route Quality**: More accurate road-based routing
- **Real-time Data**: Traffic-aware routing
- **Advanced Features**: Street View, Places API integration
- **Reliability**: Enterprise-grade infrastructure

### OpenStreetMap Advantages
- **No Cost**: Completely free to use
- **No Quotas**: No API limits (within reasonable usage)
- **Privacy**: No tracking or data collection
- **Open Source**: Community-driven development

### Performance Optimizations
Both providers include the same performance optimizations:
- Route simplification for large routes
- Debounced API calls
- Memory management
- Progressive loading

## Migration Guide

### From OpenStreetMap to Google Maps
1. Obtain Google Maps API key
2. Update `.env` file with your key
3. Set `VITE_USE_GOOGLE_MAPS=true`
4. Restart development server
5. Test route creation and visualization

### From Google Maps to OpenStreetMap
1. Comment out Google Maps configuration in `.env`:
   ```bash
   # VITE_GOOGLE_MAPS_API_KEY=your_key_here
   # VITE_USE_GOOGLE_MAPS=true
   ```
2. Restart development server
3. Application will automatically use OpenStreetMap

## Development Tips

### Testing Both Providers
You can quickly switch between providers during development:

```bash
# Test with OpenStreetMap
export VITE_USE_GOOGLE_MAPS=false
npm run dev

# Test with Google Maps
export VITE_USE_GOOGLE_MAPS=true
npm run dev
```

### Local Development
For local development, use these API key restrictions:
- HTTP referrers: `http://localhost:*`
- APIs: Only the ones you need

### Production Deployment
For production:
1. Use a separate API key
2. Restrict to your production domain
3. Set appropriate quotas
4. Monitor usage and costs

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Google Cloud Console configuration
3. Test with a simple route first
4. Check API quota usage
5. Review the troubleshooting section above

For more help, check the Google Maps Platform documentation at https://developers.google.com/maps/documentation
