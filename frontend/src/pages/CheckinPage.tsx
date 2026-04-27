import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MapPin, Send, CheckCircle, Clock } from 'lucide-react';

declare const L: any;

const ICONS = [
  { id: 'PIN',  emoji: '📍', label: 'Pin' },
  { id: 'CAR',  emoji: '🚗', label: 'Car' },
  { id: 'STAR', emoji: '⭐', label: 'Star' },
  { id: 'HOME', emoji: '🏠', label: 'Home' },
  { id: 'FLAG', emoji: '🚩', label: 'Flag' },
  { id: 'FOOD', emoji: '🍽️', label: 'Food' },
  { id: 'FUEL', emoji: '⛽', label: 'Fuel' },
  { id: 'REST', emoji: '☕', label: 'Rest' },
];

export default function CheckinPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const pinRef  = useRef<any>(null);

  const [locationName, setLocationName] = useState('');
  const [note, setNote]       = useState('');
  const [icon, setIcon]       = useState('PIN');
  const [lat, setLat]         = useState<number | null>(null);
  const [lng, setLng]         = useState<number | null>(null);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [myCheckins, setMyCheckins] = useState<any[]>([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    // Load existing checkins
    api.get(`/checkin/trip/${tripId}`).then(r => setMyCheckins(r.data.data || [])).catch(() => {});
  }, [tripId]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInst.current || !window.L) return;
    const defaultCenter: [number, number] = [11.0, 77.0];
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(defaultCenter, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapInst.current = map;

    const icon = L.divIcon({
      html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">📍</div>`,
      className: '', iconSize: [28, 36], iconAnchor: [14, 36],
    });
    const pin = L.marker(defaultCenter, { icon, draggable: true }).addTo(map);
    pinRef.current = pin;

    const revGeo = async (lat: number, lng: number) => {
      setLat(lat); setLng(lng);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'User-Agent': 'NamPayanam/2.0' } });
        const d = await r.json();
        const name = d.address?.city || d.address?.town || d.address?.village || d.address?.suburb || d.display_name?.split(',')[0] || '';
        setLocationName(name);
      } catch {}
    };

    pin.on('dragend', () => { const { lat, lng } = pin.getLatLng(); revGeo(lat, lng); });
    map.on('click', (e: any) => { pin.setLatLng(e.latlng); revGeo(e.latlng.lat, e.latlng.lng); });
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return alert('GPS not available');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      setLat(latitude); setLng(longitude);
      if (mapInst.current && pinRef.current) {
        mapInst.current.setView([latitude, longitude], 15);
        pinRef.current.setLatLng([latitude, longitude]);
      }
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, { headers: { 'User-Agent': 'NamPayanam/2.0' } })
        .then(r => r.json()).then(d => {
          setLocationName(d.address?.city || d.address?.town || d.address?.suburb || d.display_name?.split(',')[0] || '');
        }).catch(() => {}).finally(() => setLocating(false));
    }, err => { alert(err.message); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const handleSubmit = async () => {
    if (!locationName.trim()) return alert('Please enter a location name');
    setSaving(true);
    try {
      await api.post('/checkin', { tripId, locationName: locationName.trim(), latitude: lat, longitude: lng, icon, note });
      setSuccess(true);
      setTimeout(() => navigate(-1), 1500);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to check in');
    } finally { setSaving(false); }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { WAITING: 'bg-amber-100 text-amber-700', PICKED_UP: 'bg-jade/10 text-jade', ARRIVED: 'bg-indigo-100 text-indigo-700' };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Check In</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-32">
        {success ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pop">
            <CheckCircle size={64} className="text-jade mb-4"/>
            <p className="font-display font-bold text-[var(--text)] text-xl">Checked In!</p>
            <p className="text-[var(--muted)] text-sm mt-1">Organiser can see your location on the map</p>
          </div>
        ) : (
          <>
            {/* Map */}
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <p className="font-bold text-[var(--text)] text-sm flex items-center gap-2"><MapPin size={15} className="text-brand"/>Tap map or drag pin to your location</p>
                <button onClick={useCurrentLocation} disabled={locating}
                  className="text-xs text-brand font-bold flex items-center gap-1 bg-brand/10 px-2.5 py-1.5 rounded-xl">
                  {locating ? <div className="w-3 h-3 border border-brand border-t-transparent rounded-full animate-spin"/> : '📡'}
                  {locating ? 'Locating…' : 'Use GPS'}
                </button>
              </div>
              <div ref={mapRef} style={{ height: 240 }}/>
            </div>

            {/* Icon picker */}
            <div className="card p-4">
              <label className="label">Your icon on the map</label>
              <div className="flex gap-2 flex-wrap mt-2">
                {ICONS.map(i => (
                  <button key={i.id} onClick={() => setIcon(i.id)}
                    className={`flex flex-col items-center gap-1 w-14 py-2 rounded-xl border-2 text-xs font-bold transition-all
                      ${icon === i.id ? 'border-brand bg-brand/10 text-brand' : 'border-[var(--border)] text-[var(--muted)]'}`}>
                    <span className="text-xl">{i.emoji}</span>
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location name + note */}
            <div className="card p-4 space-y-3">
              <div>
                <label className="label">Location Name *</label>
                <input className="input" placeholder="e.g. Salem Bus Stand Gate 2"
                  value={locationName} onChange={e => setLocationName(e.target.value)}/>
              </div>
              <div>
                <label className="label">Note for organiser (optional)</label>
                <input className="input" placeholder="e.g. Waiting near the entrance, wearing blue shirt"
                  value={note} onChange={e => setNote(e.target.value)}/>
              </div>
            </div>

            {/* My past checkins */}
            {myCheckins.length > 0 && (
              <div className="card p-4">
                <p className="font-bold text-[var(--text)] text-sm mb-3 flex items-center gap-2"><Clock size={15} className="text-[var(--muted)]"/>My Recent Check-ins</p>
                <div className="space-y-2">
                  {myCheckins.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                      <span className="text-xl">{ICONS.find(i => i.id === c.icon)?.emoji || '📍'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text)] truncate">{c.location_name}</p>
                        <p className="text-xs text-[var(--muted)]">{new Date(c.checked_in_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`badge text-[10px] ${getStatusBadge(c.status)}`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {!success && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] px-4 py-4 pb-safe">
          <div className="max-w-2xl mx-auto">
            <button onClick={handleSubmit} disabled={saving || !locationName.trim()} className="btn-primary w-full py-4 text-base disabled:opacity-40">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send size={18}/>}
              {saving ? 'Sending…' : 'Send Check-in to Organiser'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
