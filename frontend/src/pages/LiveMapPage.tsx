import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Navigation, Copy, CheckCircle, Play, Square, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

declare const L: any;

const MEMBER_ICONS = ['🧑','👩','🧔','👱','🙋','🙍','🧕','👲'];
const VEHICLE_COLORS = ['#FF6B35','#10B981','#3B82F6','#8B5CF6','#F59E0B'];

const PIN = (label:string, color:string, pulse=false) => `
  <div style="position:relative;display:flex;flex-direction:column;align-items:center">
    ${pulse?`<div style="position:absolute;top:-4px;left:-4px;width:46px;height:46px;background:${color};border-radius:50%;opacity:.25;animation:ping 1.5s infinite"></div>`:''}
    <div style="width:38px;height:38px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
      <span style="transform:rotate(45deg);font-size:14px">${label}</span>
    </div>
  </div>`;

const WAITING_PIN = (memberName:string, icon:string, color:string) => `
  <div style="position:relative;display:flex;flex-direction:column;align-items:center">
    <div style="background:white;border:3px solid ${color};border-radius:12px;padding:4px 8px;box-shadow:0 3px 10px rgba(0,0,0,.2);white-space:nowrap;font-size:11px;font-weight:700;color:#1f2937;display:flex;align-items:center;gap:4px">
      <span>${icon}</span><span>${memberName} is waiting</span>
    </div>
    <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-1px"></div>
  </div>`;

export default function LiveMapPage() {
  const { tripId }  = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInst     = useRef<any>(null);
  const vehicleMk   = useRef<any>(null);
  const routeLine   = useRef<any>(null);
  const doneLine    = useRef<any>(null);
  const pathPts     = useRef<[number,number][]>([]);
  const watchRef    = useRef<number|null>(null);
  const lastPush    = useRef(0);
  const checkinMks  = useRef<Record<string,any>>({});

  const [trip, setTrip]         = useState<any>(null);
  const [tracking, setTracking] = useState(false);
  const [speed, setSpeed]       = useState(0);
  const [waypoints, setWps]     = useState<any[]>([]);
  const [livePos, setLivePos]   = useState<{lat:number;lng:number}|null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isOrg, setIsOrg]       = useState(false);
  const [eta, setEta]           = useState<string|null>(null);
  const [copied, setCopied]     = useState(false);
  const [progressPct, setPct]   = useState(0);
  const [checkins, setCheckins] = useState<any[]>([]);
  // check-in form
  const [showCheckin, setShowCheckin] = useState(false);
  const [ciLocation, setCiLoc]        = useState('');
  const [ciLat, setCiLat]             = useState<number|null>(null);
  const [ciLng, setCiLng]             = useState<number|null>(null);
  const [ciGetting, setCiGetting]     = useState(false);
  const [ciSaving, setCiSaving]       = useState(false);

  const dist = (a:any,b:any) => {
    const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  };

  // Load trip + checkins
  const loadData = useCallback(async()=>{
    if (!tripId) return;
    try {
      const [tRes, cRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/checkins/trip/${tripId}`).catch(()=>({data:{data:[]}})),
      ]);
      const t = tRes.data.data;
      setTrip(t);
      setIsOrg(t.organizer_id===user?.id);
      const wps:any[]=[];
      if(t.start_lat&&t.start_lng) wps.push({name:t.start_location||'Start',lat:+t.start_lat,lng:+t.start_lng,type:'start'});
      (t.stops||[]).forEach((s:any,i:number)=>{ if(s.lat&&s.lng) wps.push({name:s.name||`Stop ${i+1}`,lat:+s.lat,lng:+s.lng,type:'stop'}); });
      if(t.destination_lat&&t.destination_lng) wps.push({name:t.destination,lat:+t.destination_lat,lng:+t.destination_lng,type:'end'});
      setWps(wps);
      setCheckins(cRes.data.data||[]);
    } catch(e){ console.error(e); }
  },[tripId,user]);

  useEffect(()=>{ loadData(); const iv=setInterval(loadData,20000); return()=>clearInterval(iv); },[loadData]);

  // Load path history
  useEffect(()=>{
    if (!tripId) return;
    api.get(`/tracking/trips/${tripId}/path`).then(r=>{
      pathPts.current = (r.data.data||[]).map((p:any)=>[+p.latitude,+p.longitude]);
    }).catch(()=>{});
  },[tripId]);

  // Init Leaflet
  useEffect(()=>{
    if (!mapRef.current||mapInst.current||!L||waypoints.length===0) return;
    const c = waypoints[0]?[waypoints[0].lat,waypoints[0].lng]:[11.0,77.0];
    const map=L.map(mapRef.current,{zoomControl:false,attributionControl:false}).setView(c,10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    L.control.zoom({position:'bottomright'}).addTo(map);
    mapInst.current=map;
    setMapReady(true);
  },[waypoints]);

  // Draw waypoints + route + check-ins
  useEffect(()=>{
    const map=mapInst.current;
    if (!map||!L||!mapReady) return;

    // Clear route/stop layers
    map.eachLayer((l:any)=>{ if(l._np) map.removeLayer(l); });
    Object.values(checkinMks.current).forEach((m:any)=>map.removeLayer(m));
    checkinMks.current={};
    if(routeLine.current) map.removeLayer(routeLine.current);
    if(doneLine.current)  map.removeLayer(doneLine.current);

    const bounds:[number,number][]=[];
    const colors={start:'#10B981',end:'#EF4444',stop:'#3B82F6'};

    waypoints.forEach((wp,i)=>{
      const color=(colors as any)[wp.type]||'#6366f1';
      const icon=L.divIcon({html:PIN(i===0?'🏠':'🏁',color),className:'',iconSize:[38,44],iconAnchor:[19,44]});
      const m=L.marker([wp.lat,wp.lng],{icon}).addTo(map).bindPopup(`<b>${wp.name}</b>`);
      m._np=true; bounds.push([wp.lat,wp.lng]);
    });

    // Planned dashed line
    if(waypoints.length>=2){
      const l=L.polyline(waypoints.map(w=>[w.lat,w.lng]),{color:'#94a3b8',weight:4,dashArray:'10 6',opacity:.7}).addTo(map);
      l._np=true;
    }

    // Completed path
    if(pathPts.current.length>1){
      doneLine.current=L.polyline(pathPts.current,{color:'#10B981',weight:5,opacity:.9}).addTo(map);
      doneLine.current._np=true;
    }

    // Live vehicle
    if(livePos){
      const icon=L.divIcon({html:PIN('🚗','#FF6B35',true),className:'',iconSize:[38,44],iconAnchor:[19,44]});
      if(vehicleMk.current) vehicleMk.current.setLatLng([livePos.lat,livePos.lng]);
      else { vehicleMk.current=L.marker([livePos.lat,livePos.lng],{icon,zIndexOffset:1000}).addTo(map); vehicleMk.current._np=true; }
      bounds.push([livePos.lat,livePos.lng]);
    }

    // Check-in pins — "John is waiting here"
    checkins.forEach((ci,i)=>{
      if (!ci.latitude||!ci.longitude) return;
      const icon_emoji=MEMBER_ICONS[i%MEMBER_ICONS.length];
      const color=VEHICLE_COLORS[(i+1)%VEHICLE_COLORS.length];
      const mName = ci.user?.full_name||ci.user?.email?.split('@')[0]||`Member ${i+1}`;
      const icon=L.divIcon({html:WAITING_PIN(mName,icon_emoji,color),className:'',iconSize:[120,50],iconAnchor:[60,50]});
      const m=L.marker([+ci.latitude,+ci.longitude],{icon,zIndexOffset:900}).addTo(map)
        .bindPopup(`<b>${mName}</b><br/>${ci.location_name}`);
      checkinMks.current[ci.id]=m;
    });

    if(bounds.length>1) map.fitBounds(bounds,{padding:[40,40]});
    else if(bounds.length===1) map.setView(bounds[0],12);
  },[waypoints,livePos,mapReady,checkins]);

  // GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation) { toast.error('GPS not available'); return; }
    setTracking(true);
    watchRef.current=navigator.geolocation.watchPosition(async pos=>{
      const {latitude:lat,longitude:lng,speed:spd}=pos.coords;
      const kmh=spd?spd*3.6:0;
      setSpeed(kmh); setLivePos({lat,lng});
      pathPts.current.push([lat,lng]);

      const now=Date.now();
      if(now-lastPush.current>15000){
        lastPush.current=now;
        api.post(`/tracking/trips/${tripId}/location`,{latitude:lat,longitude:lng,speed:kmh}).catch(()=>{});
      }

      const dest=waypoints.find(w=>w.type==='end');
      if(dest){
        const km=dist({lat,lng},dest);
        const min=Math.round(km/40*60);
        setEta(`~${min} min to ${dest.name.split(',')[0]}`);
        const start=waypoints.find(w=>w.type==='start');
        if(start){ const total=dist(start,dest); setPct(Math.min(99,Math.round((1-km/total)*100))); }
      }
    }, err=>{ toast.error('GPS: '+err.message); setTracking(false); },
      {enableHighAccuracy:true,maximumAge:5000,timeout:12000});
  };

  const stopTracking=()=>{
    if(watchRef.current!==null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current=null; setTracking(false);
  };
  useEffect(()=>()=>{ if(watchRef.current!==null) navigator.geolocation.clearWatch(watchRef.current); },[]);

  // Get current GPS for check-in
  async function getMyLocation(){
    setCiGetting(true);
    return new Promise<void>(resolve=>{
      navigator.geolocation.getCurrentPosition(async pos=>{
        const {latitude:lat,longitude:lng}=pos.coords;
        setCiLat(lat); setCiLng(lng);
        try {
          const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,{headers:{'User-Agent':'NamPayanam/1.0'}});
          const d=await r.json();
          const name=d.address?.city||d.address?.town||d.address?.village||`${lat.toFixed(4)},${lng.toFixed(4)}`;
          setCiLoc(name);
        } catch { setCiLoc(`${lat.toFixed(4)},${lng.toFixed(4)}`); }
        setCiGetting(false); resolve();
      }, ()=>{ toast.error('Could not get GPS'); setCiGetting(false); resolve(); }, {timeout:8000});
    });
  }

  async function submitCheckin(){
    if (!ciLocation.trim()) { toast.error('Enter your location'); return; }
    setCiSaving(true);
    try {
      await api.post('/checkins',{tripId, locationName:ciLocation, latitude:ciLat, longitude:ciLng, status:'PRESENT'});
      toast.success('✅ Checked in!');
      setShowCheckin(false); setCiLoc(''); setCiLat(null); setCiLng(null);
      await loadData();
    } catch(e:any){ toast.error(e.response?.data?.error||'Check-in failed'); }
    finally { setCiSaving(false); }
  }

  const shareLink=`${window.location.origin}/track/${tripId}`;

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] pt-safe">
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>

      <header className="glass z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={()=>navigate(-1)} className="btn-icon bg-[var(--bg)]"><ArrowLeft size={20} className="text-[var(--muted)]"/></button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Live Map</h1>
          {/* Check-in button for all members */}
          <button onClick={()=>setShowCheckin(true)}
            className="btn-ghost py-2 px-3 text-xs border border-[var(--border)] flex items-center gap-1.5">
            <MapPin size={14} className="text-brand"/> Check In
          </button>
          <button onClick={()=>{ navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
            className="btn-ghost py-2 px-3 text-xs border border-[var(--border)]">
            {copied?<><CheckCircle size={14} className="text-emerald-500"/>Copied!</>:<><Copy size={14}/>Share</>}
          </button>
        </div>
      </header>

      {(tracking||livePos)&&(
        <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--muted)]">Trip progress</span>
            <span className="font-bold text-brand">{progressPct}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{width:`${progressPct}%`}}/></div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full"/>

        {eta&&(
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[var(--surface)]/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-float flex items-center gap-2 z-10">
            <Navigation size={14} className="text-brand"/>
            <span className="text-sm font-bold text-[var(--text)]">{eta}</span>
          </div>
        )}
        {tracking&&(
          <div className="absolute bottom-20 left-4 bg-emerald-500 text-white rounded-2xl px-4 py-2.5 shadow-float z-10">
            <p className="font-display font-black text-xl leading-none">{speed.toFixed(0)}</p>
            <p className="text-white/70 text-[10px]">km/h</p>
          </div>
        )}

        {/* Tracking control */}
        <div className="absolute bottom-4 right-4 z-10">
          {isOrg ? (
            <button onClick={tracking?stopTracking:startTracking}
              className={`flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-2xl shadow-float transition-all active:scale-95 ${tracking?'bg-rose-500 text-white':'bg-brand text-white shadow-brand'}`}>
              {tracking?<><Square size={16} fill="white"/>Stop GPS</>:<><Play size={16} fill="white"/>Go Live</>}
            </button>
          ) : (
            <div className="bg-[var(--surface)]/90 backdrop-blur-sm rounded-2xl px-3 py-2 text-xs text-[var(--muted)] font-semibold border border-[var(--border)]">
              👁 Watching organiser
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--surface)]/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md z-10 flex gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-semibold"><div className="w-5 h-1.5 bg-emerald-500 rounded"/>Done</div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-semibold"><div className="w-5 h-0 border-t-2 border-dashed border-slate-400"/>Planned</div>
        </div>
      </div>

      {/* Waypoints strip */}
      <div className="bg-[var(--surface)] border-t border-[var(--border)] px-4 py-3 max-h-36 overflow-y-auto">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {waypoints.map((w,i)=>(
            <div key={i} className="flex-shrink-0 flex items-center gap-2 bg-[var(--bg)] rounded-xl px-3 py-2 border border-[var(--border)]">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{background:w.type==='start'?'#10B981':w.type==='end'?'#EF4444':'#3B82F6'}}>
                {i+1}
              </div>
              <span className="text-xs font-semibold text-[var(--text)] truncate max-w-[80px]">{w.name?.split(',')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Check-in sheet */}
      {showCheckin&&(
        <>
          <div className="sheet-overlay" onClick={()=>setShowCheckin(false)}/>
          <div className="sheet">
            <div className="sheet-handle"/>
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-display font-bold text-[var(--text)] text-lg">Check In</h2>
              <button onClick={()=>setShowCheckin(false)} className="btn-icon bg-[var(--bg)] text-lg text-[var(--muted)]">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4 pb-safe">
              <p className="text-sm text-[var(--muted)]">Let the group know where you are. Your pin will appear on the live map.</p>
              <div>
                <label className="label">Your Location</label>
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="e.g. Hotel lobby, Bus stop…"
                    value={ciLocation} onChange={e=>setCiLoc(e.target.value)}/>
                  <button type="button" onClick={getMyLocation} disabled={ciGetting}
                    className="btn-ghost py-2.5 px-3 flex-shrink-0 border border-[var(--border)]">
                    {ciGetting?<div className="w-4 h-4 border-2 border-[var(--muted)] border-t-brand rounded-full animate-spin"/>:<MapPin size={16}/>}
                  </button>
                </div>
                {ciLat&&<p className="text-xs text-[var(--muted)] mt-1">📍 GPS: {ciLat.toFixed(4)}, {ciLng?.toFixed(4)}</p>}
              </div>
              <button onClick={submitCheckin} disabled={ciSaving||!ciLocation.trim()}
                className="btn-primary w-full py-4">
                {ciSaving?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Checking in…</>:<><MapPin size={16}/>Check In Here</>}
              </button>

              {/* Recent check-ins */}
              {checkins.length>0&&(
                <div>
                  <p className="text-xs font-bold text-[var(--muted)] uppercase mb-2">Group Check-ins</p>
                  <div className="space-y-2">
                    {checkins.slice(0,5).map((c,i)=>(
                      <div key={c.id} className="flex items-center gap-3 bg-[var(--bg)] rounded-xl px-3 py-2.5">
                        <span className="text-xl">{MEMBER_ICONS[i%MEMBER_ICONS.length]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--text)] truncate">{c.user?.full_name||c.user?.email?.split('@')[0]||'Member'}</p>
                          <p className="text-xs text-[var(--muted)] flex items-center gap-1"><MapPin size={11}/>{c.location_name}</p>
                        </div>
                        <span className="text-[10px] text-[var(--muted)]">{new Date(c.checked_in_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
