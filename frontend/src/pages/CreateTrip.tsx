import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Plus, X, MapPin, Search, Navigation, Sparkles, 
  PenLine, Calendar, Wallet, Route, CheckCircle2, AlertCircle 
} from 'lucide-react';
import LoadingScreen from '../components/common/VehicleLoader';
import toast from 'react-hot-toast';

declare const L: any;

interface WaypointInput { name: string; lat: number | null; lng: number | null; }
interface SearchResult { label: string; lat: number; lng: number; }

// --- Components ---

function LocationSearch({
  placeholder, icon, value, onChange, onSelect, className = ""
}: {
  placeholder: string; icon: React.ReactNode; value: string;
  onChange: (v: string) => void;
  onSelect: (r: SearchResult) => void;
  className?: string;
}) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback((q: string) => {
    onChange(q);
    clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {        const res = await fetch(
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
    <div className={`relative group ${className}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-[var(--muted)] group-focus-within:text-brand transition-colors">{icon}</span>
        <input
          className="input pl-10 pr-8 w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none"
          placeholder={placeholder}
          value={value}
          onChange={e => search(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <div className="absolute right-3 w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin"/>
        )}
      </div>
      
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {results.map((r, i) => (
            <button 
              key={i} 
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg)] transition-colors text-left border-b border-[var(--border)] last:border-0 group/item"
              onMouseDown={() => { 
                onSelect(r); 
                onChange(r.label.split(',')[0]); 
                setOpen(false); 
                setResults([]); 
              }}
            >
              <MapPin size={16} className="text-brand flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
              <span className="text-sm text-[var(--text)] leading-snug font-medium">{r.label}</span>
            </button>
          ))}
        </div>
      )}    </div>
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
    if (!mapRef.current || !window.L) return;

    if (!mapInst.current) {
      const m = L.map(mapRef.current, { zoomControl: false, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
      L.control.zoom({ position: 'bottomright' }).addTo(m);
      mapInst.current = m;
    }
    const map = mapInst.current;

    // Clear old markers and route
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }

    const all = [
      start ? { ...start, type: 'start' } : null,
      ...mid.filter(s => s.lat).map(s => ({ lat: s.lat!, lng: s.lng!, label: s.name, type: 'stop' })),
      dest  ? { ...dest, type: 'end' } : null,
    ].filter(Boolean) as any[];

    if (all.length < 1) return;

    all.forEach((pt, i) => {
      const colors: Record<string, string> = { start: '#10B981', stop: '#0EA5E9', end: '#FF6B35' };
      const labels: Record<string, string> = { start: 'A', stop: `${i}`, end: 'B' };
      const color = colors[pt.type] || '#6366f1';
      
      const iconHtml = pt.type === 'stop' 
        ? `<div style="width:28px;height:28px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.2)">${labels[pt.type]}</div>`
        : `<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:900;box-shadow:0 4px 10px rgba(0,0,0,0.3)">${labels[pt.type]}</div>`;

      const icon  = L.divIcon({
        html: iconHtml,
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
          routeLineRef.current = L.polyline(geo, { color: '#0EA5E9', weight: 5, opacity: 0.9, lineCap: 'round' }).addTo(map);
          const bounds = all.map((p: any) => [p.lat, p.lng] as [number, number]);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch { /* fallback straight line */
        const pts = all.map((p: any) => [p.lat, p.lng] as [number, number]);
        routeLineRef.current = L.polyline(pts, { color: '#0EA5E9', weight: 4, dashArray: '10 10' }).addTo(map);
        map.fitBounds(pts, { padding: [50, 50] });
      }
    } else {
      map.setView([all[0].lat, all[0].lng], 11);
    }
  }, []);

  const handleStartSelect = (r: SearchResult) => {    setStartPt(r); setStartText(r.label.split(',')[0]);
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
      return toast.error('Please fill all required fields');
    
    setLoading(true);
    setLoadMsg(mode === 'AI' ? 'AI is crafting your perfect plan…' : 'Creating your trip…');
    
    try {
      const payload = {
        name, 
        destination: destPt.label.split(',')[0],
        start_location: startPt.label.split(',')[0],
        start_lat: startPt.lat, 
        start_lng: startPt.lng,
        destination_lat: destPt.lat, 
        destination_lng: destPt.lng,
        waypoints: stops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
        start_date: startDate, 
        end_date: endDate,
        budget: parseInt(budget), 
        mode,
        interests: mode === 'AI' ? interests : [],
      };
      
      const res = await api.post('/trips', payload);
      const tripId = res.data.data?.id || res.data.data?.tripId;
      
      if (mode === 'AI') {
        setLoadMsg('Generating AI itinerary…');
        await api.post(`/ai/trips/${tripId}/regenerate`, { interests });
      }      
      toast.success('Trip created successfully!');
      navigate(`/dashboard/${tripId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create trip');
    } finally { 
      setLoading(false); 
    }
  };

  if (loading) return <LoadingScreen message={loadMsg}/>;

  const canProceed0 = startPt && destPt;
  const canProceed1 = name && startDate && endDate && budget;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col pt-safe pb-safe">
      {/* Header */}
      <header className="glass sticky top-0 z-30 px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-4 max-w-3xl mx-auto">
          <button 
            onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} 
            className="btn-icon bg-[var(--surface)] hover:bg-[var(--bg)] transition-colors"
          >
            <ArrowLeft size={20} className="text-[var(--text)]"/>
          </button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-display font-bold text-[var(--text)] text-lg">Plan a Trip</h1>
              <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded-lg">Step {step + 1}/3</span>
            </div>
            
            {/* Progress Bar */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ease-out ${
                    i === step ? 'bg-brand w-8' : i < step ? 'bg-brand' : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-4 py-6 space-y-6 pb-32 scroll-smooth">
        {/* ── STEP 0: ROUTE + MAP ── */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="card p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Route className="text-brand" size={20}/>
                <h2 className="font-display font-bold text-[var(--text)] text-lg">Define Your Route</h2>
              </div>

              <div className="space-y-3 relative">
                {/* Connecting Line Visual */}
                <div className="absolute left-[19px] top-10 bottom-10 w-0.5 bg-[var(--border)] -z-10"/>

                <LocationSearch 
                  placeholder="Starting point" 
                  icon={<div className="w-3 h-3 rounded-full bg-jade ring-2 ring-white shadow-sm"/>}
                  value={startText} 
                  onChange={setStartText} 
                  onSelect={handleStartSelect}
                />

                {/* Middle stops */}
                {stops.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                    <LocationSearch 
                      placeholder={`Stop ${i + 1}`}
                      icon={<div className="w-3 h-3 rounded-full bg-sky-500 ring-2 ring-white shadow-sm"/>}
                      value={s.name}
                      onChange={(v) => {
                        const newStops = [...stops];
                        newStops[i].name = v;
                        setStops(newStops);
                      }}
                      onSelect={(r) => {
                         const newStops = [...stops];
                         newStops[i] = { name: r.label.split(',')[0], lat: r.lat, lng: r.lng };
                         setStops(newStops);
                         drawMap(startPt, destPt, newStops);
                      }}
                    />
                    <button 
                      onClick={() => removeStop(i)} 
                      className="btn-icon bg-rose-50 text-rose-500 hover:bg-rose-100 w-10 h-10 flex-shrink-0"
                    >
                      <X size={16}/>
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => document.getElementById('add-stop-input')?.focus()}
                    className="flex items-center gap-2 text-sm font-bold text-brand bg-brand/5 px-3 py-2 rounded-xl hover:bg-brand/10 transition-colors"
                   >
                     <Plus size={16}/> Add Stop
                   </button>
                </div>
                
                <div id="add-stop-wrapper" className="relative">
                   <LocationSearch 
                    placeholder="Add a stop (optional)" 
                    icon={<Plus size={14} className="text-[var(--muted)]"/>}
                    value={stopText} 
                    onChange={setStopText} 
                    onSelect={addStop}
                    className="opacity-80"
                   />
                   {/* Hidden input to focus via button */}
                   <input id="add-stop-input" className="absolute opacity-0 pointer-events-none" />
                </div>

                <LocationSearch 
                  placeholder="Destination" 
                  icon={<MapPin size={16} className="text-brand"/>}
                  value={destText} 
                  onChange={setDestText} 
                  onSelect={handleDestSelect}
                />
              </div>
            </div>

            {/* Map Container */}
            <div className="rounded-2xl overflow-hidden border border-[var(--border)] shadow-md bg-[var(--surface)] relative group" style={{ height: 350 }}>
              {!startPt && !destPt && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg)] gap-3 z-10">
                  <div className="p-4 bg-brand/5 rounded-full">
                    <Navigation size={32} className="text-brand opacity-50"/>
                  </div>
                  <p className="text-[var(--muted)] font-medium">Enter locations to visualize route</p>
                </div>
              )}
              <div ref={mapRef} className="w-full h-full z-0"/>
            </div>
          </div>
        )}

        {/* ── STEP 1: TRIP DETAILS ── */}
        {step === 1 && (
          <div className="card p-6 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">            <div className="flex items-center gap-2 mb-2">
              <PenLine className="text-brand" size={20}/>
              <h2 className="font-display font-bold text-[var(--text)] text-lg">Trip Essentials</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label flex items-center gap-2"><Calendar size={14}/> Trip Name</label>
                <input 
                  className="input text-lg font-medium" 
                  placeholder="e.g. South Tamil Nadu Temple Tour"
                  value={name} 
                  onChange={e => setName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={endDate}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="label flex items-center gap-2"><Wallet size={14}/> Total Budget (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold">₹</span>
                  <input 
                    type="number" 
                    className="input pl-8 font-mono text-lg" 
                    placeholder="15000"
                    value={budget} 
                    onChange={e => setBudget(e.target.value)}
                  />                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: PLAN MODE ── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="grid grid-cols-2 gap-4">
              {([
                ['AI', <Sparkles size={24} className="text-violet-500"/>, 'AI Planned', 'Smart itinerary generated instantly'],
                ['MANUAL', <PenLine size={24} className="text-slate-500"/>, 'Manual', 'Build your own day-by-day plan']
              ] as const).map(([m, icon, label, desc]) => (
                <button 
                  key={m} 
                  onClick={() => setMode(m)}
                  className={`card p-5 text-left transition-all duration-300 border-2 ${
                    mode === m 
                      ? 'border-brand bg-brand/5 shadow-lg scale-[1.02]' 
                      : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${mode === m ? 'bg-white shadow-sm' : 'bg-[var(--bg)]'}`}>
                    {icon}
                  </div>
                  <p className="font-display font-bold text-[var(--text)] text-base mb-1">{label}</p>
                  <p className="text-[var(--muted)] text-xs leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>

            {mode === 'AI' && (
              <div className="card p-5 animate-in fade-in zoom-in-95 duration-300">
                <label className="label mb-3 flex items-center justify-between">
                  <span>Select Interests</span>
                  <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full">{interests.length} selected</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTS.map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setInterests(p => p.includes(opt) ? p.filter(x => x !== opt) : [...p, opt])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 flex items-center gap-1.5
                        ${interests.includes(opt) 
                          ? 'bg-brand text-white border-brand shadow-sm' 
                          : 'border-[var(--border)] text-[var(--muted)] hover:border-brand/50 hover:bg-brand/5'
                        }`}
                    >
                      {interests.includes(opt) && <CheckCircle2 size={12}/>}                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Card */}
            <div className="card p-5 bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] border border-[var(--border)]">
              <h3 className="font-bold text-[var(--text)] text-sm mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-brand"/> Trip Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-[var(--muted)] mt-0.5"/>
                  <div>
                    <p className="font-medium text-[var(--text)]">{startText} <span className="text-[var(--muted)]">→</span> {destText}</p>
                    {stops.length > 0 && <p className="text-xs text-[var(--muted)] mt-1">Via: {stops.map(s => s.name).join(', ')}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-[var(--muted)]"/>
                  <p className="text-[var(--text)]">{startDate} <span className="text-[var(--muted)]">to</span> {endDate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Wallet size={16} className="text-[var(--muted)]"/>
                  <p className="text-[var(--text)] font-mono">₹{parseInt(budget || '0').toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)]/90 backdrop-blur-md border-t border-[var(--border)] px-4 py-4 pb-safe z-40">
        <div className="max-w-3xl mx-auto">
          {step === 0 && (
            <button 
              disabled={!canProceed0} 
              onClick={() => setStep(1)} 
              className="btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand/20"
            >
              Continue to Details <ArrowLeft size={18} className="rotate-180 inline ml-1"/>
            </button>
          )}
          {step === 1 && (
            <button 
              disabled={!canProceed1} 
              onClick={() => setStep(2)}               className="btn-primary w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand/20"
            >
              Choose Plan Mode <ArrowLeft size={18} className="rotate-180 inline ml-1"/>
            </button>
          )}
          {step === 2 && (
            <button 
              onClick={handleSubmit} 
              className="btn-primary w-full py-4 text-base shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 transition-all active:scale-[0.98]"
            >
              {mode === 'AI' ? (
                <><Sparkles size={18} className="inline mr-2"/>Create with AI</>
              ) : (
                <><PenLine size={18} className="inline mr-2"/>Create Manual Trip</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}