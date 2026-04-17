import { useEffect, useRef, useState, useCallback } from 'react';
import { trackingAPI, hotelAPI } from '../../utils/api';
import { Spinner, BottomSheet, formatCurrency } from '../ui/index.jsx';
import toast from 'react-hot-toast';
import supabase from '../../utils/supabase';

const STOP_COLORS = { start:'#10b981', end:'#FF6B35', stay:'#8b5cf6', food:'#f59e0b', attraction:'#0066CC', stop:'#64748b', break:'#f97316', default:'#64748b' };

export default function MapTab({ trip, days, progress, breakStops = [], session }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const trackMarker = useRef(null);
  const pathLine = useRef(null);
  const remainLine = useRef(null);
  const watchId = useRef(null);
  const lastPathPush = useRef(0);

  const [geocodedStops, setGeocodedStops] = useState([]);
  const [liveLocation, setLiveLocation] = useState(null);
  const [travelPath, setTravelPath] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [etaText, setEtaText] = useState(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [creatingToken, setCreatingToken] = useState(false);
  const [showHotelSheet, setShowHotelSheet] = useState(false);
  const [hotelSearch, setHotelSearch] = useState({ location:'', budget: trip?.ai_plan?.estimatedCost?.perPerson > 3000 ? 'premium' : 'moderate' });
  const [hotels, setHotels] = useState([]);
  const [searchingHotels, setSearchingHotels] = useState(false);

  const isOrganizer = session?.isOrganizer;
  const isActive = trip?.status === 'active';

  // Geocode route stops
  useEffect(() => {
    if (!trip) return;
    async function geocode() {
      setMapLoading(true);
      const locs = [];
      const list = [
        { name: trip.start_location, type: 'start' },
        ...(trip.stops||[]).map(s=>({ name: s, type: 'stop' })),
        { name: trip.end_location, type: 'end' },
      ].filter(l=>l.name);
      for (const loc of list) {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc.name+', India')}&format=json&limit=1`, { headers:{'Accept-Language':'en','User-Agent':'NamPayanam/1.0'} });
          const d = await r.json();
          if (d[0]) locs.push({ name:loc.name, type:loc.type, lat:parseFloat(d[0].lat), lng:parseFloat(d[0].lon) });
          await new Promise(r=>setTimeout(r, 280));
        } catch {}
      }
      setGeocodedStops(locs);
      setMapLoading(false);
    }
    geocode();
  }, [trip?.id]);

  // Load existing path + live location
  useEffect(() => {
    if (!trip?.id) return;
    trackingAPI.getLive(trip.id).then(r => {
      if (r.location) setLiveLocation(r.location);
      if (r.path?.length) setTravelPath(r.path);
    }).catch(()=>{});
  }, [trip?.id]);

  // Realtime live location subscription
  useEffect(() => {
    if (!trip?.id) return;
    const ch = supabase.channel(`live-${trip.id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'live_locations', filter:`trip_id=eq.${trip.id}` }, payload => {
        if (payload.new) setLiveLocation(payload.new);
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'travel_path', filter:`trip_id=eq.${trip.id}` }, payload => {
        if (payload.new) setTravelPath(p => [...p, payload.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [trip?.id]);

  // Init/update map
  useEffect(() => {
    if (mapLoading || !mapRef.current || geocodedStops.length === 0) return;
    const L = window.L; if (!L) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([geocodedStops[0]?.lat||11, geocodedStops[0]?.lng||77], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:18 }).addTo(map);
      L.control.zoom({ position:'bottomright' }).addTo(map);
      mapInstance.current = map;
    }
    const map = mapInstance.current;

    // Clear old markers
    map.eachLayer(l => { if (l._custom) map.removeLayer(l); });

    // Route stop markers
    geocodedStops.forEach((stop, i) => {
      const color = STOP_COLORS[stop.type];
      const icon = L.divIcon({
        html:`<div style="width:34px;height:34px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.25)"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-size:11px;font-weight:900">${i+1}</div></div>`,
        className:'', iconSize:[34,34], iconAnchor:[17,34]
      });
      const m = L.marker([stop.lat,stop.lng],{icon}).addTo(map)
        .bindPopup(`<b style="font-size:13px">${stop.name}</b><br/><small style="color:#64748b;text-transform:capitalize">${stop.type}</small>`);
      m._custom = true;
    });

    // Break stop markers
    breakStops?.forEach(b => {
      if (!b.lat || !b.lng) return;
      const icon = L.divIcon({
        html:`<div style="background:#f97316;border:2px solid white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.2)">☕</div>`,
        className:'', iconSize:[28,28], iconAnchor:[14,14]
      });
      const m = L.marker([b.lat,b.lng],{icon}).addTo(map)
        .bindPopup(`<b style="font-size:12px">☕ ${b.reason}</b><br/><small style="color:#64748b">${b.location||''} · ${b.duration_minutes||'?'}min · by ${b.added_by_nickname}</small>`);
      m._custom = true;
    });

    // Dashed grey route line (planned)
    if (geocodedStops.length>1) {
      const coords = geocodedStops.map(s=>[s.lat,s.lng]);
      const grey = L.polyline(coords,{color:'#94a3b8',weight:3,opacity:0.5,dashArray:'10,8'}).addTo(map);
      grey._custom = true;
    }

    // Green completed path
    if (travelPath.length>1) {
      const pts = travelPath.map(p=>[parseFloat(p.lat),parseFloat(p.lng)]);
      if (pathLine.current) map.removeLayer(pathLine.current);
      pathLine.current = L.polyline(pts,{color:'#10b981',weight:5,opacity:0.9}).addTo(map);
      pathLine.current._custom = true;
    }

    // Live organiser marker
    if (liveLocation) {
      const icon = L.divIcon({
        html:`<div style="position:relative"><div style="width:44px;height:44px;background:linear-gradient(135deg,#FF6B35,#FF4500);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 12px rgba(255,107,53,0.5);animation:pulse 2s infinite">🚗</div><div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#10b981;border:2px solid white;border-radius:50%"></div></div>`,
        className:'', iconSize:[44,44], iconAnchor:[22,22]
      });
      if (trackMarker.current) map.removeLayer(trackMarker.current);
      trackMarker.current = L.marker([parseFloat(liveLocation.lat),parseFloat(liveLocation.lng)],{icon,zIndexOffset:1000}).addTo(map)
        .bindPopup(`<b>🚗 Vehicle is here</b><br/><small>${new Date(liveLocation.updated_at).toLocaleTimeString('en-IN')}</small>`);
      trackMarker.current._custom = true;
    }

    // Fit bounds
    const allPts = [
      ...geocodedStops.map(s=>[s.lat,s.lng]),
      ...(liveLocation ? [[parseFloat(liveLocation.lat),parseFloat(liveLocation.lng)]] : [])
    ];
    if (allPts.length>1) map.fitBounds(allPts, {padding:[40,40]});

    // ETA to next stop
    if (liveLocation && geocodedStops.length>0) {
      const nextStop = geocodedStops.find(s=>s.type!=='start');
      if (nextStop) {
        const dlat = parseFloat(liveLocation.lat)-nextStop.lat;
        const dlng = parseFloat(liveLocation.lng)-nextStop.lng;
        const distKm = Math.sqrt(dlat*dlat+dlng*dlng)*111;
        const etaMin = Math.round(distKm/40*60);
        setEtaText(`~${etaMin} min to ${nextStop.name.split(',')[0]}`);
      }
    }

    return () => {};
  }, [geocodedStops, travelPath, liveLocation, breakStops, mapLoading]);

  // GPS tracking (organiser only)
  function startTracking() {
    if (!navigator.geolocation) return toast.error('GPS not available on this device');
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude:lat, longitude:lng, accuracy, heading, speed, altitude } = pos.coords;
        setLiveLocation({ lat, lng, updated_at: new Date().toISOString() });
        // Push to server
        try {
          await trackingAPI.push({ tripId: trip.id, lat, lng, accuracy, heading, speed, altitude, organizerId: session?.memberId });
          // Throttle path recording: every 30s
          const now = Date.now();
          if (now - lastPathPush.current > 30000) {
            lastPathPush.current = now;
            setTravelPath(p => [...p, { lat, lng }]);
          }
        } catch {}
      },
      (err) => { toast.error('GPS error: '+err.message); setTracking(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  function stopTracking() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    setTracking(false);
    toast('📍 Tracking paused');
  }

  // Tracking tokens
  async function loadTokens() {
    try { const r = await trackingAPI.listTokens(trip.id); setTokens(r.tokens||[]); } catch {}
  }
  useEffect(() => { if (isOrganizer && trip?.id) loadTokens(); }, [trip?.id]);

  async function createToken() {
    setCreatingToken(true);
    try {
      const r = await trackingAPI.createToken({ tripId: trip.id, organizerId: session?.memberId, label: 'Family Tracker', expiresInHours: 72, nickname: session?.nickname });
      const url = `${window.location.origin}/track/${r.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('🔗 Tracking link copied!');
      loadTokens();
    } catch (err) { toast.error(err.message); }
    finally { setCreatingToken(false); }
  }

  async function searchHotels() {
    if (!hotelSearch.location.trim()) return toast.error('Enter a location');
    setSearchingHotels(true);
    try {
      const r = await hotelAPI.search(hotelSearch.location, hotelSearch.budget);
      setHotels(r.hotels||[]);
    } catch (err) { toast.error('Hotel search failed'); }
    finally { setSearchingHotels(false); }
  }

  return (
    <div className="flex flex-col pb-24 animate-fade-in">
      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"/>
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 3px 12px rgba(255,107,53,0.5)}50%{box-shadow:0 3px 20px rgba(255,107,53,0.9)}}`}</style>

      {/* Live Tracking Banner */}
      {isActive && (
        <div className="mx-4 mt-4 mb-2">
          {isOrganizer ? (
            <div className={`rounded-2xl p-4 flex items-center justify-between ${tracking ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
              <div>
                <div className="flex items-center gap-2">
                  {tracking && <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse-soft"/>}
                  <span className="font-bold text-white text-sm">{tracking ? '📡 Broadcasting Live Location' : '📍 Start Live Tracking'}</span>
                </div>
                <p className="text-white/70 text-xs mt-0.5">{tracking ? 'Group members can see your location' : 'Share your GPS with the group'}</p>
              </div>
              <button onClick={tracking?stopTracking:startTracking} className={`px-4 py-2 rounded-xl font-bold text-sm active:scale-95 flex-shrink-0 ${tracking?'bg-white text-emerald-700':'bg-white text-blue-700'}`}>
                {tracking?'Stop':'Go Live 🚀'}
              </button>
            </div>
          ) : (
            <div className={`rounded-2xl p-3 flex items-center gap-3 ${liveLocation?'bg-emerald-50 border border-emerald-200':'bg-slate-100 border border-slate-200'}`}>
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${liveLocation?'bg-emerald-500 animate-pulse-soft':'bg-slate-400'}`}/>
              <div>
                <p className={`font-bold text-sm ${liveLocation?'text-emerald-800':'text-slate-600'}`}>{liveLocation?'🚗 Organiser is live':'📴 Organiser not broadcasting'}</p>
                {liveLocation&&<p className="text-xs text-emerald-600">Updated {new Date(liveLocation.updated_at).toLocaleTimeString('en-IN')}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ETA strip */}
      {etaText && liveLocation && (
        <div className="mx-4 mb-2 bg-blue-600 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">🎯 ETA to next stop</span>
          <span className="text-white font-extrabold">{etaText}</span>
        </div>
      )}

      {/* Map */}
      <div className="relative mx-4 rounded-2xl overflow-hidden border border-slate-200 shadow-lg" style={{height:'360px'}}>
        {mapLoading && (
          <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center z-10">
            <Spinner size="lg"/><p className="text-sm text-slate-500 font-semibold mt-3">Locating stops...</p>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full"/>
        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1"><div className="w-8 h-1.5 bg-emerald-500 rounded"/>Completed</div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1"><div className="w-8 h-1.5 bg-slate-300 rounded" style={{borderTop:'2px dashed #94a3b8',background:'none'}}/>Remaining</div>
          {breakStops?.some(b=>b.lat)&&<div className="flex items-center gap-2 text-xs font-semibold text-slate-600">☕ Break stop</div>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        {isOrganizer && (
          <button onClick={()=>setShowShareSheet(true)} className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-700 active:bg-slate-50">
            🔗 Share Tracking
          </button>
        )}
        <button onClick={()=>setShowHotelSheet(true)} className={`flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-700 active:bg-slate-50 ${isOrganizer?'':'col-span-2'}`}>
          🏨 Hotels Nearby
        </button>
      </div>

      {/* Route stop list */}
      <div className="px-4 mt-4 space-y-2">
        <h3 className="font-display font-bold text-slate-700 text-sm">🗺️ Route Stops</h3>
        {geocodedStops.map((s,i)=>(
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0" style={{background:STOP_COLORS[s.type]||'#64748b'}}>{i+1}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 text-sm truncate">{s.name?.split(',')[0]}</div>
              <div className="text-xs text-slate-400 capitalize">{s.type} point</div>
            </div>
            {i<geocodedStops.length-1&&<span className="text-slate-300 text-sm flex-shrink-0">→</span>}
          </div>
        ))}
        {breakStops?.filter(b=>b.lat).map((b,i)=>(
          <div key={i} className="flex items-center gap-3 bg-orange-50 rounded-xl border border-orange-100 p-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-lg flex-shrink-0">☕</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 text-sm truncate">{b.reason}</div>
              <div className="text-xs text-orange-600">Break · Day {b.day_number} · {b.added_by_nickname}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tracking Share Sheet */}
      <BottomSheet isOpen={showShareSheet} onClose={()=>setShowShareSheet(false)} title="📡 Share Live Tracking">
        <div className="space-y-4 pb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            <p className="font-bold mb-1">WhatsApp-style tracking link</p>
            <p className="text-xs text-blue-600">Anyone with this link can view your live location — no login needed. Valid 72 hours.</p>
          </div>
          <button onClick={createToken} disabled={creatingToken} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-extrabold">
            {creatingToken?<Spinner size="sm" color="white"/>:'🔗'}
            {creatingToken?'Creating link...':'Generate & Copy Tracking Link'}
          </button>
          {tokens.length>0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">ACTIVE LINKS</div>
              {tokens.map(t=>(
                <div key={t.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 mb-1">
                  <div>
                    <div className="text-xs font-bold text-slate-700">{t.label}</div>
                    <div className="text-[11px] text-slate-400">{t.expires_at?`Expires ${new Date(t.expires_at).toLocaleDateString('en-IN')}`:'No expiry'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/track/${t.token}`);toast.success('Copied!');}} className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-lg">Copy</button>
                    <button onClick={async()=>{await trackingAPI.deleteToken(t.id,session?.memberId);loadTokens();toast.success('Deleted');}} className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Hotel Search Sheet */}
      <BottomSheet isOpen={showHotelSheet} onClose={()=>setShowHotelSheet(false)} title="🏨 Find Hotels Nearby">
        <div className="space-y-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <input className="input col-span-2" placeholder="e.g. Vellore, Ooty..." value={hotelSearch.location} onChange={e=>setHotelSearch(p=>({...p,location:e.target.value}))}/>
            <select className="input" value={hotelSearch.budget} onChange={e=>setHotelSearch(p=>({...p,budget:e.target.value}))}>
              <option value="budget">Budget</option><option value="moderate">Mid</option><option value="premium">Premium</option>
            </select>
          </div>
          <button onClick={searchHotels} disabled={searchingHotels} className="btn-primary w-full flex items-center justify-center gap-2 py-3 font-extrabold">
            {searchingHotels?<Spinner size="sm" color="white"/>:'🔍'}
            {searchingHotels?'Searching...':'Find Hotels'}
          </button>
          {hotels.length>0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {hotels.map((h,i)=>(
                <div key={i} className={`p-3 rounded-xl border ${h.type==='premium'?'bg-purple-50 border-purple-100':h.type==='budget'?'bg-slate-50 border-slate-200':'bg-blue-50 border-blue-100'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{h.name}</div>
                      <div className="text-xs text-slate-500">{h.location} · ⭐{h.rating}</div>
                      {h.bookingNote&&<div className="text-xs text-slate-400 mt-0.5">{h.bookingNote}</div>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-extrabold text-[#FF6B35]">{formatCurrency(h.pricePerNight)}</div>
                      <div className="text-[11px] text-slate-400">/night</div>
                    </div>
                  </div>
                  {h.amenities?.length>0&&<div className="flex gap-1 mt-1.5 flex-wrap">{h.amenities.map((a,j)=><span key={j} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md">{a}</span>)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
