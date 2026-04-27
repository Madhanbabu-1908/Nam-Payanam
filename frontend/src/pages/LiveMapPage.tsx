import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Copy, Check, Navigation, Square } from 'lucide-react';
import toast from 'react-hot-toast';

declare const L: any;

const CHECKIN_ICONS: Record<string,string> = {
  PIN:'📍', CAR:'🚗', STAR:'⭐', HOME:'🏠', FLAG:'🚩', FOOD:'🍽️', FUEL:'⛽', REST:'☕'
};

function haversine(a:{lat:number,lng:number}, b:{lat:number,lng:number}) {
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

export default function LiveMapPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInst     = useRef<any>(null);
  const vehicleMark = useRef<any>(null);
  const pathLine    = useRef<any>(null);
  const markersRef  = useRef<any[]>([]);
  const watchRef    = useRef<number|null>(null);
  const pathCoords  = useRef<[number,number][]>([]);
  const lastPush    = useRef(0);

  const [trip, setTrip]         = useState<any>(null);
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [tracking, setTracking] = useState(false);
  const [livePos, setLivePos]   = useState<{lat:number,lng:number,speed:number}|null>(null);
  const [eta, setEta]           = useState<string|null>(null);
  const [speed, setSpeed]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied]     = useState(false);
  const [isOrg, setIsOrg]       = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Load trip + checkins
  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      api.get(`/trips/${tripId}`),
      api.get(`/checkin/trip/${tripId}`).catch(()=>({data:{data:[]}})),
    ]).then(([tripRes, checkinRes]) => {
      const t = tripRes.data.data;
      setTrip(t);
      setIsOrg(t.organizer_id === user?.id);
      setCheckins(checkinRes.data.data || []);

      // Build waypoints
      const wps: any[] = [];
      if (t.start_lat && t.start_lng)
        wps.push({ name: t.start_location || 'Start', lat:+t.start_lat, lng:+t.start_lng, type:'start' });
      (t.waypoints || []).forEach((w:any) => {
        if (w.lat && w.lng) wps.push({ name: w.name, lat:+w.lat, lng:+w.lng, type:'stop' });
      });
      if (t.destination_lat && t.destination_lng)
        wps.push({ name: t.destination, lat:+t.destination_lat, lng:+t.destination_lng, type:'end' });
      setWaypoints(wps);

      // Load path history
      api.get(`/tracking/trips/${tripId}/path`).then(r => {
        pathCoords.current = (r.data.data||[]).map((p:any)=>[+p.latitude,+p.longitude]);
      }).catch(()=>{});
    }).catch(console.error);
  }, [tripId, user]);

  // Real-time: poll live location every 5s for members
  useEffect(() => {
    if (!tripId || isOrg) return;
    const iv = setInterval(() => {
      api.get(`/tracking/trips/${tripId}/location`).then(r => {
        const d = r.data.data;
        if (d) {
          setLivePos({ lat:+d.latitude, lng:+d.longitude, speed:+d.speed||0 });
          setSpeed(+d.speed||0);
          pathCoords.current.push([+d.latitude,+d.longitude]);
        }
      }).catch(()=>{});
    }, 5000);
    return () => clearInterval(iv);
  }, [tripId, isOrg]);

  // Init Leaflet
  useEffect(() => {
    if (!mapRef.current || mapInst.current || !window.L || waypoints.length===0) return;
    const c = waypoints[0];
    const map = L.map(mapRef.current, { zoomControl:false, attributionControl:false }).setView([c.lat,c.lng], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    L.control.zoom({position:'bottomright'}).addTo(map);
    mapInst.current = map;
    setMapReady(true);
  }, [waypoints]);

  // Draw everything on map
  const redraw = useCallback(() => {
    const map = mapInst.current;
    if (!map || !window.L || waypoints.length===0) return;
    const L = window.L;

    // Clear custom layers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const colors: Record<string,string> = { start:'#10B981', stop:'#0EA5E9', end:'#FF6B35' };
    const bounds: [number,number][] = [];

    // Route stop markers (Google Maps style circles)
    waypoints.forEach((wp, i) => {
      const color = colors[wp.type]||'#6366F1';
      const icon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:${color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:900;box-shadow:0 3px 10px rgba(0,0,0,.25)">${i+1}</div>`,
        className:'', iconSize:[36,36], iconAnchor:[18,18]
      });
      const m = L.marker([wp.lat,wp.lng],{icon}).addTo(map)
        .bindPopup(`<b style="font-size:13px">${wp.name}</b><br/><small style="text-transform:capitalize;color:#6b7280">${wp.type}</small>`);
      (m as any)._custom = true; markersRef.current.push(m);
      bounds.push([wp.lat,wp.lng]);
    });

    // Checkin markers
    checkins.forEach(c => {
      if (!c.latitude||!c.longitude) return;
      const emoji = CHECKIN_ICONS[c.icon]||'📍';
      const icon = L.divIcon({
        html: `<div style="background:white;border:2.5px solid #FF6B35;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.2)">${emoji}</div>
               <div style="position:absolute;top:40px;left:50%;transform:translateX(-50%);background:#1F2937;color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap">${c.location_name}</div>`,
        className:'', iconSize:[36,36], iconAnchor:[18,18]
      });
      const m = L.marker([+c.latitude,+c.longitude],{icon,zIndexOffset:500}).addTo(map)
        .bindPopup(`<b>${CHECKIN_ICONS[c.icon]||'📍'} ${c.location_name}</b><br/><small style="color:#6b7280">${c.profile?.full_name||c.profile?.email?.split('@')[0]||'Member'} is waiting here</small>`);
      (m as any)._custom = true; markersRef.current.push(m);
      bounds.push([+c.latitude,+c.longitude]);
    });

    // OSRM route line — fetch and draw
    if (waypoints.length >= 2) {
      const coords = waypoints.map(w=>`${w.lng},${w.lat}`).join(';');
      fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
        .then(r=>r.json()).then(d=>{
          if (d.code==='Ok'&&d.routes[0]) {
            const geo = d.routes[0].geometry.coordinates.map((c:number[])=>[c[1],c[0]]);
            // Grey planned line
            const pl = L.polyline(geo,{color:'#94A3B8',weight:4,opacity:0.5,dashArray:'10 6'}).addTo(map);
            (pl as any)._custom = true; markersRef.current.push(pl);
          }
        }).catch(()=>{
          // Fallback dashed line
          const pl = L.polyline(waypoints.map(w=>[w.lat,w.lng]),{color:'#94A3B8',weight:3,dashArray:'8 6',opacity:0.5}).addTo(map);
          (pl as any)._custom = true; markersRef.current.push(pl);
        });
    }

    // Green completed path
    if (pathCoords.current.length > 1) {
      if (pathLine.current) map.removeLayer(pathLine.current);
      pathLine.current = L.polyline(pathCoords.current,{color:'#10B981',weight:5,opacity:.9}).addTo(map);
    }

    // Live vehicle marker
    if (livePos) {
      const icon = L.divIcon({
        html: `<div style="position:relative">
          <div style="position:absolute;top:-4px;left:-4px;width:44px;height:44px;background:#FF6B35;border-radius:50%;opacity:0.25;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
          <div style="width:36px;height:36px;background:#FF6B35;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 12px rgba(255,107,53,.5)">🚗</div>
        </div>`,
        className:'', iconSize:[36,36], iconAnchor:[18,18]
      });
      if (vehicleMark.current) map.removeLayer(vehicleMark.current);
      vehicleMark.current = L.marker([livePos.lat,livePos.lng],{icon,zIndexOffset:1000}).addTo(map)
        .bindPopup(`<b>🚗 Organiser</b><br/><small>${speed>0?`${speed.toFixed(0)} km/h`:'Stopped'}</small>`);
      bounds.push([livePos.lat,livePos.lng]);
    }

    if (bounds.length>1) map.fitBounds(bounds,{padding:[48,48]});
    else if (bounds.length===1) map.setView(bounds[0],12);

    // ETA + progress
    if (livePos && waypoints.length>0) {
      const dest = waypoints[waypoints.length-1];
      const km = haversine(livePos,dest);
      const min = Math.round(km/40*60);
      setEta(`~${min} min to ${dest.name.split(',')[0]}`);
      if (waypoints.length>1) {
        const start = waypoints[0];
        const totalKm = haversine(start,dest);
        const doneKm  = haversine(start,livePos);
        setProgress(Math.min(99,Math.round((doneKm/totalKm)*100)));
      }
    }
  }, [waypoints, checkins, livePos, mapReady]);

  useEffect(() => { redraw(); }, [redraw]);

  // GPS tracking (organiser)
  const startTracking = () => {
    if (!navigator.geolocation) return toast.error('GPS not available');
    setTracking(true);
    toast.success('📡 Live tracking started');
    watchRef.current = navigator.geolocation.watchPosition(async pos => {
      const { latitude:lat, longitude:lng, speed:spd } = pos.coords;
      const kmh = spd ? spd*3.6 : 0;
      setLivePos({lat,lng,speed:kmh}); setSpeed(kmh);
      pathCoords.current.push([lat,lng]);
      const now = Date.now();
      if (now-lastPush.current>15000) {
        lastPush.current=now;
        await api.post(`/tracking/trips/${tripId}/location`,{latitude:lat,longitude:lng,speed:kmh}).catch(()=>{});
      }
    }, err=>{toast.error('GPS: '+err.message);setTracking(false);}, {enableHighAccuracy:true,maximumAge:5000,timeout:12000});
  };

  const stopTracking = () => {
    if (watchRef.current!==null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current=null; setTracking(false); toast('📍 Tracking paused');
  };

  useEffect(()=>()=>{if(watchRef.current!==null) navigator.geolocation.clearWatch(watchRef.current);},[]);

  const shareLink = `${window.location.origin}/join/${tripId}`;
  const copyLink = () => { navigator.clipboard.writeText(shareLink); setCopied(true); toast.success('Link copied!'); setTimeout(()=>setCopied(false),2000); };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] pt-safe overflow-hidden">
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}.leaflet-container{z-index:0!important}`}</style>

      {/* Header */}
      <header className="glass z-20 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={()=>navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Live Map</h1>
          <button onClick={copyLink} className="btn-ghost py-2 px-3 text-xs border border-[var(--border)]">
            {copied ? <Check size={13} className="text-jade"/> : <Copy size={13}/>}
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </header>

      {/* Progress bar — visible when active */}
      {(tracking||livePos) && (
        <div className="flex-shrink-0 px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--muted)] font-medium">Trip Progress</span>
            <span className="font-bold text-brand">{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{width:`${progress}%`}}/>
          </div>
        </div>
      )}

      {/* Map — fills remaining space */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapRef} className="w-full h-full"/>

        {/* ETA chip */}
        {eta && livePos && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-[var(--surface)]/95 backdrop-blur-md rounded-full px-4 py-2 shadow-float flex items-center gap-2">
            <Navigation size={13} className="text-brand"/>
            <span className="text-sm font-bold text-[var(--text)]">{eta}</span>
          </div>
        )}

        {/* Speed chip */}
        {tracking && speed > 0 && (
          <div className="absolute top-3 right-3 z-10 bg-jade text-white rounded-2xl px-3 py-2 shadow-float text-center">
            <p className="font-display font-black text-xl leading-none">{speed.toFixed(0)}</p>
            <p className="text-white/70 text-[10px]">km/h</p>
          </div>
        )}

        {/* Tracking button (organiser only) */}
        {isOrg && (
          <div className="absolute bottom-4 right-4 z-10">
            <button onClick={tracking?stopTracking:startTracking}
              className={`flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-2xl shadow-float active:scale-95 transition-all ${tracking?'bg-rose-500 text-white':'btn-primary'}`}>
              {tracking ? <><Square size={15} fill="white"/>Stop</> : <>🚀 Go Live</>}
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-[var(--surface)]/95 backdrop-blur-md rounded-xl px-3 py-2.5 shadow-float space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--muted)]">
            <div className="w-6 h-1.5 bg-jade rounded"/>Completed
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--muted)]">
            <div className="w-6 h-0 border-t-2 border-dashed border-slate-400"/>Planned
          </div>
        </div>
      </div>

      {/* Waypoints strip */}
      <div className="flex-shrink-0 bg-[var(--surface)] border-t border-[var(--border)] px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-2xl mx-auto">
          {waypoints.map((w,i) => {
            const colMap: Record<string,string> = {start:'bg-jade text-white',stop:'bg-sky-500 text-white',end:'bg-brand text-white'};
            return (
              <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${colMap[w.type]||'bg-slate-400 text-white'}`}>{i+1}</div>
                <span className="text-xs font-semibold text-[var(--text)] truncate max-w-[80px]">{w.name?.split(',')[0]}</span>
              </div>
            );
          })}
          {checkins.map(c => (
            <div key={c.id} className="flex-shrink-0 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
              <span className="text-base">{CHECKIN_ICONS[c.icon]||'📍'}</span>
              <span className="text-xs font-semibold text-orange-700 truncate max-w-[80px]">{c.location_name?.split(',')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
