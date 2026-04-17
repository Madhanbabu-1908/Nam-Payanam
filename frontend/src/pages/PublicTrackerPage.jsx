import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trackingAPI } from '../utils/api';
import supabase from '../utils/supabase';
import { Spinner } from '../components/ui/index.jsx';

export default function PublicTrackerPage() {
  const { token } = useParams();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const liveMarker = useRef(null);
  const pathLine = useRef(null);

  const [data, setData] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [travelPath, setTravelPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [etaText, setEtaText] = useState(null);

  useEffect(() => {
    trackingAPI.getByToken(token)
      .then(res => {
        setData(res);
        if (res.location) setLiveLocation(res.location);
        if (res.path?.length) setTravelPath(res.path);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!data?.trip?.id) return;
    const ch = supabase.channel(`pub-track-${data.trip.id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'live_locations', filter:`trip_id=eq.${data.trip.id}` }, p => {
        if (p.new) setLiveLocation(p.new);
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'travel_path', filter:`trip_id=eq.${data.trip.id}` }, p => {
        if (p.new) setTravelPath(prev => [...prev, p.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [data?.trip?.id]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || !data) return;
    const L = window.L; if (!L) return;

    async function init() {
      const trip = data.trip;
      const locs = [];
      const list = [
        { name: trip.start_location, type:'start' },
        ...(trip.stops||[]).map(s=>({name:s,type:'stop'})),
        { name: trip.end_location, type:'end' },
      ].filter(l=>l.name);

      for (const loc of list) {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc.name+', India')}&format=json&limit=1`, {headers:{'User-Agent':'NamPayanam/1.0'}});
          const d = await r.json();
          if (d[0]) locs.push({...loc, lat:parseFloat(d[0].lat), lng:parseFloat(d[0].lon)});
          await new Promise(r=>setTimeout(r,280));
        } catch {}
      }
      if (!locs.length) return;

      if (!mapInstance.current) {
        const map = L.map(mapRef.current,{zoomControl:false,attributionControl:false}).setView([locs[0].lat,locs[0].lng],8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
        L.control.zoom({position:'bottomright'}).addTo(map);
        mapInstance.current = map;
      }
      const map = mapInstance.current;

      // Stop markers
      locs.forEach((loc,i)=>{
        const colors = {start:'#10b981',end:'#FF6B35',stop:'#0066CC'};
        const color = colors[loc.type]||'#64748b';
        const icon = L.divIcon({
          html:`<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.25)"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-size:11px;font-weight:900">${i+1}</div></div>`,
          className:'',iconSize:[32,32],iconAnchor:[16,32]
        });
        L.marker([loc.lat,loc.lng],{icon}).addTo(map).bindPopup(`<b>${loc.name?.split(',')[0]}</b>`);
      });

      // Dashed grey remaining route
      const greyLine = L.polyline(locs.map(l=>[l.lat,l.lng]),{color:'#94a3b8',weight:3,dashArray:'10,8',opacity:0.5}).addTo(map);

      // Completed green path
      if (travelPath.length>1) {
        const pts = travelPath.map(p=>[parseFloat(p.lat),parseFloat(p.lng)]);
        if (pathLine.current) map.removeLayer(pathLine.current);
        pathLine.current = L.polyline(pts,{color:'#10b981',weight:5,opacity:0.9}).addTo(map);
      }

      // Live vehicle marker
      if (liveLocation) {
        const icon = L.divIcon({
          html:`<div style="width:46px;height:46px;background:linear-gradient(135deg,#FF6B35,#FF4500);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 3px 12px rgba(255,107,53,0.5)">🚗</div>`,
          className:'',iconSize:[46,46],iconAnchor:[23,23]
        });
        if (liveMarker.current) map.removeLayer(liveMarker.current);
        liveMarker.current = L.marker([parseFloat(liveLocation.lat),parseFloat(liveLocation.lng)],{icon,zIndexOffset:1000}).addTo(map)
          .bindPopup(`<b>Vehicle here</b><br/>${new Date(liveLocation.updated_at).toLocaleTimeString('en-IN')}`);

        // ETA to next stop
        const next = locs.find(l=>l.type!=='start');
        if (next) {
          const dlat = parseFloat(liveLocation.lat)-next.lat;
          const dlng = parseFloat(liveLocation.lng)-next.lng;
          const km = Math.sqrt(dlat*dlat+dlng*dlng)*111;
          setEtaText(`~${Math.round(km/40*60)} min to ${next.name?.split(',')[0]}`);
        }
      }

      const allPts = [...locs.map(l=>[l.lat,l.lng]), ...(liveLocation?[[parseFloat(liveLocation.lat),parseFloat(liveLocation.lng)]]:[] )];
      if (allPts.length>1) map.fitBounds(allPts,{padding:[40,40]});
    }

    init();
  }, [data, liveLocation, travelPath]);

  if (loading) return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#FF4500] rounded-2xl flex items-center justify-center animate-pulse-soft"><span className="text-3xl">🗺️</span></div>
        <Spinner size="lg"/><p className="text-sm text-slate-500 font-semibold">Loading live tracker...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 text-center max-w-sm shadow-lg">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="font-display font-bold text-slate-800 text-lg mb-2">Link Unavailable</h2>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    </div>
  );

  const trip = data?.trip;

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"/>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF4500] pt-safe">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><span className="text-xl">🗺️</span></div>
            <div>
              <h1 className="font-display font-extrabold text-white text-lg leading-tight">{trip?.title}</h1>
              <p className="text-white/70 text-xs">{data?.tokenLabel} · Read-only tracker</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-xs">{trip?.start_location?.split(',')[0]} → {trip?.end_location?.split(',')[0]}</span>
            {liveLocation ? (
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft"/>
                <span className="text-white text-xs font-bold">LIVE</span>
              </div>
            ) : (
              <span className="text-white/50 text-xs">Not broadcasting</span>
            )}
          </div>
        </div>
        <div className="h-5 bg-[#f0f4f8] rounded-t-[1.5rem]"/>
      </div>

      {/* ETA */}
      {etaText && liveLocation && (
        <div className="mx-4 mt-2 bg-blue-600 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">🎯 ETA</span>
          <span className="text-white font-extrabold">{etaText}</span>
        </div>
      )}

      {/* Map */}
      <div className="relative mx-4 mt-3 rounded-2xl overflow-hidden border border-slate-200 shadow-lg" style={{height:'400px'}}>
        <div ref={mapRef} className="w-full h-full"/>
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-0.5"><div className="w-8 h-1.5 bg-emerald-500 rounded"/>Completed</div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><div className="w-6 border-t-2 border-dashed border-slate-400"/>Remaining</div>
        </div>
      </div>

      {/* Trip info */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 className="font-display font-bold text-slate-800 mb-3 text-sm">Trip Info</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            {l:'Members',v:`${data?.members?.length||0} people`},
            {l:'Status',v:trip?.status||'—'},
            {l:'Start',v:trip?.start_date||'—'},
            {l:'End',v:trip?.end_date||'—'},
          ].map(({l,v})=>(
            <div key={l} className="bg-slate-50 rounded-xl p-3">
              <div className="text-[11px] text-slate-400 font-bold uppercase">{l}</div>
              <div className="text-sm font-bold text-slate-800 capitalize mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        {liveLocation && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 font-semibold">
            📡 Last update: {new Date(liveLocation.updated_at).toLocaleString('en-IN')}
          </div>
        )}
      </div>

      <div className="mx-4 mt-3 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        🔒 This is a read-only tracking link. You cannot see trip details, expenses, or messages.
        {data?.expiresAt&&` · Expires ${new Date(data.expiresAt).toLocaleDateString('en-IN')}`}
      </div>
    </div>
  );
}
