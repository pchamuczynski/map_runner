import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from '../../config/mapServices';
import { DEFAULT_CENTER, DEFAULT_ZOOM, ROUTE_LINE_STYLE } from './mapDefaults';

const toLeafletIcon = ({ url, size }) => L.icon({ iconUrl: url, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

/** Renders a route with Leaflet + OpenStreetMap tiles. Map objects are created once and updated in place. */
const LeafletRouteMap = ({ path, endpoints, progressMarker }) => {
  const containerRef = useRef(null);
  const [scene, setScene] = useState(null);

  useEffect(() => {
    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: TILE_MAX_ZOOM }).addTo(map);
    const polyline = L.polyline([], ROUTE_LINE_STYLE).addTo(map);
    const markers = L.layerGroup().addTo(map);
    setScene({ map, polyline, markers });
    return () => map.remove();
  }, []);

  useEffect(() => {
    if (!scene || !containerRef.current) return undefined;
    const observer = new ResizeObserver(() => scene.map.invalidateSize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [scene]);

  useEffect(() => {
    if (!scene) return;
    scene.polyline.setLatLngs(path ?? []);
    if (path) scene.map.fitBounds(scene.polyline.getBounds(), { padding: [20, 20] });
  }, [scene, path]);

  useEffect(() => {
    if (!scene) return;
    scene.markers.clearLayers();
    const place = (spec, zIndexOffset = 0) => {
      if (!spec) return;
      L.marker(spec.position, { icon: toLeafletIcon(spec.icon), title: spec.title, keyboard: false, zIndexOffset }).addTo(
        scene.markers,
      );
    };
    place(endpoints?.start);
    place(endpoints?.finish);
    place(progressMarker, 1000);
  }, [scene, endpoints, progressMarker]);

  return (
    <div className="route-map">
      <div ref={containerRef} className="map-canvas" />
    </div>
  );
};

export default LeafletRouteMap;
