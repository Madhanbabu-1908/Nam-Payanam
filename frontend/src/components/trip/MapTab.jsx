import { useEffect, useRef, useState, useCallback } from 'react';
import { tripAPI, trackingAPI, checkinAPI } from '../../utils/api';
import { BottomSheet, Spinner, formatCurrency } from '../ui/index.jsx';
import toast from 'react-hot-toast';
import supabase from '../../utils/supabase.js';

const STOP_COLOR = { start:'#10b981', end:'#ef4444', stop:'#6366f1', stay:'#8b5cf6', attraction:'#f59e0b', food:'#f97316', fuel:'#64748b', rest:'#06b6d4', default:'#6366f1' };

function pinIcon(L, color, label, pulse=false) {
  return L.divIcon({
    html: `<div style="position:relative;width:38px;height:42px">
      ${pulse?`<div style="position:absolute;top:4px;left:4px;width:30px;height:30px;background:${color};border-radius:50%;opacity:0.3;animation:ping 1.5s infinite"></div>`:''}
      <div style="position:absolute;top:0;left:0;width:38px;height:38px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.25)">
        <div style="transform:rotate(45deg);width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:14px;color:white;font-weight:900">${label}</div>
      </div>
    </div>`,
    className:'', iconSize:[38,42], iconAnchor:[19,42]
  });
}

// Haversine distance km
function haversine(a, b) {
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

export default function MapTab({ trip, days, progress, session, onProgressUpdate }) {
  const mapRef        = useRef(null);
  const mapInst       = useRef(null);
  const vehicleMark   = useRef(null);
  const pathPoly      = useRef(null);
  const markerRefs    = useRef([]);
  const watchId       = useRef(null);
  const pathCoords    = useRef([]);
  const lastPush      = useRef(0);

  const [tracking, setTracking]   = useState(false);
  const [livePos, setLivePos]     = useState(null);
  const [speed, setSpeed]         = useState(0);
  const [eta, setEta]             = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [checkins, setCheckins]   = useState([]);
  const [mapReady, setMapReady]   = useState(false);
  const [showCheckinSheet, setShowCheckinSheet] = useState(false);
  const [showShareSheet, setShowShareSheet]     = useState(false);
  const [trackingUrl, setTrackingUrl]           = useState('');
  const [creatingLink, setCreatingLink]         = useState(false);
  const [checkinPos, setCheckinPos]   = useState(null);
  const [checkinName, setCheckinName] = useState('');
  const [savingCheckin, setSavingCheckin] = useState(false);
  const checkinMapRef = useRef(null);
  const checkinMapInst= useRef(null);
  const checkinPin    = useRef(null);

  const isOrg    = session?.isOrganizer;
  const isActive = trip?.status === 'active';
  const myCheckin = checkins.find(c => c.member_id === session?.memberId);

  // ── Build all waypoints from trip data ───────────────────
  const buildWaypoints = useCallback(() => {
    const pts = [];
    const addPt = (name, lat, lng, type) => {
      if (lat && lng) pts.push({ name: name?.split(',')[0], lat:+lat, lng:+lng, type });
    };
    addPt(trip?.start_location, trip?.start_lat, trip?.start_lng, 'start');
    // Middle stops from stops_data or stops array
    const stopsArr = trip?.stops_data?.length ? trip.stops_data : (trip?.stops || []);
    stopsArr.forEach((s,i) => {
      const obj = typeof s === 'object' ? s : { name:s };
      if (obj.lat && obj.lng) pts.push({ name:(obj.name||obj.label||`Stop ${i+1}`).split(',')[0], lat:+obj.lat, lng:+obj.lng, type:'stop' });
    });
    // Also check trip_days stops
    days?.forEach(day => {
      day.stops?.forEach(s => {
        if (s.lat && s.lng && !pts.find(p => p.lat===+s.lat && p.lng===+s.lng))
          pts.push({ name:s.name?.split(',')[0], lat:+s.lat, lng:+s.lng, type: s.type||'stop' });
      });
    });
    addPt(trip?.end_location, trip?.end_lat, trip?.end_lng, 'end');
    return pts;
  }, [trip, days]);

  // ── Geocode fallback ─────────────────────────────────────
  useEffect(() => {
    const pts = buildWaypoints();
    if (pts.length >= 2) { setWaypoints(pts); return; }
    const locs = [
      { name:trip?.start_location, type:'start' },
      ...(Array.isArray(trip?.stops)?trip.stops:[]).map((s,i)=>({ name:typeof s==='string'?s:(s.name||s.label||`Stop ${i+1}`), type:'stop' })),
      { name:trip?.end_location, type:'end' }
    ].filter(l=>l.name);
    (async()=>{
      const res=[];
      for(const loc of locs){
        try{
          const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc.name+', India')}&format=json&limit=1`,{headers:{'User-Agent':'NamPayanam/1.0'}});
          const d=await r.json();
          if(d[0]) res.push({name:loc.name.split(',')[0],type:loc.type,lat:+d[0].lat,lng:+d[0].lon});
        }catch{}
        await new Promise(r=>setTimeout(r,300));
      }
      setWaypoints(res);
    })();
  }, [trip?.id, days]);

  // ── Load path from DB ────────────────────────────────────
  useEffect(() => {
    if (!trip?.id) return;
    trackingAPI.getPath(trip.id).then(r => {
      if (r.path?.length) pathCoords.current = r.path.map(p => [+p.lat, +p.lng]);
    }).catch(()=>{});
    checkinAPI.getAll(trip.id).then(r => setCheckins(r.checkins||[])).catch(()=>{});
  }, [trip?.id]);

  // ── Realtime subscriptions ───────────────────────────────
  useEffect(() => {
    if (!trip?.id) return;
    const ch = supabase.channel(`map-rt-${trip.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'trip_progress',filter:`trip_id=eq.${trip.id}`}, p => {
        if (p.new?.current_lat && p.new?.current_lng) {
          const pos = { lat:+p.new.current_lat, lng:+p.new.current_lng, speed:+p.new.current_speed||0, ts:p.new.updated_at };
          setLivePos(pos);
          setSpeed(pos.speed||0);
          pathCoords.current.push([pos.lat, pos.lng]);
        }
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'member_checkins',filter:`trip_id=eq.${trip.id}`}, ()=>{
        checkinAPI.getAll(trip.id).then(r=>setCheckins(r.checkins||[])).catch(()=>{});
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, [trip?.id]);

  // ── Auto-start tracking when trip goes active (Req 1) ───
  useEffect(() => {
    if (isOrg && isActive && !tracking && waypoints.length >= 2 && !watchId.current) {
      startTracking(true); // auto-start = true, silent
    }
  }, [isOrg, isActive, waypoints.length]);

  // ── Realtime progress bar update ────────────────────────
  useEffect(() => {
    if (!livePos || waypoints.length < 2) return;
    // Find next unvisited stop and calculate ETA
    let nearest = waypoints[waypoints.length-1];
    let minDist = 99999;
    for (let i = 1; i < waypoints.length; i++) {
      const d = haversine(livePos, waypoints[i]);
      if (d < minDist) { minDist = d; nearest = waypoints[i]; }
    }
    const etaMin = Math.round(minDist / 40 * 60);
    setEta({ stop: nearest.name, min: etaMin, km: minDist.toFixed(1) });
  }, [livePos, waypoints]);

  // ── Init Leaflet ─────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current && !mapInst.current && window.L && waypoints.length >= 2) {
      const L = window.L;
      const center = [waypoints[0].lat, waypoints[0].lng];
      const map = L.map(mapRef.current, { zoomControl:false, attributionControl:false }).setView(center, 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
      L.control.zoom({position:'bottomright'}).addTo(map);
      mapInst.current = map;
      setMapReady(true);
    }
  }, [waypoints]);

  // ── Draw markers + route + path ──────────────────────────
  useEffect(() => {
    const map = mapInst.current;
    if (!map || !window.L || waypoints.length < 2) return;
    const L = window.L;

    // Clear previous custom layers
    map.eachLayer(l => { if(l._np) map.removeLayer(l); });
    markerRefs.current = [];
    const bounds = [];

    // Route waypoint markers
    waypoints.forEach((pt, i) => {
      const color = STOP_COLOR[pt.type]||STOP_COLOR.default;
      const lbl = pt.type==='start'?'🏠':pt.type==='end'?'🏁':String(i);
      const icon = pinIcon(L, color, lbl);
      const m = L.marker([pt.lat,pt.lng],{icon}).addTo(map)
        .bindPopup(`<b style="font-size:13px">${pt.name}</b><br><small style="color:#64748b;text-transform:capitalize">${pt.type}</small>`);
      m._np=true; markerRefs.current.push(m); bounds.push([pt.lat,pt.lng]);
    });

    // Planned route dashed line
    const planLine = L.polyline(waypoints.map(p=>[p.lat,p.lng]),{color:'#94a3b8',weight:3,dashArray:'10 6',opacity:0.7}).addTo(map);
    planLine._np=true;

    // Completed path (green)
    if (pathCoords.current.length > 1) {
      if(pathPoly.current) { map.removeLayer(pathPoly.current); pathPoly.current=null; }
      pathPoly.current = L.polyline(pathCoords.current,{color:'#10b981',weight:5,opacity:.9}).addTo(map);
      pathPoly.current._np=true;
    }

    // Live vehicle marker
    if (livePos) {
      const icon = pinIcon(L,'#ff6b35','🚗',true);
      if(vehicleMark.current) map.removeLayer(vehicleMark.current);
      vehicleMark.current = L.marker([livePos.lat,livePos.lng],{icon,zIndexOffset:1000}).addTo(map)
        .bindPopup(`<b>🚗 Vehicle</b><br><small>${speed>0?`${speed.toFixed(1)} km/h`:'Stationary'}</small>`);
      vehicleMark.current._np=true;
      bounds.push([livePos.lat,livePos.lng]);
    }

    // Member checkin pins
    checkins.forEach(c=>{
      if(!c.checkin_lat||!c.checkin_lng) return;
      const col = c.status==='picked_up'?'#10b981':c.status==='acknowledged'?'#f59e0b':'#4f46e5';
      const icon = L.divIcon({
        html:`<div style="background:${col};border:2.5px solid white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.2)">🙋</div>`,
        className:'',iconSize:[34,34],iconAnchor:[17,17]
      });
      const label = c.status==='picked_up'?'Picked up ✅':c.status==='acknowledged'?'On the way 🚗':'Waiting for pickup ⏳';
      const m = L.marker([+c.checkin_lat,+c.checkin_lng],{icon}).addTo(map)
        .bindPopup(`<b>${c.nickname}</b><br><small>${c.checkin_name||''}</small><br><span style="color:${col};font-size:11px">${label}</span>`);
      m._np=true; bounds.push([+c.checkin_lat,+c.checkin_lng]);
    });

    if (bounds.length>1) map.fitBounds(bounds,{padding:[40,40]});
    else if (bounds.length===1) map.setView(bounds[0],12);
  }, [waypoints, livePos, checkins, mapReady, pathCoords.current.length]);

  // ── GPS tracking (Req 1 + Req 3) ────────────────────────
  async function startTracking(silent=false) {
    if (!navigator.geolocation) return toast.error('GPS not available on this device');
    if (watchId.current) return; // already watching

    setTracking(true);
    if (!silent) toast.success('📡 Live tracking started');

    watchId.current = navigator.geolocation.watchPosition(
      async pos => {
        const { latitude:lat, longitude:lng, speed:spd, accuracy } = pos.coords;
        const kmh = spd ? spd*3.6 : 0;
        setLivePos({lat,lng,speed:kmh,ts:new Date().toISOString()});
        setSpeed(kmh);
        pathCoords.current.push([lat,lng]);

        const now = Date.now();
        if (now - lastPush.current > 15000) { // push every 15s
          lastPush.current = now;
          try {
            await trackingAPI.push({ tripId:trip.id, lat, lng, speed:kmh });
            // also update progress in DB for realtime broadcast
            await tripAPI.updateProgress(trip.id, { lat, lng, speed:kmh });
          } catch {}
        }

        // Req 1: If organiser started from a different location — reroute
        if (waypoints.length>=2) {
          const startDist = haversine({lat,lng}, waypoints[0]);
          if (startDist > 0.5 && pathCoords.current.length===1) { // >500m from planned start
            toast(`📍 Started from a different location — map auto-adjusted`, {icon:'🗺️',duration:4000});
          }
        }
      },
      err => { toast.error('GPS error: '+err.message); setTracking(false); watchId.current=null; },
      { enableHighAccuracy:true, maximumAge:5000, timeout:12000 }
    );
  }

  function stopTracking() {
    if(watchId.current!==null){ navigator.geolocation.clearWatch(watchId.current); watchId.current=null; }
    setTracking(false);
    toast('📍 Live tracking paused');
  }

  // Cleanup on unmount
  useEffect(()=>()=>{ if(watchId.current!==null) navigator.geolocation.clearWatch(watchId.current); },[]);

  // ── Checkin mini-map ─────────────────────────────────────
  useEffect(()=>{
    if(!showCheckinSheet||!checkinMapRef.current||checkinMapInst.current||!window.L) return;
    const L=window.L;
    const center=[11.0,77.0];
    const map=L.map(checkinMapRef.current,{zoomControl:true,attributionControl:false}).setView(center,10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    checkinMapInst.current=map;
    const icon=L.divIcon({html:`<div style="background:#4f46e5;border:3px solid white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 10px rgba(79,70,229,.5)">📍</div>`,className:'',iconSize:[34,34],iconAnchor:[17,17]});
    const pin=L.marker(center,{icon,draggable:true}).addTo(map);
    checkinPin.current=pin;
    const revGeo=async(lat,lng)=>{
      try{
        const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,{headers:{'User-Agent':'NamPayanam/1.0'}});
        const d=await r.json();
        const n=d.address?.city||d.address?.town||d.address?.village||d.address?.suburb||d.display_name?.split(',')[0]||'Selected location';
        setCheckinPos({lat,lng}); setCheckinName(n);
      }catch{ setCheckinPos({lat,lng}); }
    };
    pin.on('dragend',()=>{ const{lat,lng}=pin.getLatLng(); revGeo(lat,lng); });
    map.on('click',e=>{ pin.setLatLng(e.latlng); revGeo(e.latlng.lat,e.latlng.lng); });
    return()=>{ map.remove(); checkinMapInst.current=null; };
  },[showCheckinSheet]);

  async function useMyGPS() {
    if(!navigator.geolocation) return toast.error('GPS not available');
    navigator.geolocation.getCurrentPosition(async pos=>{
      const{latitude:lat,longitude:lng}=pos.coords;
      try{
        const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,{headers:{'User-Agent':'NamPayanam/1.0'}});
        const d=await r.json();
        const n=d.address?.city||d.address?.town||d.address?.suburb||'Current location';
        setCheckinPos({lat,lng}); setCheckinName(n);
        if(checkinPin.current&&checkinMapInst.current){ checkinPin.current.setLatLng([lat,lng]); checkinMapInst.current.setView([lat,lng],14); }
      }catch{ setCheckinPos({lat,lng}); }
    },err=>toast.error(err.message),{enableHighAccuracy:true,timeout:10000});
  }

  async function submitCheckin() {
    if(!checkinPos) return toast.error('Pick your location first');
    setSavingCheckin(true);
    try{
      await checkinAPI.create({tripId:trip.id,memberId:session.memberId,nickname:session.nickname,lat:checkinPos.lat,lng:checkinPos.lng,name:checkinName});
      toast.success('📍 Pickup request sent to organiser!');
      setShowCheckinSheet(false);
      checkinAPI.getAll(trip.id).then(r=>setCheckins(r.checkins||[]));
    }catch(err){ toast.error(err.message); }
    finally{ setSavingCheckin(false); }
  }

  async function createShareLink(){
    setCreatingLink(true);
    try{
      const r=await trackingAPI.createToken({tripId:trip.id,label:'Family Tracker',expiresInHours:72});
      const url=`${window.location.origin}/track/${r.token}`;
      await navigator.clipboard.writeText(url);
      setTrackingUrl(url);
      toast.success('🔗 Tracking link copied!');
    }catch(err){ toast.error(err.message); }
    finally{ setCreatingLink(false); }
  }

  // Realtime progress %
  const totalStops = waypoints.length;
  let completedStops = 0;
  if (livePos && waypoints.length>0) {
    waypoints.forEach(w=>{ if(haversine(livePos,w)<0.3) completedStops++; });
  }
  const progressPct = totalStops>1 ? Math.round((completedStops/(totalStops-1))*100) : 0;
  const pendingCheckins = checkins.filter(c=>c.status!=='picked_up');

  return (
    <div className="flex flex-col pb-24 animate-fade-in">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"/>
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}.leaflet-container{z-index:1!important}.leaflet-pane,.leaflet-top,.leaflet-bottom{z-index:2!important}`}</style>

      {/* ── Live tracking control ─────────────────────────── */}
      {isActive && (
        <div className="mx-4 mt-4 mb-2 space-y-2">
          {isOrg ? (
            <div className={`rounded-2xl p-4 flex items-center justify-between ${tracking?'bg-gradient-to-r from-emerald-500 to-emerald-700':'bg-gradient-to-r from-indigo-600 to-indigo-800'}`}>
              <div>
                <div className="flex items-center gap-2">
                  {tracking&&<div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"/>}
                  <span className="font-bold text-white text-sm">{tracking?'📡 Broadcasting Live Location':'📍 Start Live Tracking'}</span>
                </div>
                <p className="text-white/70 text-xs mt-0.5">{tracking?`${speed>0?`${speed.toFixed(0)} km/h · `:''}Group sees your position`:'Auto-starts when trip begins'}</p>
              </div>
              <button onClick={tracking?stopTracking:()=>startTracking(false)}
                className="flex-shrink-0 bg-white font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95"
                style={{color:tracking?'#10b981':'#4f46e5'}}>
                {tracking?'⏸ Pause':'🚀 Go Live'}
              </button>
            </div>
          ) : (
            <div className={`rounded-2xl p-3 flex items-center justify-between ${livePos?'bg-emerald-50 border border-emerald-200':'bg-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${livePos?'bg-emerald-500 animate-pulse':'bg-slate-400'}`}/>
                <span className={`font-bold text-sm ${livePos?'text-emerald-700':'text-slate-500'}`}>
                  {livePos?`🚗 Organiser is live · ${speed>0?`${speed.toFixed(0)} km/h`:'Stationary'}`:'Organiser not broadcasting yet'}
                </span>
              </div>
              {livePos&&<span className="text-xs text-emerald-500">{new Date(livePos.ts).toLocaleTimeString('en-IN')}</span>}
            </div>
          )}

          {/* Non-organiser checkin */}
          {!isOrg && !myCheckin && (
            <button onClick={()=>setShowCheckinSheet(true)}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95">
              🚖 Set My Pickup Point (Joining mid-trip)
            </button>
          )}
          {!isOrg && myCheckin && (
            <div className={`rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 ${myCheckin.status==='picked_up'?'bg-emerald-100 text-emerald-700':myCheckin.status==='acknowledged'?'bg-amber-100 text-amber-700':'bg-indigo-100 text-indigo-700'}`}>
              {myCheckin.status==='picked_up'?'✅ You\'ve been picked up!':myCheckin.status==='acknowledged'?'🚗 Organiser is on the way!':
               `📍 Waiting at ${myCheckin.checkin_name||'your location'}`}
            </div>
          )}
        </div>
      )}

      {/* ETA strip */}
      {eta&&isActive&&(
        <div className="mx-4 mb-2 bg-indigo-600 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">🎯 {eta.km}km to {eta.stop}</span>
          <span className="text-white font-black">~{eta.min} min</span>
        </div>
      )}

      {/* Realtime progress (Req 3) — visible to ALL members */}
      {isActive && livePos && (
        <div className="mx-4 mb-2 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-700 text-xs">🛣️ Trip Progress (Live)</span>
            <span className="font-black text-indigo-600 text-sm">{progressPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-1000" style={{width:`${progressPct}%`}}/>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-slate-400">{trip?.start_location?.split(',')[0]}</span>
            <span className="text-[10px] text-slate-400">{trip?.end_location?.split(',')[0]}</span>
          </div>
        </div>
      )}

      {/* ── Map ─────────────────────────────────────────── */}
      <div className="relative mx-4 rounded-2xl overflow-hidden border border-slate-200 shadow-md" style={{height:340}}>
        {waypoints.length<2&&(
          <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center z-10">
            <Spinner size="lg" color="indigo"/><p className="text-sm text-slate-500 font-semibold mt-3">Plotting route...</p>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full"/>
        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl p-2 shadow z-10 space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500"><div className="w-6 h-2 bg-emerald-500 rounded"/>Completed</div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400"><div className="w-6 h-0 border-t-2 border-dashed border-slate-400"/>Planned</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        {isOrg&&isActive&&(
          <button onClick={()=>setShowShareSheet(true)} className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-700 active:bg-slate-50">
            🔗 Share Tracker
          </button>
        )}
        <button onClick={async()=>{
          if(!isOrg&&isActive&&!myCheckin){ setShowCheckinSheet(true); return; }
          // Center map on current live position
          if(livePos&&mapInst.current) mapInst.current.setView([livePos.lat,livePos.lng],14);
        }} className={`flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-700 active:bg-slate-50 ${(!isOrg||!isActive)?'col-span-2':''}`}>
          {livePos?'📍 Centre on Vehicle':'🗺️ View Route'}
        </button>
      </div>

      {/* ── Route stops list ──────────────────────────── */}
      <div className="px-4 mt-4 space-y-2">
        <h3 className="font-display font-bold text-slate-700 text-sm">🗺️ Route Stops ({waypoints.length})</h3>
        {waypoints.map((s,i)=>{
          const reached = livePos && haversine(livePos,s)<0.5;
          return (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm ${reached?'bg-emerald-50 border-emerald-200':'bg-white border-slate-100'}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{background:STOP_COLOR[s.type]||STOP_COLOR.default}}>{i+1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-400 capitalize">{s.type}</div>
              </div>
              {reached&&<span className="text-emerald-600 font-bold text-xs">✓ Here</span>}
            </div>
          );
        })}
      </div>

      {/* ── Organiser: pending checkins ───────────────── */}
      {isOrg&&pendingCheckins.length>0&&(
        <div className="px-4 mt-4 space-y-2">
          <h3 className="font-display font-bold text-slate-700 text-sm">🙋 Pickup Requests ({pendingCheckins.length})</h3>
          {pendingCheckins.map(c=>(
            <div key={c.id} className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{c.nickname}</div>
                  <div className="text-xs text-slate-500 mt-0.5">📍 {c.checkin_name||`${(+c.checkin_lat).toFixed(4)}, ${(+c.checkin_lng).toFixed(4)}`}</div>
                  <span className={`mt-1 text-xs font-bold px-2 py-0.5 rounded-full inline-block ${c.status==='acknowledged'?'bg-amber-100 text-amber-700':'bg-indigo-100 text-indigo-700'}`}>
                    {c.status==='acknowledged'?'🚗 On the way':'⏳ Waiting'}
                  </span>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {c.status==='waiting'&&<button onClick={async()=>{await checkinAPI.acknowledge(c.id);checkinAPI.getAll(trip.id).then(r=>setCheckins(r.checkins||[]));toast.success(`Acknowledged ${c.nickname}`);}} className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl active:scale-95">Acknowledge</button>}
                  {c.status==='acknowledged'&&<button onClick={async()=>{await checkinAPI.markPickup(c.id);checkinAPI.getAll(trip.id).then(r=>setCheckins(r.checkins||[]));toast.success(`${c.nickname} picked up!`);}} className="text-xs bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl active:scale-95">Mark Picked Up ✅</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Share tracker sheet ───────────────────────── */}
      <BottomSheet isOpen={showShareSheet} onClose={()=>setShowShareSheet(false)} title="📡 Share Live Tracker">
        <div className="space-y-4 pb-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="font-bold text-indigo-800 text-sm">WhatsApp-style tracking link</p>
            <p className="text-xs text-indigo-600 mt-1">Share with family/friends. They see your live position without joining the trip. Valid 72 hours.</p>
          </div>
          <button onClick={createShareLink} disabled={creatingLink} className="btn-indigo w-full py-4">
            {creatingLink?<Spinner size="sm" color="white"/>:'🔗'}
            {creatingLink?'Generating link...':'Generate & Copy Tracking Link'}
          </button>
          {trackingUrl&&(
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-bold text-emerald-700 break-all">{trackingUrl}</p>
              <button onClick={()=>{navigator.clipboard.writeText(trackingUrl);toast.success('Copied!');}} className="mt-2 text-xs text-emerald-600 font-bold underline">Copy again</button>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* ── Member checkin sheet ──────────────────────── */}
      <BottomSheet isOpen={showCheckinSheet} onClose={()=>setShowCheckinSheet(false)} title="📍 Set Pickup Location">
        <div className="space-y-4 pb-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <p className="font-bold text-indigo-800 text-sm">Joining mid-trip?</p>
            <p className="text-xs text-indigo-600 mt-1">Pin your location so the organiser can pick you up.</p>
          </div>
          <button onClick={useMyGPS} className="btn-indigo w-full py-3">📡 Use My Current GPS Location</button>
          <p className="text-xs text-slate-400 text-center font-semibold">— or tap/drag on map below —</p>
          <div ref={checkinMapRef} className="w-full rounded-2xl overflow-hidden border border-slate-200" style={{height:220}}/>
          {checkinPos&&(
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="font-bold text-emerald-800 text-sm">📍 {checkinName||'Selected location'}</div>
              <div className="text-xs text-emerald-600 mt-0.5">{checkinPos.lat.toFixed(5)}, {checkinPos.lng.toFixed(5)}</div>
            </div>
          )}
          {checkinPos&&(
            <div>
              <label className="label">Add a note (optional)</label>
              <input className="input" placeholder="e.g. Near Salem bus stand, Gate 2" value={checkinName} onChange={e=>setCheckinName(e.target.value)}/>
            </div>
          )}
          <button onClick={submitCheckin} disabled={!checkinPos||savingCheckin} className="btn-primary w-full py-4">
            {savingCheckin?<Spinner size="sm" color="white"/>:'🚖'}
            {savingCheckin?'Sending to organiser...':'Send Pickup Request'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
