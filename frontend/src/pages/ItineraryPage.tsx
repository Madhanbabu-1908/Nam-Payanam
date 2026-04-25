import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Sparkles, Plus, Pencil, Trash2,
  ChevronDown, ChevronUp, Clock, MapPin, IndianRupee, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const STOP_TYPES = ['HOTEL','FOOD','ATTRACTION','VIEWPOINT','FUEL','REST','OTHER'];
const STOP_ICONS: Record<string,string> = {
  HOTEL:'🏨', FOOD:'🍽️', ATTRACTION:'🎯', VIEWPOINT:'🏔️',
  FUEL:'⛽', REST:'☕', START:'🏠', END:'🏁', STOP:'📍', OTHER:'📌'
};

export default function ItineraryPage() {
  const { tripId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [trip, setTrip]       = useState<any>(null);
  const [stops, setStops]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoad]= useState(false);
  const [aiProgress, setAiProg] = useState('');
  const [isOrg, setIsOrg]     = useState(false);
  const [expandDay, setExpand]= useState<Record<number,boolean>>({0:true});

  // Add/Edit stop sheet
  const [editSheet, setEditSheet] = useState(false);
  const [editData,  setEditData]  = useState<any>(null); // null = new stop
  const [form, setForm] = useState({
    name:'', stop_type:'FOOD', day:1, time:'', duration_minutes:'60',
    cost_estimate:'', notes:'', latitude:'', longitude:''
  });

  const load = useCallback(async () => {
    if (!tripId) return;
    try {
      const [tRes, sRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/itinerary/trips/${tripId}`),
      ]);
      const t = tRes.data.data;
      setTrip(t);
      setIsOrg(t.organizer_id === user?.id);
      const raw: any[] = sRes.data.data || [];
      raw.sort((a,b) => a.day_number - b.day_number || (a.time_of_day||'').localeCompare(b.time_of_day||''));
      setStops(raw);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tripId, user]);

  useEffect(() => { load(); }, [load]);

  // ── AI Generation with streaming progress ────────────────
  const generateWithAI = async () => {
    if (!trip) return;
    if (!confirm('This will replace the current itinerary with an AI-generated plan. Continue?')) return;
    setAiLoad(true);
    setAiProg('Searching for places along the route…');

    const steps = [
      'Searching for places along the route…',
      'Finding top attractions near each stop…',
      'Looking up hotel and food options…',
      'Calculating driving times between stops…',
      'Building your day-wise plan…',
      'Finalising recommendations…',
    ];
    let si = 0;
    const iv = setInterval(() => {
      si = (si + 1) % steps.length;
      setAiProg(steps[si]);
    }, 2200);

    try {
      const res = await api.post(`/itinerary/trips/${tripId}/generate-ai`, {
        tripId,
        startLocation: trip.start_location,
        destination:   trip.destination,
        stops:         trip.stops || [],
        startDate:     trip.start_date,
        endDate:       trip.end_date,
        budget:        trip.budget,
        interests:     trip.interests || [],
        useWebSearch:  true,   // tells backend to use Groq with web-search enabled
      });

      if (res.data.success) {
        toast.success(`✨ AI generated ${res.data.data?.count || ''} stops!`);
        await load();
      } else {
        throw new Error(res.data.error || 'Generation failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'AI generation failed');
    } finally {
      clearInterval(iv);
      setAiLoad(false);
      setAiProg('');
    }
  };

  // ── Save stop ─────────────────────────────────────────────
  const saveStop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        day_number: parseInt(form.day as any),
        duration_minutes: parseInt(form.duration_minutes) || 60,
        cost_estimate: parseFloat(form.cost_estimate as any) || 0,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      if (editData?.id) {
        await api.put(`/itinerary/${editData.id}`, payload);
        toast.success('Stop updated');
      } else {
        await api.post(`/itinerary/trips/${tripId}`, payload);
        toast.success('Stop added');
      }
      setEditSheet(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const deleteStop = async (stopId: string) => {
    if (!confirm('Delete this stop?')) return;
    try {
      await api.delete(`/itinerary/${stopId}`);
      toast.success('Deleted');
      setStops(p => p.filter(s => s.id !== stopId));
    } catch { toast.error('Delete failed'); }
  };

  const openEdit = (stop?: any) => {
    if (stop) {
      setEditData(stop);
      setForm({
        name: stop.name || '', stop_type: stop.stop_type || 'FOOD',
        day: stop.day_number || 1, time: stop.time_of_day || '',
        duration_minutes: String(stop.duration_minutes || 60),
        cost_estimate: String(stop.cost_estimate || ''),
        notes: stop.notes || '',
        latitude: String(stop.latitude || ''), longitude: String(stop.longitude || ''),
      });
    } else {
      setEditData(null);
      const maxDay = stops.length > 0 ? Math.max(...stops.map(s => s.day_number)) : 1;
      setForm({ name:'', stop_type:'FOOD', day:maxDay, time:'', duration_minutes:'60', cost_estimate:'', notes:'', latitude:'', longitude:'' });
    }
    setEditSheet(true);
  };

  // Group stops by day
  const days: Record<number, any[]> = {};
  stops.forEach(s => {
    const d = s.day_number || 0;
    if (!days[d]) days[d] = [];
    days[d].push(s);
  });
  const dayNums = Object.keys(days).map(Number).sort((a,b)=>a-b);

  const totalCost = stops.reduce((s,x) => s + (parseFloat(x.cost_estimate)||0), 0);
  const totalHrs  = stops.reduce((s,x) => s + (parseInt(x.duration_minutes)||0), 0);

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={()=>navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Itinerary</h1>
          {isOrg && (
            <div className="flex gap-2">
              <button onClick={generateWithAI} disabled={aiLoading}
                className="btn-ghost py-2 px-3 text-sm border border-[var(--border)] flex items-center gap-1.5">
                {aiLoading
                  ? <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"/>
                  : <Sparkles size={15} className="text-brand"/>}
                {aiLoading ? 'AI…' : 'AI'}
              </button>
              <button onClick={()=>openEdit()} className="btn-primary py-2 px-4 text-sm">
                <Plus size={16}/> Add
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-10 space-y-4">
        {/* Stats */}
        {stops.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:'Stops', value: stops.length },
              { label:'Est. Cost', value:`₹${totalCost.toLocaleString('en-IN')}` },
              { label:'Duration', value:`${Math.round(totalHrs/60)}h` },
            ].map(s=>(
              <div key={s.label} className="stat-card text-center">
                <p className="font-display font-black text-[var(--text)] text-xl">{s.value}</p>
                <p className="text-[var(--muted)] text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* AI loading state */}
        {aiLoading && (
          <div className="card p-5 text-center border border-brand/30">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center">
                <Sparkles size={24} className="text-brand animate-pulse"/>
              </div>
            </div>
            <p className="font-display font-bold text-[var(--text)] mb-1">AI is planning your trip ✨</p>
            <p className="text-sm text-[var(--muted)] animate-pulse">{aiProgress}</p>
            <p className="text-xs text-[var(--muted)] mt-3">Using web search to find real places, timings & costs</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i=><div key={i} className="skeleton h-20"/>)}
          </div>
        ) : stops.length === 0 && !aiLoading ? (
          <div className="card p-8 text-center">
            <MapPin size={44} className="text-[var(--muted)] mx-auto mb-3 opacity-40"/>
            <p className="font-display font-bold text-[var(--text)] text-lg mb-1">No itinerary yet</p>
            <p className="text-[var(--muted)] text-sm mb-5">Generate a complete plan with AI or add stops manually</p>
            {isOrg && (
              <div className="space-y-3">
                <button onClick={generateWithAI} className="btn-primary w-full py-3">
                  <Sparkles size={18}/> Generate with AI ✨
                </button>
                <button onClick={()=>openEdit()} className="btn-ghost w-full py-3 border border-[var(--border)]">
                  <Plus size={18}/> Add Stop
                </button>
              </div>
            )}
          </div>
        ) : (
          dayNums.map(day=>{
            const isOpen = expandDay[day] !== false;
            const dayStops = days[day];
            const dayCost = dayStops.reduce((s,x)=>s+(parseFloat(x.cost_estimate)||0),0);
            return (
              <div key={day} className="card overflow-hidden">
                {/* Day header */}
                <button onClick={()=>setExpand(p=>({...p,[day]:!isOpen}))}
                  className="w-full px-4 py-3 flex items-center justify-between bg-[var(--surface)] border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center font-black text-white text-sm">{day}</div>
                    <div className="text-left">
                      <p className="font-display font-bold text-[var(--text)] text-sm">Day {day}</p>
                      <p className="text-[var(--muted)] text-xs">{dayStops.length} stops · ₹{dayCost.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-[var(--muted)]"/> : <ChevronDown size={16} className="text-[var(--muted)]"/>}
                </button>

                {isOpen && (
                  <div className="divide-y divide-[var(--border)]">
                    {dayStops.map((stop, si) => (
                      <div key={stop.id} className="px-4 py-3">
                        {/* Timeline connector */}
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-9 h-9 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl flex items-center justify-center text-base z-10">
                              {STOP_ICONS[stop.stop_type] || STOP_ICONS.OTHER}
                            </div>
                            {si < dayStops.length-1 && <div className="w-0.5 flex-1 bg-[var(--border)] mt-1 min-h-4"/>}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[var(--text)] text-sm leading-tight">{stop.name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {stop.time_of_day && (
                                    <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                                      <Clock size={10}/>{stop.time_of_day}
                                    </span>
                                  )}
                                  {stop.duration_minutes && (
                                    <span className="text-[11px] text-[var(--muted)]">
                                      {stop.duration_minutes >= 60
                                        ? `${Math.floor(stop.duration_minutes/60)}h${stop.duration_minutes%60?` ${stop.duration_minutes%60}m`:''}`
                                        : `${stop.duration_minutes}m`}
                                    </span>
                                  )}
                                  {stop.cost_estimate>0 && (
                                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600">
                                      <IndianRupee size={9}/>{parseFloat(stop.cost_estimate).toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                                {stop.notes && <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">{stop.notes}</p>}
                              </div>
                              {isOrg && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <button onClick={()=>openEdit(stop)} className="btn-icon w-7 h-7 text-[var(--muted)] hover:text-brand"><Pencil size={13}/></button>
                                  <button onClick={()=>deleteStop(stop.id)} className="btn-icon w-7 h-7 text-[var(--muted)] hover:text-rose-500"><Trash2 size={13}/></button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isOrg && (
                      <button onClick={()=>{ setForm(p=>({...p,day:day})); openEdit(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-brand hover:bg-brand/5 transition-colors font-semibold">
                        <Plus size={15}/> Add stop to Day {day}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Add/Edit stop sheet */}
      {editSheet && (
        <>
          <div className="sheet-overlay" onClick={()=>setEditSheet(false)}/>
          <div className="sheet">
            <div className="sheet-handle"/>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <h2 className="font-display font-bold text-[var(--text)] text-lg">{editData?'Edit Stop':'Add Stop'}</h2>
              <button onClick={()=>setEditSheet(false)} className="btn-icon bg-[var(--bg)] text-[var(--muted)]"><X size={18}/></button>
            </div>
            <form onSubmit={saveStop} className="px-5 py-4 space-y-4 pb-safe overflow-y-auto max-h-[70vh]">
              <div>
                <label className="label">Stop Name *</label>
                <input required className="input" placeholder="e.g. Ooty Botanical Garden"
                  value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
              </div>

              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {STOP_TYPES.map(t=>(
                    <button key={t} type="button" onClick={()=>setForm(p=>({...p,stop_type:t}))}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${form.stop_type===t?'bg-brand text-white border-brand':'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'}`}>
                      <span className="text-xl">{STOP_ICONS[t]}</span>
                      <span>{t.charAt(0)+t.slice(1).toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Day</label>
                  <input type="number" min={1} className="input" value={form.day}
                    onChange={e=>setForm(p=>({...p,day:parseInt(e.target.value)||1}))}/>
                </div>
                <div>
                  <label className="label">Time</label>
                  <input type="time" className="input" value={form.time}
                    onChange={e=>setForm(p=>({...p,time:e.target.value}))}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Duration (min)</label>
                  <input type="number" className="input" placeholder="60"
                    value={form.duration_minutes} onChange={e=>setForm(p=>({...p,duration_minutes:e.target.value}))}/>
                </div>
                <div>
                  <label className="label">Est. Cost (₹)</label>
                  <input type="number" className="input" placeholder="0"
                    value={form.cost_estimate} onChange={e=>setForm(p=>({...p,cost_estimate:e.target.value}))}/>
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea rows={2} className="input resize-none" placeholder="Tips, timings, what to see…"
                  value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Latitude</label>
                  <input className="input text-sm" placeholder="optional"
                    value={form.latitude} onChange={e=>setForm(p=>({...p,latitude:e.target.value}))}/>
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input className="input text-sm" placeholder="optional"
                    value={form.longitude} onChange={e=>setForm(p=>({...p,longitude:e.target.value}))}/>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full py-4">
                <Check size={18}/> {editData ? 'Save Changes' : 'Add Stop'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
