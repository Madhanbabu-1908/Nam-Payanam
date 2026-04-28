import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, X, MapPin, Search, Navigation, Sparkles, PenLine } from 'lucide-react';
import LoadingScreen from '../components/common/VehicleLoader';

declare const L: any;

interface WaypointInput { name: string; lat: number | null; lng: number | null; }

interface SearchResult { label: string; lat: number; lng: number; }

function LocationSearch({
  placeholder, icon, value, onChange, onSelect,
}: {
  placeholder: string; icon: React.ReactNode; value: string;
  onChange: (v: string) => void;
  onSelect: (r: SearchResult) => void;
}) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  const search = useCallback((q: string) => {
    onChange(q);
    clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', India')}&format=json&limit=5`,
          { headers: { 'User-Agent': 'NamPayanam/2.0' } }
        );
        const data = await res.json();
        setResults(data.map((d: any) => ({
          label: d.display_name.split(',').slice(0, 3).join(', '),
          lat: parseFloat(d.lat), lng: parseFloat(d.lon),
        })));
        setOpen(true);
      } catch {}
      setLoading(false);
    }, 350);
  }, [onChange]);

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-[var(--muted)]">{icon}</span>
        <input
          className="input pl-10 pr-8"
          placeholder={placeholder}
          value={value}
          onChange={e => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {loading && (
          <div className="absolute right-3 w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin"/>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-float z-50 overflow-hidden animate-slide-up">
          {results.map((r, i) => (
            <button key={i} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg)] transition-colors text-left border-b border-[var(--border)] last:border-0"
              onMouseDown={() => { onSelect(r); onChange(r.label.split(',')[0]); setOpen(false); setResults([]); }}>
              <MapPin size={14} className="text-brand flex-shrink-0 mt-0.5" />
              <span className="text-sm text-[var(--text)] leading-snug">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateTrip() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapInst   = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);

  const [step, setStep]         = useState(0); // 0=route, 1=details, 2=mode
  const [mode, setMode]         = useState<'AI' | 'MANUAL'>('AI');
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState('');

  // Location state
  const [startText, setStartText]   = useState('');
  const [destText, setDestText]     = useState('');
  const [stops, setStops]           = useState<WaypointInput[]>([]);
  const [stopText, setStopText]     = useState('');

  const [startPt, setStartPt]   = useState<SearchResult | null>(null);
  const [destPt, setDestPt]     = useState<SearchResult | null>(null);

  // Trip details
  const [name, setName]           = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [budget, setBudget]       = useState('');
  const [interests, setInterests] = useState<string[]>(['General Sightseeing']);

  const INTEREST_OPTS = ['Temples', 'Nature', 'Hill Stations', 'Beach', 'Food', 'History', 'Adventure', 'Shopping', 'Wildlife'];

  // Draw route on Leaflet map
  const drawMap = useCallback(async (start: SearchResult | null, dest: SearchResult | null, mid: WaypointInput[]) => {
    if (!mapRef.current) return;
    if (!window.L) return;

    if (!mapInst.current) {
      const m = L.map(mapRef.current, { zoomControl: false, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
      L.control.zoom({ position: 'bottomright' }).addTo(m);
      mapInst.current = m;
    }
    const map = mapInst.current;

    // Clear old markers and route
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }

    const all = [
      start ? { ...start, type: 'start' } : null,
      ...mid.filter(s => s.lat).map(s => ({ lat: s.lat!, lng: s.lng!, label: s.name, type: 'stop' })),
      dest  ? { ...dest, type: 'end' } : null,
    ].filter(Boolean) as any[];

    if (all.length < 1) return;

    all.forEach((pt, i) => {
      const colors: Record<string, string> = { start: '#10B981', stop: '#0EA5E9', end: '#FF6B35' };
      const labels: Record<string, string> = { start: `${i + 1}`, stop: `${String.fromCharCode(65 + i)}`, end: `${i + 1}` };
      const color = colors[pt.type] || '#6366f1';
      const icon  = L.divIcon({
        html: `<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:900;box-shadow:0 3px 10px rgba(0,0,0,0.25)">${labels[pt.type]}</div>`,
        className: '', iconSize: [32, 32], iconAnchor: [16, 32],
      });
      const m = L.marker([pt.lat, pt.lng], { icon }).addTo(map).bindPopup(`<b>${pt.label || pt.name || ''}</b>`);
      markersRef.current.push(m);
    });

    // Draw route via OSRM
    if (all.length >= 2) {
      try {
        const coords = all.map((p: any) => `${p.lng},${p.lat}`).join(';');
        const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        const d = await r.json();
        if (d.code === 'Ok' && d.routes[0]) {
          const geo = d.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          routeLineRef.current = L.polyline(geo, { color: '#0EA5E9', weight: 4, opacity: 0.85 }).addTo(map);
          const bounds = all.map((p: any) => [p.lat, p.lng] as [number, number]);
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch { /* fallback straight line */
        const pts = all.map((p: any) => [p.lat, p.lng] as [number, number]);
        routeLineRef.current = L.polyline(pts, { color: '#0EA5E9', weight: 4, dashArray: '8 4' }).addTo(map);
        map.fitBounds(pts, { padding: [40, 40] });
      }
    } else {
      map.setView([all[0].lat, all[0].lng], 11);
    }
  }, []);

  const handleStartSelect = (r: SearchResult) => {
    setStartPt(r); setStartText(r.label.split(',')[0]);
    setTimeout(() => drawMap(r, destPt, stops), 50);
  };
  const handleDestSelect = (r: SearchResult) => {
    setDestPt(r); setDestText(r.label.split(',')[0]);
    setTimeout(() => drawMap(startPt, r, stops), 50);
  };
  const addStop = (r: SearchResult) => {
    const s = { name: r.label.split(',')[0], lat: r.lat, lng: r.lng };
    const ns = [...stops, s];
    setStops(ns); setStopText('');
    setTimeout(() => drawMap(startPt, destPt, ns), 50);
  };
  const removeStop = (i: number) => {
    const ns = stops.filter((_, idx) => idx !== i);
    setStops(ns);
    setTimeout(() => drawMap(startPt, destPt, ns), 50);
  };

  const handleSubmit = async () => {
    if (!startPt || !destPt || !name || !startDate || !endDate || !budget)
      return alert('Please fill all required fields');
    setLoading(true);
    setLoadMsg(mode === 'AI' ? 'AI is crafting your perfect plan…' : 'Creating your trip…');
    try {
      const payload = {
        name, destination: destPt.label.split(',')[0],
        start_location: startPt.label.split(',')[0],
        start_lat: startPt.lat, start_lng: startPt.lng,
        destination_lat: destPt.lat, destination_lng: destPt.lng,
        waypoints: stops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
        start_date: startDate, end_date: endDate,
        budget: parseInt(budget), mode,
        interests: mode === 'AI' ? interests : [],
      };
      const res = await api.post('/trips', payload);
      const tripId = res.data.data?.id || res.data.data?.tripId;
      if (mode === 'AI') {
        setLoadMsg('Generating AI itinerary…');
        await api.post(`/ai/trips/${tripId}/regenerate`, { interests });
      }
      navigate(`/dashboard/${tripId}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create trip');
    } finally { setLoading(false); }
  };

  if (loading) return <LoadingScreen message={loadMsg}/>;

  const canProceed0 = startPt && destPt;
  const canProceed1 = name && startDate && endDate && budget;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col pt-safe">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-[var(--text)] text-base">Plan a Trip</h1>
            <div className="flex gap-1 mt-1">
              {['Route', 'Details', 'Mode'].map((s, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-brand' : 'bg-[var(--border)]'}`}/>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-4 py-4 space-y-4 pb-32">

        {/* ── STEP 0: ROUTE + MAP ── */}
        {step === 0 && (
          <>
            <div className="card p-4 space-y-3">
              <h2 className="font-display font-bold text-[var(--text)]">Where are you going?</h2>

              <LocationSearch placeholder="Starting point" icon={<div className="w-3 h-3 rounded-full bg-jade"/>}
                value={startText} onChange={setStartText} onSelect={handleStartSelect}/>

              {/* Middle stops */}
              {stops.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                    <div className="w-3 h-3 rounded-full bg-sky-500 flex-shrink-0"/>
                    <span className="text-sm text-[var(--text)] flex-1 truncate">{s.name}</span>
                  </div>
                  <button onClick={() => removeStop(i)} className="btn-icon bg-[var(--bg)] text-rose-500 w-9 h-9"><X size={14}/></button>
                </div>
              ))}

              <LocationSearch placeholder="Add a stop (optional)" icon={<Plus size={14} className="text-[var(--muted)]"/>}
                value={stopText} onChange={setStopText} onSelect={addStop}/>

              <LocationSearch placeholder="Destination" icon={<MapPin size={14} className="text-brand"/>}
                value={destText} onChange={setDestText} onSelect={handleDestSelect}/>
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-[var(--border)] shadow-float" style={{ height: 320 }}>
              {!startPt && !destPt && (
                <div className="h-full flex flex-col items-center justify-center bg-[var(--bg)] gap-3">
                  <Navigation size={36} className="text-[var(--muted)] opacity-40"/>
                  <p className="text-[var(--muted)] text-sm">Enter locations to see route on map</p>
                </div>
              )}
              <div ref={mapRef} className="w-full h-full"/>
            </div>
          </>
        )}

        {/* ── STEP 1: TRIP DETAILS ── */}
        {step === 1 && (
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-bold text-[var(--text)] text-lg">Trip Details</h2>
            <div>
              <label className="label">Trip Name *</label>
              <input className="input" placeholder="e.g. South Tamil Nadu Temple Tour"
                value={name} onChange={e => setName(e.target.value)}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date *</label>
                <input type="date" className="input" value={startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setStartDate(e.target.value)}/>
              </div>
              <div>
                <label className="label">End Date *</label>
                <input type="date" className="input" value={endDate}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setEndDate(e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="label">Total Budget (₹) *</label>
              <input type="number" className="input" placeholder="e.g. 15000"
                value={budget} onChange={e => setBudget(e.target.value)}/>
            </div>
          </div>
        )}

        {/* ── STEP 2: PLAN MODE ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {([['AI', '✨', 'AI Planned', 'Smart itinerary generated for you'],
                ['MANUAL', '✏️', 'Manual', 'Build your own day-by-day plan']] as const).map(([m, icon, label, desc]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`card-hover p-4 text-left transition-all ${mode === m ? 'ring-2 ring-brand' : ''}`}>
                  <span className="text-3xl block mb-2">{icon}</span>
                  <p className="font-display font-bold text-[var(--text)] text-sm">{label}</p>
                  <p className="text-[var(--muted)] text-xs mt-1">{desc}</p>
                </button>
              ))}
            </div>

            {mode === 'AI' && (
              <div className="card p-4">
                <label className="label">Interests (tap to select)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {INTEREST_OPTS.map(opt => (
                    <button key={opt}
                      onClick={() => setInterests(p => p.includes(opt) ? p.filter(x => x !== opt) : [...p, opt])}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                        ${interests.includes(opt) ? 'bg-brand text-white border-brand' : 'border-[var(--border)] text-[var(--muted)]'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="card p-4 space-y-2">
              <p className="font-bold text-[var(--text)] text-sm">Trip Summary</p>
              <p className="text-[var(--muted)] text-xs">📍 {startText} → {destText}</p>
              {stops.length > 0 && <p className="text-[var(--muted)] text-xs">↪ Via: {stops.map(s => s.name).join(', ')}</p>}
              <p className="text-[var(--muted)] text-xs">📅 {startDate} → {endDate}</p>
              <p className="text-[var(--muted)] text-xs">💰 ₹{parseInt(budget).toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] px-4 py-4 pb-safe">
        <div className="max-w-2xl mx-auto">
          {step === 0 && (
            <button disabled={!canProceed0} onClick={() => setStep(1)} className="btn-primary w-full py-4 text-base disabled:opacity-40">
              <Navigation size={18}/>Continue to Details
            </button>
          )}
          {step === 1 && (
            <button disabled={!canProceed1} onClick={() => setStep(2)} className="btn-primary w-full py-4 text-base disabled:opacity-40">
              Choose Plan Mode →
            </button>
          )}
          {step === 2 && (
            <button onClick={handleSubmit} className="btn-primary w-full py-4 text-base">
              {mode === 'AI' ? <><Sparkles size={18}/>Create with AI</> : <><PenLine size={18}/>Create Manual Trip</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
