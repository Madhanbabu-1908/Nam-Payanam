import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, Sparkles, PencilLine, Plus, X, Navigation } from 'lucide-react';
import { Button } from '../components/common/Button';

declare const L: any;
const LABELS = 'ABCDEFGHIJ';

async function osrmRoute(wps: {lat:number;lng:number}[]) {
  if (wps.length < 2) return null;
  const coords = wps.map(w=>`${w.lng},${w.lat}`).join(';');
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    const d = await r.json();
    if (d.code !== 'Ok') return null;
    const s = d.routes[0].duration;
    return {
      geom: d.routes[0].geometry.coordinates as [number,number][],
      km: Math.round(d.routes[0].distance/100)/10,
      time: s>=3600 ? `${Math.floor(s/3600)}h ${Math.round((s%3600)/60)}m` : `${Math.round(s/60)}m`,
    };
  } catch { return null; }
}

async function nominatim(q: string) {
  if (q.length < 2) return [];
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q+', India')}&limit=5`,{headers:{'User-Agent':'NamPayanam/1.0'}});
    const d = await r.json();
    return d.map((x:any)=>({name:x.display_name.split(',')[0],full:x.display_name,lat:parseFloat(x.lat),lng:parseFloat(x.lon)}));
  } catch { return []; }
}

interface WP { id:string; name:string; lat:number; lng:number; }

const PIN_HTML = (label:string, color:string) =>
  `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:13px;box-shadow:0 3px 10px rgba(0,0,0,.3)">${label}</div>
    <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color}"></div>
  </div>`;

export default function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'AI'|'MANUAL'>('AI');
  const [wps, setWps] = useState<WP[]>([]);
  const [searches, setSearches] = useState<Record<string,{q:string;results:any[];open:boolean}>>({});
  const [route, setRoute] = useState<{km:number;time:string}|null>(null);
  const [routing, setRouting] = useState(false);
  const [form, setForm] = useState({name:'',start_date:'',end_date:'',budget:'',interests:''});
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const routeLine = useRef<any>(null);
  const debounce = useRef<Record<string,any>>({});

  // Init 2 empty waypoints
  useEffect(()=>{
    const s = newWP(), e = newWP();
    setWps([s,e]);
    setSearches({[s.id]:{q:'',results:[],open:false},[e.id]:{q:'',results:[],open:false}});
  },[]);

  function newWP(): WP { return {id:crypto.randomUUID(),name:'',lat:0,lng:0}; }

  // Init Leaflet
  useEffect(()=>{
    if (!mapRef.current || map.current || !L) return;
    map.current = L.map(mapRef.current,{zoomControl:false}).setView([20.5937,78.9629],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map.current);
    L.control.zoom({position:'bottomright'}).addTo(map.current);
  },[]);

  // Redraw map on waypoint change
  useEffect(()=>{
    if (!map.current || !L) return;
    markers.current.forEach(m=>map.current.removeLayer(m));
    markers.current=[];
    if (routeLine.current) { map.current.removeLayer(routeLine.current); routeLine.current=null; }
    setRoute(null);

    const valid = wps.filter(w=>w.lat&&w.lng);
    const bounds: [number,number][] = [];

    valid.forEach((wp,i)=>{
      const color = i===0?'#10B981':i===valid.length-1?'#EF4444':'#3B82F6';
      const icon = L.divIcon({html:PIN_HTML(LABELS[i]||String(i+1),color),className:'',iconSize:[32,40],iconAnchor:[16,40]});
      const m = L.marker([wp.lat,wp.lng],{icon}).addTo(map.current).bindPopup(`<b>${wp.name}</b>`);
      markers.current.push(m);
      bounds.push([wp.lat,wp.lng]);
    });

    if (bounds.length===1) map.current.setView(bounds[0],10);
    if (bounds.length>=2) {
      map.current.fitBounds(bounds,{padding:[50,50]});
      setRouting(true);
      osrmRoute(valid).then(r=>{
        setRouting(false);
        if (!r||!map.current) return;
        setRoute({km:r.km,time:r.time});
        const pts = r.geom.map(([lng,lat]:[number,number])=>[lat,lng]);
        routeLine.current = L.polyline(pts,{color:'#3B82F6',weight:5,opacity:.85}).addTo(map.current);
      });
    }
  },[wps]);

  function upd(id:string, q:string) {
    setSearches(p=>({...p,[id]:{...p[id],q,open:true}}));
    clearTimeout(debounce.current[id]);
    debounce.current[id] = setTimeout(async()=>{
      const r = await nominatim(q);
      setSearches(p=>({...p,[id]:{...p[id],results:r}}));
    },350);
  }

  function pick(id:string, place:{name:string;lat:number;lng:number}) {
    setWps(p=>p.map(w=>w.id===id?{...w,...place}:w));
    setSearches(p=>({...p,[id]:{q:place.name,results:[],open:false}}));
  }

  function addStop() {
    const w = newWP();
    setWps(p=>[...p.slice(0,-1),w,...p.slice(-1)]);
    setSearches(p=>({...p,[w.id]:{q:'',results:[],open:false}}));
  }

  function remove(id:string) { setWps(p=>p.filter(w=>w.id!==id)); }

  const validWps = wps.filter(w=>w.lat&&w.lng);

  async function submit(e:React.FormEvent) {
    e.preventDefault();
    if (validWps.length<2) { alert('Select at least start & end location.'); return; }
    setLoading(true);
    try {
      const start=validWps[0], end=validWps[validWps.length-1];
      const res = await api.post('/trips',{
        ...form, budget:parseFloat(form.budget)||0, mode,
        start_location:start.name, start_lat:start.lat, start_lng:start.lng,
        destination:end.name, destination_lat:end.lat, destination_lng:end.lng,
        stops:validWps.slice(1,-1).map(w=>({name:w.name,lat:w.lat,lng:w.lng})),
        route_waypoints:validWps.map(w=>({name:w.name,lat:w.lat,lng:w.lng})),
        interests:form.interests?form.interests.split(',').map(s=>s.trim()):[],
      });
      if (res.data.success) navigate(`/dashboard/${res.data.data.id}`,{replace:true});
      else throw new Error('Invalid response');
    } catch(err:any){ alert(err.response?.data?.error||'Failed to create trip.'); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-32">
      <header className="glass sticky top-0 z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={()=>navigate(-1)} className="btn-icon bg-[var(--bg)]"><ArrowLeft size={20} className="text-[var(--muted)]"/></button>
        <h1 className="font-display font-bold text-[var(--text)] flex-1">Create Trip</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-5">
        {/* Mode */}
        <div className="bg-[var(--surface)] p-1.5 rounded-2xl flex border border-[var(--border)]">
          {([['AI','AI Plan',Sparkles],['MANUAL','Manual',PencilLine]] as any[]).map(([v,lbl,Ic])=>(
            <button key={v} type="button" onClick={()=>setMode(v)}
              className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-all ${mode===v?'bg-brand text-white shadow-brand':'text-[var(--muted)]'}`}>
              <Ic size={16}/>{lbl}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div><label className="label">Trip Name</label>
            <input required placeholder="e.g. Ooty Summer Ride" className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
          </div>

          {/* ── UNIFIED MAP ───────────────────────────────── */}
          <div className="card overflow-hidden">
            {/* Header strip */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="font-display font-bold text-[var(--text)] text-sm flex items-center gap-2"><Navigation size={15} className="text-brand"/>Route Planner</span>
              <div className="flex items-center gap-3 text-xs font-bold">
                {routing && <span className="text-[var(--muted)] animate-pulse">Routing…</span>}
                {route && <><span className="text-brand">{route.km} km</span><span className="text-[var(--muted)]">{route.time}</span></>}
              </div>
            </div>

            {/* Map */}
            <div ref={mapRef} style={{height:280}} className="w-full"/>

            {/* Waypoints sidebar */}
            <div className="p-3 space-y-1 border-t border-[var(--border)] bg-[var(--surface)]">
              {wps.map((wp, i)=>{
                const s=searches[wp.id]||{q:'',results:[],open:false};
                const isFirst=i===0, isLast=i===wps.length-1;
                const dot = isFirst?'bg-emerald-500':isLast?'bg-red-500':'bg-blue-500';
                return (
                  <div key={wp.id} className="relative">
                    {/* Connector line above (not for first) */}
                    {i>0 && <div className="ml-3.5 w-0.5 h-2 bg-[var(--border)]"/>}
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 ${dot} rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0`}>{LABELS[i]||i+1}</div>
                      <div className="flex-1 relative">
                        <input className="input py-2 text-sm w-full" autoComplete="off"
                          placeholder={isFirst?'Start location…':isLast?'End destination…':`Stop ${i}…`}
                          value={s.q}
                          onChange={e=>upd(wp.id,e.target.value)}
                          onFocus={()=>s.results.length>0&&setSearches(p=>({...p,[wp.id]:{...p[wp.id],open:true}}))}
                          onBlur={()=>setTimeout(()=>setSearches(p=>({...p,[wp.id]:{...p[wp.id],open:false}})),200)}
                        />
                        {s.open&&s.results.length>0&&(
                          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lift max-h-44 overflow-y-auto">
                            {s.results.map((r,ri)=>(
                              <button key={ri} type="button" onMouseDown={()=>pick(wp.id,r)}
                                className="w-full text-left px-3 py-2 hover:bg-[var(--bg)] border-b border-[var(--border)] last:border-0 transition-colors">
                                <p className="text-sm font-semibold text-[var(--text)] truncate">{r.name}</p>
                                <p className="text-xs text-[var(--muted)] truncate">{r.full}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {!isFirst&&!isLast&&<button type="button" onClick={()=>remove(wp.id)} className="btn-icon w-8 h-8 text-[var(--muted)] hover:text-red-500 flex-shrink-0"><X size={15}/></button>}
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={addStop} className="flex items-center gap-2 text-sm font-semibold text-brand mt-2 ml-9 hover:opacity-80 transition">
                <Plus size={15}/>Add stop
              </button>
            </div>
          </div>

          {/* Dates + Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label><input type="date" required className="input" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))}/></div>
            <div><label className="label">End Date</label><input type="date" required className="input" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))}/></div>
          </div>
          <div><label className="label">Budget (₹)</label><input type="number" required placeholder="10000" className="input" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))}/></div>
          {mode==='AI'&&<div><label className="label">Interests</label><textarea placeholder="Nature, Trekking, Tea Estates…" rows={2} className="input resize-none" value={form.interests} onChange={e=>setForm(p=>({...p,interests:e.target.value}))}/></div>}

          <Button type="submit" isLoading={loading} disabled={loading||validWps.length<2} className="w-full py-4 text-base font-bold">
            {loading?'Creating Your Adventure…':'Create Trip 🚀'}
          </Button>
        </form>
      </main>
    </div>
  );
}
