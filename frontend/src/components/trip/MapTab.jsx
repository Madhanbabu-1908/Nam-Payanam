import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../ui/index.jsx';

const STOP_TYPE_COLORS = { start: '#10b981', end: '#FF6B35', stay: '#8b5cf6', food: '#f59e0b', attraction: '#0066CC', stop: '#64748b', default: '#64748b' };

export default function MapTab({ trip, days, progress }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [geocodedStops, setGeocodedStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState(null);

  // Collect stops with lat/lng from AI plan
  const stopsWithCoords = [];
  days?.forEach(day => {
    day.stops?.forEach(stop => {
      if (stop.lat && stop.lng) stopsWithCoords.push({ ...stop, dayNumber: day.day_number });
    });
  });

  // Geocode main route locations
  useEffect(() => {
    async function geocode() {
      setLoading(true);
      const locs = [];
      const toGeocode = [
        { name: trip?.start_location, type: 'start' },
        ...(trip?.stops || []).map(s => ({ name: s, type: 'stop' })),
        { name: trip?.end_location, type: 'end' },
      ].filter(l => l.name);

      for (const loc of toGeocode) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc.name + ', India')}&format=json&limit=1`, { headers: { 'Accept-Language': 'en', 'User-Agent': 'NamPayanam/1.0' } });
          const data = await res.json();
          if (data[0]) locs.push({ name: loc.name, type: loc.type, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          await new Promise(r => setTimeout(r, 250));
        } catch {}
      }
      setGeocodedStops(locs);
      setLoading(false);
    }
    if (trip) geocode();
  }, [trip?.id]);

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || geocodedStops.length === 0) return;

    const L = window.L;
    if (!L) return;

    const validStops = geocodedStops.filter(s => s.lat && s.lng);
    if (!validStops.length) return;

    const center = [validStops[0].lat, validStops[0].lng];
    const map = L.map(mapRef.current, { zoomControl: false }).setView(center, 8);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add markers
    validStops.forEach((stop, i) => {
      const color = STOP_TYPE_COLORS[stop.type] || STOP_TYPE_COLORS.default;
      const icon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3)">
                 <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-size:12px;font-weight:bold">
                   ${i + 1}
                 </div>
               </div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      L.marker([stop.lat, stop.lng], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:14px;color:#1a1a2e;min-width:120px">${stop.name}</div><div style="font-size:11px;color:#64748b;margin-top:2px;text-transform:capitalize">${stop.type}</div>`);
    });

    // Draw route line
    if (validStops.length > 1) {
      const latlngs = validStops.map(s => [s.lat, s.lng]);
      L.polyline(latlngs, { color: '#FF6B35', weight: 3, opacity: 0.8, dashArray: '8, 6' }).addTo(map);
      map.fitBounds(latlngs, { padding: [40, 40] });
    }

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [geocodedStops]);

  return (
    <div className="flex flex-col pb-16 h-full animate-fade-in">
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Map legend */}
      <div className="mx-4 mt-4 mb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {geocodedStops.map((s, i) => (
          <div key={i} className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-slate-100 rounded-xl px-3 py-1.5 shadow-sm">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold flex-shrink-0" style={{ background: STOP_TYPE_COLORS[s.type] || '#64748b' }}>{i+1}</div>
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[80px]">{s.name?.split(',')[0]}</span>
          </div>
        ))}
      </div>

      {/* Map container */}
      <div className="relative mx-4 rounded-2xl overflow-hidden border border-slate-200 shadow-lg" style={{ height: '380px' }}>
        {loading && (
          <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center z-10">
            <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500 font-semibold">Locating stops...</p>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" />
      </div>

      {/* Route info cards */}
      <div className="px-4 mt-4 space-y-2">
        <h3 className="font-display font-bold text-slate-700 text-sm">🗺️ Route Overview</h3>
        {geocodedStops.map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0" style={{ background: STOP_TYPE_COLORS[s.type] || '#64748b' }}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 text-sm truncate">{s.name?.split(',')[0]}</div>
              <div className="text-xs text-slate-400 capitalize mt-0.5">{s.type} point</div>
            </div>
            {i < geocodedStops.length - 1 && (
              <div className="text-slate-300 text-lg">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
