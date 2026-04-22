import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Navigation, MapPin, Copy, CheckCircle, Play, Square } from 'lucide-react';

declare const L: any;

const pinHtml = (color: string, label: string, pulse = false) => `
  <div style="position:relative;width:38px;height:44px">
    ${pulse ? `<div style="position:absolute;top:4px;left:4px;width:30px;height:30px;background:${color};border-radius:50%;opacity:0.3;animation:ping 1.5s infinite"></div>` : ''}
    <div style="position:absolute;top:0;left:0;width:38px;height:38px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center">
      <div style="transform:rotate(45deg);color:white;font-size:13px;font-weight:900">${label}</div>
    </div>
  </div>`;

export default function LiveMapPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const vehicleMarker = useRef<any>(null);
  const pathLine = useRef<any>(null);
  const watchRef = useRef<number | null>(null);
  const pathPts  = useRef<[number,number][]>([]);
  const lastPush = useRef(0);

  const [trip, setTrip]     = useState<any>(null);
  const [tracking, setTracking] = useState(false);
  const [speed, setSpeed]   = useState(0);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [livePos, setLivePos] = useState<{lat:number,lng:number} | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isOrg, setIsOrg]   = useState(false);
  const [eta, setEta]       = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progressPct, setPct] = useState(0);

  // Haversine
  const dist = (a: any, b: any) => {
    const R = 6371, dLat = (b.lat-a.lat)*Math.PI/180, dLng = (b.lng-a.lng)*Math.PI/180;
    return R*2*Math.atan2(Math.sqrt(Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2),
      Math.sqrt(1-(Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2)));
  };

  useEffect(() => {
    if (!tripId) return;
    api.get(`/trips/${tripId}`).then(r => {
      const t = r.data.data;
      setTrip(t);
      setIsOrg(t.organizer_id === user?.id);
      // Build waypoints from trip
      const wps: any[] = [];
      if (t.start_lat && t.start_lng) wps.push({ name: t.start_location||'Start', lat:+t.start_lat, lng:+t.start_lng, type:'start' });
      if (t.destination_lat && t.destination_lng) wps.push({ name: t.destination, lat:+t.destination_lat, lng:+t.destination_lng, type:'end' });
      setWaypoints(wps);
    });
    // Load existing path
    api.get(`/tracking/trips/${tripId}/path`).then(r => {
      const pts = r.data.data?.map((p:any) => [+p.latitude, +p.longitude]) || [];
      pathPts.current = pts;
    }).catch(()=>{});
  }, [tripId, user]);

  // Init Leaflet
  useEffect(() => {
    if (!mapRef.current || mapInst.current || !L || waypoints.length === 0) return;
    const center = waypoints[0] ? [waypoints[0].lat, waypoints[0].lng] : [11.0, 77.0];
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(center, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);
    L.control.zoom({ position:'bottomright' }).addTo(map);
    mapInst.current = map;
    setMapReady(true);
  }, [waypoints]);

  // Draw markers + route
  useEffect(() => {
    const map = mapInst.current;
    if (!map || !L || !mapReady) return;
    map.eachLayer((l:any) => { if (l._np) map.removeLayer(l); });
    const bounds: [number,number][] = [];

    const colors: Record<string,string> = { start:'#10B981', end:'#FF6B35', stop:'#0EA5E9' };
    waypoints.forEach((wp, i) => {
      const color = colors[wp.type] || '#6366f1';
      const icon = L.divIcon({ html: pinHtml(color, i===0?'🏠':'🏁'), className:'', iconSize:[38,44], iconAnchor:[19,44] });
      const m = L.marker([wp.lat, wp.lng], { icon }).addTo(map)
        .bindPopup(`<b>${wp.name}</b>`);
      m._np = true;
      bounds.push([wp.lat, wp.lng]);
    });

    // Planned dashed route
    if (waypoints.length >= 2) {
      const line = L.polyline(waypoints.map(w=>[w.lat,w.lng]), { color:'#94a3b8', weight:3, dashArray:'10 6', opacity:0.6 }).addTo(map);
      line._np = true;
    }

    // Completed path (green)
    if (pathPts.current.length > 1) {
      if (pathLine.current) map.removeLayer(pathLine.current);
      pathLine.current = L.polyline(pathPts.current, { color:'#10B981', weight:5, opacity:.9 }).addTo(map);
      pathLine.current._np = true;
    }

    // Live vehicle
    if (livePos) {
      const icon = L.divIcon({ html: pinHtml('#FF6B35','🚗',true), className:'', iconSize:[38,44], iconAnchor:[19,44] });
      if (vehicleMarker.current) map.removeLayer(vehicleMarker.current);
      vehicleMarker.current = L.marker([livePos.lat, livePos.lng], { icon, zIndexOffset:1000 }).addTo(map)
        .bindPopup(`<b>Vehicle</b>${speed>0?`<br>${speed.toFixed(0)} km/h`:''}`);
      vehicleMarker.current._np = true;
      bounds.push([livePos.lat, livePos.lng]);
    }

    if (bounds.length > 1) map.fitBounds(bounds, { padding:[40,40] });
    else if (bounds.length === 1) map.setView(bounds[0], 12);
  }, [waypoints, livePos, mapReady]);

  // GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation) return alert('GPS not available');
    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(async pos => {
      const { latitude:lat, longitude:lng, speed:spd } = pos.coords;
      const kmh = spd ? spd * 3.6 : 0;
      setSpeed(kmh);
      setLivePos({ lat, lng });
      pathPts.current.push([lat, lng]);

      // Push to backend every 15s
      const now = Date.now();
      if (now - lastPush.current > 15000) {
        lastPush.current = now;
        api.post(`/tracking/trips/${tripId}/location`, { latitude:lat, longitude:lng, speed:kmh }).catch(()=>{});
      }

      // ETA
      const dest = waypoints.find(w => w.type === 'end');
      if (dest) {
        const km = dist({lat,lng}, dest);
        const min = Math.round(km/40*60);
        setEta(`~${min} min to ${dest.name.split(',')[0]}`);
        // Progress
        const startWp = waypoints.find(w => w.type === 'start');
        if (startWp) {
          const total = dist(startWp, dest);
          const done = dist({lat,lng}, dest);
          setPct(Math.min(99, Math.round((1 - done/total)*100)));
        }
      }
    }, err => { alert('GPS: ' + err.message); setTracking(false); },
      { enableHighAccuracy:true, maximumAge:5000, timeout:12000 });
  };

  const stopTracking = () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null; setTracking(false);
  };

  useEffect(() => () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); }, []);

  const shareLink = `${window.location.origin}/track/${tripId}`;
  const copyLink = () => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] pt-safe">
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>

      <header className="glass z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Live Map</h1>
          <button onClick={copyLink}
            className="btn-ghost py-2 px-3 text-xs border border-[var(--border)]">
            {copied ? <CheckCircle size={14} className="text-jade"/> : <Copy size={14}/>}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </header>

      {/* Progress strip */}
      {(tracking || livePos) && (
        <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--muted)]">Trip progress</span>
            <span className="font-bold text-brand">{progressPct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{width:`${progressPct}%`}}/>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full"/>

        {/* ETA chip */}
        {eta && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[var(--surface)]/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-float flex items-center gap-2 z-10">
            <Navigation size={14} className="text-brand"/>
            <span className="text-sm font-bold text-[var(--text)]">{eta}</span>
          </div>
        )}

        {/* Speed chip */}
        {tracking && (
          <div className="absolute bottom-4 left-4 bg-jade text-white rounded-2xl px-4 py-2.5 shadow-float z-10">
            <p className="font-display font-black text-xl leading-none">{speed.toFixed(0)}</p>
            <p className="text-white/70 text-[10px]">km/h</p>
          </div>
        )}

        {/* Tracking control */}
        {isOrg && (
          <div className="absolute bottom-4 right-4 z-10">
            <button onClick={tracking ? stopTracking : startTracking}
              className={`flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-2xl shadow-float transition-all active:scale-95 ${tracking ? 'bg-rose-500 text-white' : 'bg-brand text-white shadow-brand'}`}>
              {tracking ? <><Square size={16} fill="white"/>Stop GPS</> : <><Play size={16} fill="white"/>Go Live</>}
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--surface)]/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md z-10 flex gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-semibold">
            <div className="w-5 h-1.5 bg-jade rounded"/>Done
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-semibold">
            <div className="w-5 h-0 border-t-2 border-dashed border-slate-400"/>Planned
          </div>
        </div>
      </div>

      {/* Waypoints */}
      <div className="bg-[var(--surface)] border-t border-[var(--border)] px-4 py-3 max-h-36 overflow-y-auto">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {waypoints.map((w, i) => (
            <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-[var(--bg)] rounded-xl px-3 py-2 border border-[var(--border)]">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{background: w.type==='start'?'#10B981':w.type==='end'?'#FF6B35':'#0EA5E9'}}>
                {i+1}
              </div>
              <span className="text-xs font-semibold text-[var(--text)] truncate max-w-[80px]">{w.name?.split(',')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
