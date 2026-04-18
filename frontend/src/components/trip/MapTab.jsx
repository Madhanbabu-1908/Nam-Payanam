import { useEffect, useRef, useState, useCallback } from 'react';
import { tripAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function MapTab({ trip, days, progress, session, onProgressUpdate }) {
  const mapRef       = useRef(null);
  const mapInst      = useRef(null);
  const vehicleMarker= useRef(null);
  const watchId      = useRef(null);
  const lastPos      = useRef(null);
  const routeLayer   = useRef(null);

  const [tracking, setTracking]   = useState(false);
  const [speed, setSpeed]         = useState(0);
  const [eta, setEta]             = useState(null);
  const [geocoded, setGeocoded]   = useState([]);
  const [mapReady, setMapReady]   = useState(false);
  const [currentPos, setCurrentPos] = useState(null);

  // Collect all route waypoints
  const allWaypoints = [];
  if (trip?.start_lat && trip?.start_lng)
    allWaypoints.push({ name: trip.start_location, lat: trip.start_lat, lng: trip.start_lng, type:'start' });
  days?.forEach(day => {
    day.stops?.forEach(s => { if (s.lat && s.lng) allWaypoints.push({ ...s }); });
  });
  if (trip?.end_lat && trip?.end_lng)
    allWaypoints.push({ name: trip.end_location, lat: trip.end_lat, lng: trip.end_lng, type:'end' });

  // Geocode fallback if no coords
  useEffect(() => {
    if (allWaypoints.length >= 2 || !trip) return;
    const locs = [
      { name: trip.start_location, type:'start' },
      ...(trip.stops?.map?.(s => ({ name: s.label||s.name||s, type:'stop' })) || []),
      { name: trip.end_location, type:'end' },
    ];
    (async () => {
      const results = [];
      for (const loc of locs) {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc.name+', India')}&format=json&limit=1`,
            { headers: { 'User-Agent': 'NamPayanam/1.0' } });
          const d = await r.json();
          if (d[0]) results.push({ name:loc.name, type:loc.type, lat:parseFloat(d[0].lat), lng:parseFloat(d[0].lon) });
        } catch {}
        await new Promise(r => setTimeout(r, 300));
      }
      setGeocoded(results);
    })();
  }, [trip?.id]);

  // Inside your Leaflet init useEffect:
useEffect(() => {
  if (!mapRef.current || mapInst.current) return;
  const L = window.L;
  if (!L) return;

  const map = L.map(mapRef.current, { 
    zoomControl: false, 
    attributionControl: true,
    // Lower default pane z-indexes so sidebar can overlay
    pane: 'customPane'
  });

  // Create custom pane with lower z-index
  map.createPane('customTilePane');
  map.getPane('customTilePane').style.zIndex = 100; // Lower than sidebar
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
    pane: 'customTilePane' // Use custom pane
  }).addTo(map);

  // Also lower marker/popup panes if needed
  map.createPane('customMarkerPane');
  map.getPane('customMarkerPane').style.zIndex = 150;

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  mapInst.current = map;
  setMapReady(true);
  
  return () => { map.remove(); mapInst.current = null; };
}, []);

  // Draw route and markers
  useEffect(() => {
    if (!mapReady || !mapInst.current) return;
    const L = window.L;
    const map = mapInst.current;
    const waypoints = allWaypoints.length >= 2 ? allWaypoints : geocoded;

    // Clear old layers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    if (waypoints.length < 2) {
      map.setView([20.59, 78.96], 5);
      return;
    }

    const points = [];
    const currentStopIdx = progress?.current_stop_index || 0;

    waypoints.forEach((wp, i) => {
      const isStart  = wp.type === 'start' || i === 0;
      const isEnd    = wp.type === 'end' || i === waypoints.length - 1;
      const isReached = i < currentStopIdx;
      const isCurrent = i === currentStopIdx;

      const color = isStart ? '#10b981' : isEnd ? '#6366f1' : isReached ? '#f59e0b' : '#94a3b8';
      const size  = isStart || isEnd ? 14 : isCurrent ? 12 : 10;

      const iconHtml = `
        <div style="width:${size+8}px;height:${size+8}px;background:${color};border-radius:50%;border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:${size-2}px">${isStart?'🟢':isEnd?'🔴':isReached?'✅':isCurrent?'📍':'⚪'}</span>
        </div>`;
      const icon = L.divIcon({ html:iconHtml, iconSize:[size+8,size+8], iconAnchor:[(size+8)/2,(size+8)/2], className:'' });

      L.marker([wp.lat, wp.lng], { icon }).addTo(map)
        .bindPopup(`<div style="font-family:DM Sans,sans-serif;min-width:140px">
          <strong>${wp.name}</strong><br/>
          <small style="color:#94a3b8">${isStart?'Start':isEnd?'End':isReached?'✅ Reached':'Upcoming'}</small>
          ${wp.duration?`<br/><small>⏱ ${wp.duration}</small>`:''}
        </div>`);

      points.push([wp.lat, wp.lng]);
    });

    // Draw route — completed vs remaining
    const completedPts = points.slice(0, Math.min(currentStopIdx + 1, points.length));
    const remainingPts = points.slice(Math.max(0, currentStopIdx));

    if (completedPts.length > 1) {
      L.polyline(completedPts, { color:'#4f46e5', weight:5, opacity:0.9 }).addTo(map);
    }
    if (remainingPts.length > 1) {
      L.polyline(remainingPts, { color:'#94a3b8', weight:4, opacity:0.6, dashArray:'10,6' }).addTo(map);
    }

    // Use OSRM geometry if available
    if (trip?.route_data?.geometry) {
      try {
        const L2 = window.L;
        L2.geoJSON(trip.route_data.geometry, {
          style: { color:'#4f46e5', weight:4, opacity:0.7 }
        }).addTo(map);
      } catch {}
    }

    map.fitBounds(points, { padding:[30,30] });
  }, [mapReady, geocoded, progress?.current_stop_index, trip?.id]);

  // Draw vehicle position
  useEffect(() => {
    if (!mapReady || !mapInst.current || !progress?.current_lat) return;
    const L = window.L;
    const map = mapInst.current;

    if (vehicleMarker.current) {
      vehicleMarker.current.setLatLng([progress.current_lat, progress.current_lng]);
    } else {
      const iconHtml = `
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);
          border-radius:50%;border:3px solid white;box-shadow:0 4px 16px rgba(79,70,229,0.5);
          display:flex;align-items:center;justify-content:center;font-size:20px;
          animation:pulse 1.5s ease-in-out infinite">🚗</div>`;
      const icon = L.divIcon({ html:iconHtml, iconSize:[40,40], iconAnchor:[20,20], className:'' });
      vehicleMarker.current = L.marker([progress.current_lat, progress.current_lng], { icon, zIndexOffset:1000 }).addTo(map);
    }
  }, [mapReady, progress?.current_lat, progress?.current_lng]);

  // Live GPS tracking
  function startTracking() {
    if (!navigator.geolocation) return toast.error('GPS not supported');
    setTracking(true);
    toast.success('📍 Live tracking started!');

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, speed: spd } = pos.coords;
        const kmh = spd ? Math.round(spd * 3.6) : 0;
        setSpeed(kmh);
        setCurrentPos({ lat, lng });

        // Update map vehicle
        if (mapInst.current) {
          const L = window.L;
          if (vehicleMarker.current) {
            vehicleMarker.current.setLatLng([lat, lng]);
          } else {
            const iconHtml = `<div style="width:40px;height:40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:50%;border:3px solid white;box-shadow:0 4px 16px rgba(79,70,229,0.5);display:flex;align-items:center;justify-content:center;font-size:20px;">🚗</div>`;
            const icon = L.divIcon({ html:iconHtml, iconSize:[40,40], iconAnchor:[20,20], className:'' });
            vehicleMarker.current = L.marker([lat, lng], { icon, zIndexOffset:1000 }).addTo(mapInst.current);
          }
          mapInst.current.panTo([lat, lng], { animate:true });
        }

        // Calculate ETA to next stop
        const waypoints = allWaypoints.length >= 2 ? allWaypoints : geocoded;
        const nextIdx = progress?.current_stop_index || 0;
        if (waypoints[nextIdx + 1]) {
          const next = waypoints[nextIdx + 1];
          const dist = haversine(lat, lng, next.lat, next.lng);
          if (kmh > 5) {
            const etaMin = Math.round((dist / kmh) * 60);
            setEta({ dist: Math.round(dist * 10) / 10, min: etaMin, name: next.name });
          }
        }

        // Save to DB every 5 seconds
        const now = Date.now();
        if (!lastPos.current || now - lastPos.current > 5000) {
          lastPos.current = now;
          try {
            await onProgressUpdate({ lat, lng, speed: kmh });
          } catch {}
        }
      },
      (err) => { console.error('GPS error:', err); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }

  function stopTracking() {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
    setSpeed(0);
    setEta(null);
    toast('Tracking stopped');
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  const waypoints = allWaypoints.length >= 2 ? allWaypoints : geocoded;
  const currentStopIdx = progress?.current_stop_index || 0;
  const pct = waypoints.length > 1 ? Math.min(100, Math.round((currentStopIdx/(waypoints.length-1))*100)) : 0;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Map container */}
      <div className="relative" style={{ height:'52vh', minHeight:260 }}>
        <div ref={mapRef} className="w-full h-full rounded-none"/>

        {/* RedBus-style top overlay: route name */}
        <div className="absolute top-3 left-3 right-3 z-[400] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-glass flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={tracking ? 'live-dot' : 'w-2.5 h-2.5 bg-slate-300 rounded-full'}/>
              <span className="text-xs font-black text-slate-700">
                {trip?.start_location?.split(',')[0]} → {trip?.end_location?.split(',')[0]}
              </span>
            </div>
            {trip?.route_data && (
              <span className="text-xs font-bold text-indigo-600">{trip.route_data.totalDistanceKm}km</span>
            )}
          </div>
        </div>

        {/* Speed indicator (RedBus style) */}
        {tracking && (
          <div className="absolute bottom-16 left-3 z-[400]">
            <div className="bg-white rounded-2xl shadow-glass px-3 py-2 text-center border border-slate-100">
              <div className="font-display font-black text-indigo-700 text-2xl leading-none">{speed}</div>
              <div className="text-[10px] text-slate-400 font-bold">km/h</div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 z-[400]">
          <div className="bg-white/95 rounded-xl p-2 text-[10px] space-y-1 shadow border border-white/80">
            <div className="flex items-center gap-1.5"><div className="w-6 h-1 bg-indigo-500 rounded"/><span className="text-slate-600 font-semibold">Done</span></div>
            <div className="flex items-center gap-1.5"><div className="w-6 h-px bg-slate-400 border-dashed border-t-2 border-slate-300"/><span className="text-slate-600 font-semibold">Ahead</span></div>
          </div>
        </div>
      </div>

      {/* ETA card (RedBus style) */}
      {eta && (
        <div className="mx-4 mt-3 bg-indigo-600 rounded-2xl px-4 py-3 flex items-center justify-between animate-slide-up shadow-indigo">
          <div>
            <p className="text-white/70 text-xs font-bold">Next Stop</p>
            <p className="text-white font-display font-bold text-sm truncate">{eta.name}</p>
          </div>
          <div className="text-right">
            <p className="text-saffron-400 font-display font-black text-xl">{eta.min} min</p>
            <p className="text-white/60 text-xs">{eta.dist}km away</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="px-4 pt-3 space-y-3 pb-8">
        {/* Progress */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-700">Trip Progress</span>
            <span className="font-display font-black text-indigo-600">{pct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-saffron-gradient rounded-full transition-all duration-700 shadow-saffron" style={{width:`${Math.max(2,pct)}%`}}/>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-bold">
            <span>{trip?.start_location?.split(',')[0]}</span>
            <span>{currentStopIdx}/{waypoints.length} stops</span>
            <span>{trip?.end_location?.split(',')[0]}</span>
          </div>
        </div>

        {/* Go Live button */}
        <div className="grid grid-cols-2 gap-3">
          {!tracking ? (
            <button onClick={startTracking} className="btn-indigo col-span-2 py-4">
              <span className="text-lg">📍</span>
              <div className="text-left">
                <div className="font-display font-bold">Go Live</div>
                <div className="text-xs text-indigo-300 font-normal">Share GPS with group</div>
              </div>
            </button>
          ) : (
            <>
              <div className="card p-3 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 mb-1"><div className="live-dot"/><span className="text-xs font-bold text-emerald-700">Live</span></div>
                <div className="font-display font-black text-2xl text-indigo-700">{speed}</div>
                <div className="text-[10px] text-slate-400 font-bold">km/h</div>
              </div>
              <button onClick={stopTracking} className="btn-danger col-span-1 h-full flex-col gap-1">
                <span>⏹️</span><span>Stop Tracking</span>
              </button>
            </>
          )}
        </div>

        {/* Route stops list */}
        <div>
          <h3 className="font-display font-bold text-slate-700 text-sm mb-2">Route Stops</h3>
          <div className="space-y-2">
            {waypoints.map((wp, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                ${i < currentStopIdx ? 'bg-emerald-50 border-emerald-200' : i === currentStopIdx ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black
                  ${i < currentStopIdx ? 'bg-emerald-500 text-white' : i===currentStopIdx?'bg-indigo-600 text-white':'bg-slate-200 text-slate-500'}`}>
                  {i < currentStopIdx ? '✓' : i+1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{wp.name}</div>
                  {wp.type && <div className="text-[10px] text-slate-400 capitalize">{wp.type}</div>}
                </div>
                {i === currentStopIdx && <span className="text-xs font-bold text-indigo-600">Current →</span>}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 py-2">
          🗺️ OpenStreetMap · Routing by OSRM · GPS via browser
        </p>
      </div>
    </div>
  );
}
