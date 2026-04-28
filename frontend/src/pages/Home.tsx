import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { Plus, MapPin, LogOut, ChevronRight, Calendar, Wallet, Hash, User } from 'lucide-react';
import { Trip } from '../types';
import LoadingScreen from '../components/common/VehicleLoader';
import toast from 'react-hot-toast';

function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const STATUS = {
    PLANNING:  { dot: 'bg-amber-400',  text: 'text-amber-600',  label: 'Planning' },
    ACTIVE:    { dot: 'bg-jade',        text: 'text-jade',        label: '● Live' },
    COMPLETED: { dot: 'bg-slate-400',  text: 'text-slate-400',  label: 'Done' },
  };
  const s = STATUS[trip.status as keyof typeof STATUS] || STATUS.PLANNING;
  return (
    <div onClick={onClick}
      className={`card-hover cursor-pointer p-4 ${trip.status === 'ACTIVE' ? 'ring-2 ring-jade/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold mb-1 ${s.text}`}>{s.label}</p>
          <h3 className="font-display font-bold text-[var(--text)] text-base truncate">{trip.name}</h3>
          <p className="text-[var(--muted)] text-sm flex items-center gap-1 mt-0.5 truncate">
            <MapPin size={12}/>{trip.start_location || trip.destination}
            {trip.destination && trip.start_location && <><span className="mx-1">→</span>{trip.destination}</>}
          </p>
        </div>
        <ChevronRight size={18} className="text-[var(--muted)] flex-shrink-0 mt-1"/>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1"><Calendar size={11}/>
          {new Date(trip.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} –
          {new Date(trip.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}
        </span>
        <span className="flex items-center gap-1"><Wallet size={11}/>₹{trip.budget?.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips]     = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining]   = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    api.get('/trips/my').then(r => setTrips(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => setTrips([])).finally(() => setLoading(false));
  }, []);

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await api.post('/trips/join-by-code', { code: joinCode.trim().toUpperCase() });
      const tripId = res.data.data?.id;
      toast.success(`Joined "${res.data.data?.name}"!`);
      navigate(`/dashboard/${tripId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid trip code');
    } finally { setJoining(false); }
  };

  if (loading) return <LoadingScreen/>;

  const activeTrip   = trips.find(t => t.status === 'ACTIVE');
  const planningTrips = trips.filter(t => t.status === 'PLANNING');
  const pastTrips    = trips.filter(t => t.status === 'COMPLETED');
  const firstName    = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Traveller';

  return (
    <div className="page pt-safe">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-brand">
              <MapPin size={17} className="text-white"/>
            </div>
            <div>
              <p className="font-display font-black text-[var(--text)] text-base leading-none">Nam Payanam</p>
              <p className="font-tamil text-[var(--muted)] text-[11px]">நம் பயணம்</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => navigate('/profile')} className="btn-icon bg-[var(--bg)] text-[var(--muted)]"><User size={17}/></button>
            <button onClick={signOut} className="btn-icon bg-[var(--bg)] text-[var(--muted)]"><LogOut size={17}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-5 pb-24">
        {/* Greeting */}
        <div>
          <h1 className="font-display font-black text-[var(--text)] text-2xl">Hey {firstName} 👋</h1>
          <p className="text-[var(--muted)] text-sm mt-0.5">Ready for your next adventure?</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/create-trip')} className="btn-primary py-4 text-sm">
            <Plus size={17}/>Plan a Trip
          </button>
          <button onClick={() => setShowJoin(!showJoin)}
            className={`btn-secondary py-4 text-sm ${showJoin ? 'border-brand text-brand' : ''}`}>
            <Hash size={17}/>Join by Code
          </button>
        </div>

        {/* Join code input */}
        {showJoin && (
          <div className="card p-4 space-y-3 animate-slide-up">
            <p className="font-bold text-[var(--text)] text-sm">Enter Trip Code</p>
            <div className="flex gap-2">
              <input className="input flex-1 font-mono text-center text-xl tracking-widest uppercase"
                placeholder="ABC123" maxLength={6}
                value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}/>
              <button onClick={handleJoinByCode} disabled={joining || !joinCode.trim()} className="btn-primary px-5 disabled:opacity-40">
                {joining ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Join'}
              </button>
            </div>
          </div>
        )}

        {/* Active trip banner */}
        {activeTrip && (
          <div onClick={() => navigate(`/dashboard/${activeTrip.id}`)}
            className="bg-gradient-to-r from-jade to-teal-600 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
              <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Active Trip</span>
            </div>
            <h3 className="font-display font-bold text-white text-lg leading-tight">{activeTrip.name}</h3>
            <p className="text-white/70 text-sm mt-0.5 flex items-center gap-1">
              <MapPin size={12}/>{activeTrip.destination}
            </p>
          </div>
        )}

        {/* Planning */}
        {planningTrips.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-[var(--text)] mb-3">Planning</h2>
            <div className="space-y-3">
              {planningTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/dashboard/${t.id}`)}/>)}
            </div>
          </section>
        )}

        {/* Past trips */}
        {pastTrips.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-[var(--text)] mb-3 text-[var(--muted)]">Past Trips</h2>
            <div className="space-y-3">
              {pastTrips.map(t => <TripCard key={t.id} trip={t} onClick={() => navigate(`/dashboard/${t.id}`)}/>)}
            </div>
          </section>
        )}

        {/* Empty */}
        {trips.length === 0 && (
          <div className="card p-10 text-center animate-fade-in">
            <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <MapPin size={36} className="text-brand"/>
            </div>
            <h3 className="font-display font-bold text-[var(--text)] text-lg">No trips yet</h3>
            <p className="text-[var(--muted)] text-sm mt-1 mb-5">Start planning your first group adventure!</p>
            <button onClick={() => navigate('/create-trip')} className="btn-primary mx-auto w-fit">
              <Plus size={16}/>Plan Your First Trip
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
