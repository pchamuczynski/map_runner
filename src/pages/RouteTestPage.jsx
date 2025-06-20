import React, { useState, useEffect } from 'react';
import { getRoutingService } from '../utils/mapConfig';

const RouteTestPage = () => {
  const [routingService, setRoutingService] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadService = async () => {
      try {
        console.log('🔧 Loading routing service...');
        const service = await getRoutingService();
        setRoutingService(service);
        console.log('✅ Routing service loaded:', service);
      } catch (err) {
        console.error('❌ Failed to load routing service:', err);
        setError('Failed to load routing service');
      }
    };
    loadService();
  }, []);

  const testRoute = async () => {
    if (!routingService) {
      setError('Routing service not loaded');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Testing route calculation...');
      const testResult = await routingService.calculateRoute([
        'Warsaw, Poland',
        'Krakow, Poland'
      ]);
      
      console.log('✅ Route calculation result:', testResult);
      setResult(testResult);
    } catch (err) {
      console.error('❌ Route calculation failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Route Test Page</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', background: '#e3f2fd', borderRadius: '5px' }}>
        <strong>Instructions:</strong> Open browser Developer Tools (F12) to see detailed console logs.
        This page tests the route calculation service directly.
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testRoute} 
          disabled={!routingService || isLoading}
          style={{
            padding: '10px 20px',
            background: routingService ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: routingService ? 'pointer' : 'not-allowed'
          }}
        >
          {isLoading ? 'Calculating...' : 'Test Route (Warsaw → Krakow)'}
        </button>
        
        <a 
          href="/" 
          style={{ 
            marginLeft: '20px', 
            padding: '10px 20px', 
            background: '#6c757d', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px' 
          }}
        >
          ← Back to Main App
        </a>
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          background: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ 
          padding: '10px', 
          background: '#d4edda', 
          color: '#155724', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3>Route Calculation Success!</h3>
          <p><strong>Provider:</strong> {result.provider}</p>
          <p><strong>Distance:</strong> {result.distance}m ({(result.distance/1000).toFixed(1)}km)</p>
          <p><strong>Duration:</strong> {result.duration}s ({Math.round(result.duration/60)}min)</p>
          <p><strong>Coordinates:</strong> {result.coordinates?.length || 0} points</p>
          <p><strong>Fallback:</strong> {result.fallback ? 'Yes' : 'No'}</p>
          {result.simplificationApplied && (
            <p><strong>Simplified:</strong> Yes (from {result.originalCoordinateCount} points)</p>
          )}
          
          {result.coordinates && result.coordinates.length > 0 && (
            <details style={{ marginTop: '10px' }}>
              <summary>First 5 coordinates:</summary>
              <pre style={{ fontSize: '12px', background: '#f8f9fa', padding: '10px', borderRadius: '3px' }}>
                {JSON.stringify(result.coordinates.slice(0, 5), null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <div style={{ 
        padding: '10px', 
        background: '#f8f9fa', 
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <strong>Status:</strong> {routingService ? '✅ Routing service loaded' : '⏳ Loading routing service...'}
      </div>
    </div>
  );
};

export default RouteTestPage;
