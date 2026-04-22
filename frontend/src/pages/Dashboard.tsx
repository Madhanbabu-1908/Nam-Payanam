import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, Map, DollarSign, Users, CalendarDays, PieChart, Navigation, Sparkles, Trash2, Play, CheckCircle } from 'lucide-react';
import { Trip } from '../types';
import { useAuth } from '../context/AuthContext';

interface Stats { spent: number; members: number; daysLeft: number; daysTotal: number; }

const MENU = [
  { title:'Itinerary',   icon:CalendarDays, color:'text-violet-600', bg:'bg-violet-50',   path:'itinerary', desc:'Day-wise plan' },
  { title:'Expenses',    icon:DollarSign,   color:'text-jade',       bg:'bg-emerald-50',  path:'expenses',  desc:'Track spending' },
  { title:'Settlements', icon:PieChart,     color:'text-sky-600',    bg:'bg-sky-50',      path:'settlements',desc:'Who owes whom' },
  { title:'Members',     icon:Users,        color:'text-amber-600',  bg:'bg-amber-50',    path:'members',   desc:'Travel group' },
  { title:'Live Map',    icon:Navigation,   color:'text-rose-600',   bg:'bg-rose-50',     path:'map',       desc:'GPS tracking' },
  { title:'AI Assist',   icon:Sparkles,     color:'text-violet-600', bg:'bg-violet-50',   path:'ai',        desc:'Smart helper' },
];

export default function Dashboard() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip]     = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]   = useState<Stats>({ spent:0, members:1, daysLeft:0, daysTotal:1 });
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      api.get(`/trips/${tripId}`),
      api.get(`/expenses/${tripId}`).catch(() => ({ data: { data: [] } })),
      api.get(`/trips/${tripId}/members`).catch(() => ({ data: { data: [] } })),
    ]).then(([tripRes, expRes, memRes]) => {
      const t = tripRes.data.data;
      setTrip(t);
      const spent    = expRes.data.data?.reduce((s: number, e: any) => s + (e.amount||0), 0) || 0;
      const members  = memRes.data.data?.length || 1;
      const start    = new Date(t.start_date).getTime();
      const end      = new Date(t.end_date).getTime();
      const now      = Date.now();
      const daysTotal = Math.ceil((end-start)/86400000)+1;
      const daysLeft  = Math.max(0, Math.ceil((end-now)/86400000));
      setStats({ spent, members, daysLeft, daysTotal });
      setIsOrganizer(t.organizer_id === user?.id);
    }).catch(console.error).finally(() => setLoading(false));
  }, [tripId, user]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      await api.patch(`/trips/${tripId}`, { status });
      setTrip(t => t ? {...t, status: status as any} : t);
    } catch { alert('Failed to update status'); }
    finally { setUpdating(false); }
  };

  const deleteTrip = async () => {
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    try { await api.delete(`/trips/${tripId}`); navigate('/'); }
    catch { alert('Failed to delete trip'); }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-3 border-brand/20 border-t-brand rounded-full animate-spin"/>
        <p className="text-[var(--muted)] text-sm font-medium">Loading adventure…</p>
      </div>
    </div>
  );

  if (!trip) return (
    <div className="h-screen flex items-center justify-center bg-[var(--bg)] px-6 text-center">
      <div className="card p-8 max-w-sm w-full">
        <h2 className="font-display font-bold text-[var(--text)] text-xl mb-2">Trip Not Found</h2>
        <p className="text-[var(--muted)] text-sm mb-5">This trip may have been deleted.</p>
        <button onClick={() => navigate('/')} className="btn-primary w-full">Go Home</button>
      </div>
    </div>
  );

  const progressPct = trip.status === 'COMPLETED' ? 100 : trip.status === 'ACTIVE'
    ? Math.min(99, Math.round(((stats.daysTotal-stats.daysLeft)/stats.daysTotal)*100)) : 0;

  return (
    <div className="page pt-safe">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate('/')} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-[var(--text)] text-base truncate">{trip.name}</h1>
            <div className="flex items-center gap-2">
              <span className={`badge text-[11px] ${trip.status==='ACTIVE'?'badge-jade':trip.status==='COMPLETED'?'badge-slate':'badge-amber'}`}>
                {trip.status==='ACTIVE'?'● LIVE':trip.status==='COMPLETED'?'✓ Done':'Planning'}
              </span>
              <span className="text-[var(--muted)] text-xs">{stats.members} members</span>
            </div>
          </div>
          {isOrganizer && (
            <button onClick={deleteTrip} className="btn-icon text-rose-500 hover:bg-rose-50">
              <Trash2 size={18}/>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {/* Trip summary card */}
        <div className="bg-gradient-to-br from-brand to-orange-600 rounded-2xl p-5 text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Destination</p>
              <h2 className="font-display font-black text-xl mt-0.5">{trip.destination}</h2>
              <p className="text-white/70 text-sm flex items-center gap-1 mt-0.5">
                <Map size={13}/>
                {new Date(trip.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} –
                {new Date(trip.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}
              </p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
              <p className="font-display font-black text-2xl">{stats.daysLeft}</p>
              <p className="text-white/70 text-xs">days left</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Trip progress</span><span>{progressPct}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{width:`${progressPct}%`, background:'rgba(255,255,255,0.8)'}}/>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <p className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider">Spent</p>
            <p className="font-display font-black text-[var(--text)] text-lg">₹{stats.spent.toLocaleString('en-IN')}</p>
            <p className="text-[var(--muted)] text-[11px]">of ₹{trip.budget?.toLocaleString('en-IN')}</p>
          </div>
          <div className="stat-card">
            <p className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider">Members</p>
            <p className="font-display font-black text-[var(--text)] text-lg">{stats.members}</p>
            <p className="text-[var(--muted)] text-[11px]">in group</p>
          </div>
          <div className="stat-card">
            <p className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider">Mode</p>
            <p className="font-display font-black text-[var(--text)] text-lg">{trip.mode}</p>
            <p className="text-[var(--muted)] text-[11px]">{trip.mode==='AI'?'AI planned':'Manual'}</p>
          </div>
        </div>

        {/* Organiser actions */}
        {isOrganizer && trip.status !== 'COMPLETED' && (
          <div className="card p-4">
            <p className="text-[var(--muted)] text-xs font-bold uppercase mb-3">Organiser Controls</p>
            <div className="flex gap-3">
              {trip.status === 'PLANNING' && (
                <button onClick={() => updateStatus('ACTIVE')} disabled={updating}
                  className="btn-primary flex-1 py-3">
                  <Play size={16}/>{updating?'Starting…':'Start Trip'}
                </button>
              )}
              {trip.status === 'ACTIVE' && (
                <button onClick={() => updateStatus('COMPLETED')} disabled={updating}
                  className="btn-secondary flex-1 py-3 text-jade border-jade/30">
                  <CheckCircle size={16}/>{updating?'Completing…':'Complete Trip'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Menu grid */}
        <div className="grid grid-cols-2 gap-3">
          {MENU.map(item => (
            <button key={item.path}
              onClick={() => navigate(`/dashboard/${tripId}/${item.path}`)}
              className="card-hover text-left p-4 flex items-start gap-3">
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <item.icon size={20} className={item.color}/>
              </div>
              <div>
                <p className="font-display font-bold text-[var(--text)] text-sm">{item.title}</p>
                <p className="text-[var(--muted)] text-xs mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
