import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../config/api';
import { MapPin, Navigation } from 'lucide-react';

declare const L: any;

export default function PublicTrackPage() {
  const { tripId } = useParams();
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [livePos, setLivePos] = useState<any>(null);

  useEffect(() => {
    if (!tripId) return;
    api.get(`/trips/${tripId}`).then(r => { setTrip(r.data.data); setLoading(false); }).catch(()=>setLoading(false));
    api.get(`/tracking/trips/${tripId}/location`).then(r => { if(r.data.data) setLivePos(r.data.data); }).catch(()=>{});
  }, [tripId]);

  useEffect(() => {
    if (!mapRef.current || mapInst.current || !L || !trip) return;
    const center = trip.start_lat ? [+trip.start_lat, +trip.start_lng] : [11.0,77.0];
    const map = L.map(mapRef.current, { zoomControl:true, attributionControl:false }).setView(center, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);
    mapInst.current = map;

    if (trip.start_lat) {
      const sIcon = L.divIcon({ html:`<div style="background:#10B981;border:3px solid white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:900;box-shadow:0 2px 8px rgba(0,0,0,.2)">S</div>`, className:'', iconSize:[28,28], iconAnchor:[14,14] });
      L.marker([+trip.start_lat, +trip.start_lng], { icon:sIcon }).addTo(map).bindPopup(`Start: ${trip.start_location||''}`);
    }
    if (trip.destination_lat) {
      const eIcon = L.divIcon({ html:`<div style="background:#FF6B35;border:3px solid white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:900;box-shadow:0 2px 8px rgba(0,0,0,.2)">E</div>`, className:'', iconSize:[28,28], iconAnchor:[14,14] });
      L.marker([+trip.destination_lat, +trip.destination_lng], { icon:eIcon }).addTo(map).bindPopup(`Destination: ${trip.destination||''}`);
    }
    if (livePos) {
      const vIcon = L.divIcon({ html:`<div style="background:#FF6B35;border:3px solid white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 12px rgba(255,107,53,.5)">🚗</div>`, className:'', iconSize:[36,36], iconAnchor:[18,18] });
      L.marker([+livePos.latitude, +livePos.longitude], { icon:vIcon, zIndexOffset:1000 }).addTo(map).bindPopup(`Last updated: ${new Date(livePos.recorded_at).toLocaleTimeString('en-IN')}`);
    }
  }, [trip, livePos]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-10 h-10 border-2 border-brand/20 border-t-brand rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)]">
      <header className="glass z-20 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center"><MapPin size={16} className="text-white"/></div>
          <div>
            <p className="font-display font-bold text-[var(--text)] text-sm">{trip?.name || 'Live Tracker'}</p>
            <p className="text-[var(--muted)] text-xs flex items-center gap-1">
              {livePos ? <><div className="w-1.5 h-1.5 bg-jade rounded-full animate-pulse"/><span className="text-jade">Live</span></> : <><Navigation size={10}/>{trip?.destination}</>}
            </p>
          </div>
        </div>
      </header>
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full"/>
        {!livePos && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-[var(--surface)]/90 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-float">
              <p className="text-sm font-semibold text-[var(--muted)]">Waiting for live location…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
