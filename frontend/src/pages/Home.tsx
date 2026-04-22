import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { Plus, MapPin, LogOut, Sparkles, ChevronRight, Calendar, Wallet, User } from 'lucide-react';
import { Trip } from '../types';

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  PLANNING:  { label: 'Planning',  cls: 'badge-amber',  dot: 'bg-amber-400' },
  ACTIVE:    { label: 'Live 🟢',   cls: 'badge-jade',   dot: 'bg-jade' },
  COMPLETED: { label: 'Done',      cls: 'badge-slate',  dot: 'bg-slate-400' },
};

function TripCard({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[trip.status] || STATUS_CONFIG.PLANNING;
  const start = new Date(trip.start_date);
  const end   = new Date(trip.end_date);
  const isActive = trip.status === 'ACTIVE';

  return (
    <div onClick={() => navigate(`/dashboard/${trip.id}`)}
      className={`card-hover cursor-pointer p-4 ${isActive ? 'ring-2 ring-jade/40' : ''}`}>
      {isActive && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="live-dot"/> <span className="text-xs font-bold text-jade">LIVE TRIP</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-[var(--text)] text-base truncate">{trip.name}</h3>
            <span className={`badge flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
          </div>
          <p className="text-sm text-[var(--muted)] flex items-center gap-1 truncate">
            <MapPin size={13}/> {trip.destination}
          </p>
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${trip.mode === 'AI' ? 'bg-violet-100' : 'bg-sky-100'}`}>
          {trip.mode === 'AI' ? <Sparkles size={20} className="text-violet-600"/> : <MapPin size={20} className="text-sky-600"/>}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <Calendar size={12}/>
            {start.toLocaleDateString('en-IN', { day:'numeric', month:'short' })} –{' '}
            {end.toLocaleDateString('en-IN',   { day:'numeric', month:'short', year:'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-[var(--muted)]">
          <Wallet size={12}/> ₹{trip.budget?.toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips]     = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/trips/my').then(res => {
      setTrips(Array.isArray(res.data.data) ? res.data.data : []);
    }).catch(() => setTrips([])).finally(() => setLoading(false));
  }, []);

  const activeTrip   = trips.find(t => t.status === 'ACTIVE');
  const planningTrips = trips.filter(t => t.status === 'PLANNING');
  const pastTrips    = trips.filter(t => t.status === 'COMPLETED');

  return (
    <div className="page pt-safe">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center">
              <MapPin size={18} className="text-white"/>
            </div>
            <div>
              <p className="font-display font-black text-[var(--text)] text-base leading-none">Nam Payanam</p>
              <p className="font-tamil text-[var(--muted)] text-[11px]">நம் பயணம்</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/profile')}
              className="btn-icon bg-[var(--bg)] text-[var(--muted)] hover:text-brand">
              <User size={18}/>
            </button>
            <button onClick={signOut}
              className="btn-icon bg-[var(--bg)] text-[var(--muted)] hover:text-rose-500">
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="font-display font-black text-[var(--text)] text-2xl">
            Hey {user?.user_metadata?.full_name?.split(' ')[0] || 'Traveller'} 👋
          </h1>
          <p className="text-[var(--muted)] text-sm mt-0.5">Where will you go next?</p>
        </div>

        {/* CTA */}
        <button onClick={() => navigate('/create-trip')}
          className="btn-primary w-full py-4 text-base">
          <Plus size={20}/> Plan a New Trip
        </button>

        {/* Active trip banner */}
        {activeTrip && (
          <div onClick={() => navigate(`/dashboard/${activeTrip.id}`)}
            className="bg-gradient-to-r from-jade to-teal-600 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2 mb-1">
              <div className="live-dot bg-white/80"/><span className="text-white/80 text-xs font-bold">ACTIVE NOW</span>
            </div>
            <h3 className="font-display font-bold text-white text-lg">{activeTrip.name}</h3>
            <p className="text-white/70 text-sm flex items-center gap-1"><MapPin size={13}/>{activeTrip.destination}</p>
            <div className="flex items-center gap-1 text-white/60 text-xs mt-2">
              Open trip <ChevronRight size={14}/>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-28"/>)}
          </div>
        )}

        {/* Planning trips */}
        {!loading && planningTrips.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-[var(--text)] mb-3">Planning</h2>
            <div className="space-y-3">
              {planningTrips.map(t => <TripCard key={t.id} trip={t}/>)}
            </div>
          </section>
        )}

        {/* Past trips */}
        {!loading && pastTrips.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-[var(--text)] mb-3">Past Trips</h2>
            <div className="space-y-3">
              {pastTrips.map(t => <TripCard key={t.id} trip={t}/>)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && trips.length === 0 && (
          <div className="card p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={36} className="text-brand"/>
            </div>
            <h3 className="font-display font-bold text-[var(--text)] text-lg">No trips yet</h3>
            <p className="text-[var(--muted)] text-sm mt-1 mb-5">Create your first group trip and start exploring!</p>
            <button onClick={() => navigate('/create-trip')} className="btn-primary mx-auto w-fit">
              <Plus size={18}/> Create Trip
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
