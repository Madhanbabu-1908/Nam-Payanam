import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { MapPin, ArrowRight, Calendar, Users } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import toast from 'react-hot-toast';

export default function JoinPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      api.get(`/trips/${tripId}`),
      api.get(`/trips/${tripId}/members`).catch(() => ({ data: { data: [] } })),
    ]).then(([tripRes, memRes]) => {
      setTrip(tripRes.data.data);
      setMembers(memRes.data.data || []);
    }).catch(() => {
      toast.error('Trip not found');
      navigate('/');
    }).finally(() => setLoading(false));
  }, [tripId]);

  const handleJoin = async () => {
    if (!user) { navigate('/login'); return; }
    setJoining(true);
    try {
      await api.post(`/trips/${tripId}/join`, {});
      toast.success(`Joined "${trip?.name}"!`);
      navigate(`/dashboard/${tripId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to join');
    } finally { setJoining(false); }
  };

  if (loading) return <LoadingScreen message="Loading trip…"/>;
  if (!trip) return null;

  const days = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1;
  const alreadyMember = members.some(m => m.user_id === user?.id) || trip.organizer_id === user?.id;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 pt-safe">
      <div className="w-full max-w-sm space-y-4 animate-slide-up">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-brand">
            <MapPin size={26} className="text-white"/>
          </div>
          <h1 className="font-display font-black text-[var(--text)] text-2xl">Nam Payanam</h1>
          <p className="font-tamil text-[var(--muted)] text-sm mt-0.5">நம் பயணம்</p>
        </div>

        {/* Trip card */}
        <div className="card p-5">
          <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">You're invited to join</p>
          <h2 className="font-display font-bold text-[var(--text)] text-xl">{trip.name}</h2>
          <p className="text-[var(--muted)] text-sm flex items-center gap-1 mt-1">
            <MapPin size={13}/>{trip.start_location || trip.destination}
            {trip.destination && trip.start_location && <><span className="mx-1">→</span>{trip.destination}</>}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-[var(--bg)] rounded-xl p-3 text-center">
              <Calendar size={18} className="text-brand mx-auto mb-1"/>
              <p className="font-bold text-[var(--text)] text-sm">{days} days</p>
              <p className="text-[var(--muted)] text-xs">
                {new Date(trip.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
              </p>
            </div>
            <div className="bg-[var(--bg)] rounded-xl p-3 text-center">
              <Users size={18} className="text-brand mx-auto mb-1"/>
              <p className="font-bold text-[var(--text)] text-sm">{members.length} joined</p>
              <p className="text-[var(--muted)] text-xs">of group</p>
            </div>
          </div>
        </div>

        {alreadyMember ? (
          <button onClick={() => navigate(`/dashboard/${tripId}`)} className="btn-primary w-full py-4 text-base">
            <ArrowRight size={18}/>Open Trip Dashboard
          </button>
        ) : user ? (
          <button onClick={handleJoin} disabled={joining} className="btn-primary w-full py-4 text-base">
            {joining
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Joining…</>
              : <><ArrowRight size={18}/>Join This Trip</>}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-[var(--muted)] text-sm">Sign in to join this trip</p>
            <button onClick={() => navigate(`/login?redirect=/join/${tripId}`)} className="btn-primary w-full py-4 text-base">
              <ArrowRight size={18}/>Sign In to Join
            </button>
            <button onClick={() => navigate(`/register?redirect=/join/${tripId}`)} className="btn-secondary w-full py-3">
              Create Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
