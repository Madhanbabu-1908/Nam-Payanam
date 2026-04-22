import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../config/api';
import { MapPin } from 'lucide-react';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark-matter';

export default function PublicTrackPage() {
  const { tripId } = useParams();
  const mapRef = useRef<any>(null);
  
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [startLoc, setStartLoc] = useState<{ coords: [number, number], name: string } | null>(null);
  const [destLoc, setDestLoc] = useState<{ coords: [number, number], name: string } | null>(null);

  useEffect(() => {
    if (!tripId) return;
    const fetchData = async () => {
      try {
        const [tripRes, liveRes] = await Promise.all([
          api.get(`/trips/${tripId}`),
          api.get(`/tracking/live/${tripId}`)
        ]);

        if (tripRes.data.success) {
          const t = tripRes.data.data;
          if (t.start_lat && t.start_lng) setStartLoc({ coords: [t.start_lng, t.start_lat], name: t.start_location || 'Start' });
          if (t.destination_lat && t.destination_lng) setDestLoc({ coords: [t.destination_lng, t.destination_lat], name: t.destination || 'Destination' });
          
          if (t.route_data && t.route_data.length > 1) {
            // ✅ Completed the coordinate mapping here
            const coords = t.route_data.map((c: [number, number]) => [c[1], c[0]]);
            setRouteGeoJSON({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });
          }
        }

        if (liveRes.data.success && liveRes.data.data?.currentLocation) {
          const { latitude, longitude } = liveRes.data.data.currentLocation;
          setCurrentLocation([longitude, latitude]);
        }
      } catch (e) { 
        console.error("Error fetching tracking ", e); 
      }
    };

    fetchData();    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  useEffect(() => {
    if (mapRef.current && startLoc && destLoc) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(startLoc.coords);
      bounds.extend(destLoc.coords);
      mapRef.current.fitBounds(bounds, { padding: 50, duration: 1500 });
    }
  }, [startLoc, destLoc]);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 78.47, latitude: 12.05, zoom: 6 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        mapLib={maplibregl as any} // ✅ Type cast to fix MapLib error
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            {/* ✅ Fixed: Use 'line-cap' (kebab-case) for MapLibre v4 types */}
            <Layer id="route-line" type="line" paint={{ 'line-color': '#4b5563', 'line-width': 4, 'line-opacity': 0.6, 'line-cap': 'round' }} />
          </Source>
        )}

        {startLoc && (
          <Marker longitude={startLoc.coords[0]} latitude={startLoc.coords[1]} anchor="bottom">
            <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
              <MapPin size={18}/>
            </div>
          </Marker>
        )}

        {destLoc && (
          <Marker longitude={destLoc.coords[0]} latitude={destLoc.coords[1]} anchor="bottom">
            <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
              <MapPin size={18}/>
            </div>
          </Marker>
        )}

        {currentLocation && (
          <Marker longitude={currentLocation[0]} latitude={currentLocation[1]} anchor="center">            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-40"></div>
              <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-xl border-2 border-indigo-500 flex items-center justify-center">
                <span className="text-lg">🚌</span>
              </div>
            </div>
          </Marker>
        )}
      </Map>
      
      <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
        <span className="font-bold text-sm text-slate-800 dark:text-white">Public Tracking</span>
      </div>
    </div>
  );
}