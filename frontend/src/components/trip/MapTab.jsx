import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../ui/index.jsx';

export default function MapTab({ trip, days, progress }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);

  // Collect all stops with coordinates
  const allStops = [];
  days?.forEach(day => {
    day.stops?.forEach(stop => {
      if (stop.lat && stop.lng) {
        allStops.push({ ...stop, dayNumber: day.day_number, dayTitle: day.title });
      }
    });
  });

  // Fallback: geocode from stop names using Nominatim
  const [geocodedStops, setGeocodedStops] = useState([]);

  useEffect(() => {
    async function geocodeStops() {
      const stopsToGeocode = [];

      // Collect all unique location names
      const locations = new Set();
      if (trip?.start_location) locations.add({ name: trip.start_location, type: 'start' });
      if (trip?.end_location) locations.add({ name: trip.end_location, type: 'end' });
      trip?.stops?.forEach(s => locations.add({ name: s, type: 'stop' }));

      for (const loc of locations) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc.name + ', India')}&format=json&limit=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (data[0]) {
            stopsToGeocode.push({
              name: loc.name,
              type: loc.type,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            });
          }
        } catch (e) {
          console.error('Geocode error:', e);
        }
        await new Promise(r => setTimeout(r, 300)); // Rate limit Nominatim
      }
      setGeocodedStops(stopsToGeocode);
    }

    if (trip) geocodeStops();
  }, [trip?.id]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Init Leaflet map
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer);
    });

    const markers = [];
    const points = [];

    // Combine AI stops + geocoded stops
    const displayStops = allStops.length > 0 ? allStops : geocodedStops;

    displayStops.forEach((stop, i) => {
      const isStart = stop.type === 'start';
      const isEnd = stop.type === 'end';
      const isReached = i < (progress?.current_stop_index || 0);

      const iconHtml = `
        <div style="
          width:32px;height:32px;
          background:${isStart ? '#22c55e' : isEnd ? '#3b82f6' : isReached ? '#f97316' : '#6b7280'};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="transform:rotate(45deg);font-size:14px">
            ${isStart ? '🏠' : isEnd ? '🏁' : isReached ? '✅' : '📍'}
          </div>
        </div>
      `;

      const icon = L.divIcon({ html: iconHtml, iconSize: [32, 32], iconAnchor: [16, 32], className: '' });
      const marker = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:DM Sans,sans-serif;min-width:150px">
          <strong>${stop.name}</strong><br/>
          ${stop.dayTitle ? `<small>Day ${stop.dayNumber}: ${stop.dayTitle}</small><br/>` : ''}
          ${stop.duration ? `<small>⏱ ${stop.duration}</small><br/>` : ''}
          ${stop.description ? `<small>${stop.description}</small>` : ''}
        </div>
      `);
      markers.push(marker);
      points.push([stop.lat, stop.lng]);
    });

    // Draw route polyline
    if (points.length > 1) {
      L.polyline(points, {
        color: '#ff7c0a',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 4'
      }).addTo(map);
    }

    // Fit bounds
    if (points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 10);
      } else {
        map.fitBounds(points, { padding: [30, 30] });
      }
    } else {
      // Default to India center
      map.setView([20.5937, 78.9629], 5);
    }
  }, [mapReady, geocodedStops, allStops, progress]);

  const currentProgress = progress?.current_stop_index || 0;
  const totalStops = allStops.length || geocodedStops.length;
  const progressPct = totalStops > 0 ? Math.round((currentProgress / totalStops) * 100) : 0;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Map */}
      <div className="relative" style={{ height: '55vh', minHeight: 280 }}>
        <div ref={mapRef} className="w-full h-full" />

        {/* Progress overlay */}
        {trip?.status === 'active' && (
          <div className="absolute top-3 left-3 right-3 z-[400]">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>🚗 Trip Progress</span>
                <span className="text-saffron-600">{progressPct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-saffron-500 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }} />
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{currentProgress} of {totalStops} stops reached</div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[400]">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-2 text-[10px] space-y-1 shadow border border-white">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-full inline-block"/> Start</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-orange-500 rounded-full inline-block"/> Visited</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-400 rounded-full inline-block"/> Upcoming</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 rounded-full inline-block"/> End</div>
          </div>
        </div>
      </div>

      {/* Stops list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h3 className="font-display font-bold text-slate-700 mb-3 text-sm">
          Route Stops ({(allStops.length || geocodedStops.length)} points)
        </h3>

        {geocodedStops.length === 0 && allStops.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">Loading map data...</p>
            <p className="text-xs text-slate-300 mt-1">Geocoding locations from your trip plan</p>
          </div>
        )}

        <div className="space-y-2">
          {(allStops.length > 0 ? allStops : geocodedStops).map((stop, i) => (
            <div key={i} className="card p-3 flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white
                ${stop.type === 'start' ? 'bg-green-500' : stop.type === 'end' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">{stop.name}</div>
                {stop.dayTitle && <div className="text-xs text-slate-400">Day {stop.dayNumber}: {stop.dayTitle}</div>}
              </div>
              {stop.type === 'start' && <span className="badge badge-green text-[10px]">Start</span>}
              {stop.type === 'end' && <span className="badge badge-ocean text-[10px]">End</span>}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500 text-center">
            🗺️ Map powered by <strong>OpenStreetMap</strong> · No API key needed<br/>
            Route geocoding by <strong>Nominatim</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
