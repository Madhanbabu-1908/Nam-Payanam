import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, RefreshCw, Download, Coffee, Sun, Moon, Clock, X, MapPin, DollarSign } from 'lucide-react';
import { Trip } from '../types';

const TIME_ICON: Record<string, React.ReactNode> = {
  Morning:   <Coffee size={14}/>,
  Afternoon: <Sun size={14}/>,
  Evening:   <Moon size={14}/>,
  Night:     <Moon size={14}/>,
};

const CAT_COLOR: Record<string, string> = {
  SIGHTSEEING: 'bg-sky-100 text-sky-700',
  FOOD:        'bg-orange-100 text-orange-700',
  TRANSPORT:   'bg-slate-100 text-slate-600',
  ACTIVITY:    'bg-jade/10 text-jade',
  REST:        'bg-violet-100 text-violet-700',
};

export default function ItineraryPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems]   = useState<any[]>([]);
  const [trip, setTrip]     = useState<Trip | null>(null);
  const [loading, setLoad]  = useState(true);
  const [regen, setRegen]   = useState(false);
  const [isOrg, setIsOrg]   = useState(false);
  const [addSheet, setAdd]  = useState(false);
  const [activeDay, setDay] = useState(1);
  // Add form
  const [form, setForm] = useState({ day_number:1, time_slot:'Morning', location_name:'', description:'', estimated_cost:0 });

  const load = async () => {
    try {
      const [tripRes, itemRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/itinerary/trip/${tripId}`).catch(() => ({data:{data:[]}})),
      ]);
      setTrip(tripRes.data.data);
      setIsOrg(tripRes.data.data?.organizer_id === user?.id);
      setItems(itemRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoad(false); }
  };

  useEffect(() => { if (tripId) load(); }, [tripId]);

  const handleRegen = async () => {
    if (!confirm('Regenerate itinerary with AI? Current items will be replaced.')) return;
    setRegen(true);
    try { await api.post(`/ai/trips/${tripId}/regenerate`); await load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed to regenerate'); }
    finally { setRegen(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/itinerary/${tripId}`, form);
      setAdd(false);
      setForm({ day_number:1, time_slot:'Morning', location_name:'', description:'', estimated_cost:0 });
      await load();
    } catch { alert('Failed to add stop'); }
  };

  const deleteStop = async (id: string) => {
    try { await api.delete(`/itinerary/${id}`); setItems(i => i.filter(x=>x.id!==id)); }
    catch { alert('Failed to delete'); }
  };

  const days = [...new Set(items.map(i => i.day_number))].sort((a,b)=>a-b);
  const total = Math.ceil((new Date(trip?.end_date||'').getTime()-new Date(trip?.start_date||'').getTime())/86400000)+1;

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Itinerary</h1>
          <div className="flex gap-2">
            {isOrg && trip?.mode === 'AI' && (
              <button onClick={handleRegen} disabled={regen}
                className="btn-ghost py-2 px-3 text-xs border border-[var(--border)]">
                <RefreshCw size={14} className={regen?'animate-spin':''}/>{regen?'…':'AI'}
              </button>
            )}
            {isOrg && (
              <button onClick={() => setAdd(true)} className="btn-primary py-2 px-3 text-sm">
                <Plus size={16}/>Add
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-20"/>)}</div>
        ) : items.length === 0 ? (
          <div className="card p-8 text-center mt-4">
            <MapPin size={40} className="text-[var(--muted)] mx-auto mb-3 opacity-40"/>
            <p className="font-bold text-[var(--text)]">No itinerary yet</p>
            {isOrg && trip?.mode === 'AI' && (
              <button onClick={handleRegen} disabled={regen} className="btn-primary mx-auto mt-4 w-fit">
                <RefreshCw size={16} className={regen?'animate-spin':''}/>{regen?'Generating…':'Generate with AI ✨'}
              </button>
            )}
            {isOrg && <button onClick={() => setAdd(true)} className="btn-secondary mx-auto mt-3 w-fit"><Plus size={16}/>Add Stop</button>}
          </div>
        ) : (
          <>
            {/* Day tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
              {(days.length > 0 ? days : Array.from({length:total},(_,i)=>i+1)).map(d => (
                <button key={d} onClick={() => setDay(d)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${activeDay===d?'bg-brand text-white border-brand shadow-brand':'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]'}`}>
                  Day {d}
                </button>
              ))}
            </div>

            {/* Items for active day */}
            <div className="space-y-3 pb-8">
              {items.filter(i=>i.day_number===activeDay).length === 0 ? (
                <div className="card p-5 text-center text-[var(--muted)] text-sm">No stops for Day {activeDay}</div>
              ) : items.filter(i=>i.day_number===activeDay).sort((a,b)=>(a.time_slot||'').localeCompare(b.time_slot||'')).map((item: any) => (
                <div key={item.id} className="card p-4 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[var(--bg)] rounded-lg flex items-center justify-center text-[var(--muted)] flex-shrink-0 mt-0.5">
                      {TIME_ICON[item.time_slot] || <Clock size={14}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[var(--text)] text-sm">{item.location_name}</p>
                          <p className="text-[var(--muted)] text-xs mt-0.5">{item.time_slot}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.estimated_cost > 0 && (
                            <span className="text-xs font-bold text-jade flex items-center gap-0.5">
                              <DollarSign size={12}/>₹{item.estimated_cost}
                            </span>
                          )}
                          {item.category && (
                            <span className={`badge text-[10px] ${CAT_COLOR[item.category]||'badge-slate'}`}>
                              {item.category}
                            </span>
                          )}
                          {isOrg && (
                            <button onClick={() => deleteStop(item.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-rose-50 hover:text-rose-500 transition">
                              <X size={14}/>
                            </button>
                          )}
                        </div>
                      </div>
                      {item.description && <p className="text-[var(--muted)] text-xs mt-1.5 leading-relaxed">{item.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Add stop sheet */}
      {addSheet && (
        <>
          <div className="sheet-overlay" onClick={()=>setAdd(false)}/>
          <div className="sheet">
            <div className="sheet-handle"/>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <h2 className="font-display font-bold text-[var(--text)] text-lg">Add Stop</h2>
              <button onClick={()=>setAdd(false)} className="btn-icon bg-[var(--bg)]"><X size={18}/></button>
            </div>
            <form onSubmit={handleAdd} className="px-5 py-4 space-y-4 pb-safe">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Day</label>
                  <select className="input" value={form.day_number} onChange={e=>setForm(f=>({...f,day_number:+e.target.value}))}>
                    {Array.from({length:total},(_,i)=>i+1).map(d=><option key={d} value={d}>Day {d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Time</label>
                  <select className="input" value={form.time_slot} onChange={e=>setForm(f=>({...f,time_slot:e.target.value}))}>
                    {['Morning','Afternoon','Evening','Night'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" placeholder="e.g. Ooty Botanical Garden" required
                  value={form.location_name} onChange={e=>setForm(f=>({...f,location_name:e.target.value}))}/>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={2} placeholder="What to do there…"
                  value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              </div>
              <div>
                <label className="label">Est. Cost (₹)</label>
                <input type="number" className="input" placeholder="0"
                  value={form.estimated_cost||''} onChange={e=>setForm(f=>({...f,estimated_cost:+e.target.value}))}/>
              </div>
              <button type="submit" className="btn-primary w-full py-4">
                <Plus size={16}/> Add Stop
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
