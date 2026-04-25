import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { Navigation, Users, MapPin, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

// This page handles /join/:tripId
// Replaces the old behaviour that sent users to the home page
export default function JoinTripPage() {
  const { tripId }   = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const [trip, setTrip]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined]   = useState(false);
  const [alreadyIn, setAlreadyIn] = useState(false);

  useEffect(()=>{
    if (!tripId) return;
    api.get(`/trips/${tripId}/public`).then(r=>{
      setTrip(r.data.data);
    }).catch(()=>setTrip(null)).finally(()=>setLoading(false));
  },[tripId]);

  // Check if already a member
  useEffect(()=>{
    if (!tripId || !user) return;
    api.get(`/trips/${tripId}/members`).then(r=>{
      const isMember = (r.data.data||[]).some((m:any)=>m.user_id===user.id);
      if (isMember) { setAlreadyIn(true); }
    }).catch(()=>{});
  },[tripId,user]);

  const handleJoin = async ()=>{
    if (!user) {
      // Store intent and redirect to login
      localStorage.setItem('np_join_after_login', tripId!);
      navigate(`/login?redirect=/join/${tripId}`);
      return;
    }
    setJoining(true);
    try {
      await api.post(`/trips/${tripId}/join`, { userId: user.id });
      toast.success('🎉 You joined the trip!');
      setJoined(true);
      setTimeout(()=>navigate(`/dashboard/${tripId}`), 1200);
    } catch(err:any){
      toast.error(err.response?.data?.error || 'Failed to join trip');
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="font-display font-bold text-[var(--text)] text-xl mb-2">Trip Not Found</h2>
        <p className="text-[var(--muted)] mb-6">This invite link may have expired or the trip was deleted.</p>
        <button onClick={()=>navigate('/')} className="btn-primary px-8 py-3">Go Home</button>
      </div>
    </div>
  );

  if (alreadyIn || joined) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="font-display font-bold text-[var(--text)] text-xl mb-2">
          {joined ? "You're In!" : "Already a Member"}
        </h2>
        <p className="text-[var(--muted)] mb-6">{trip.name}</p>
        <button onClick={()=>navigate(`/dashboard/${tripId}`)} className="btn-primary px-8 py-3">
          Open Trip Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        {/* Trip preview card */}
        <div className="card p-6 mb-4">
          <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🗺️</div>
          <h1 className="font-display font-bold text-[var(--text)] text-xl text-center mb-1">{trip.name}</h1>
          <p className="text-[var(--muted)] text-sm text-center mb-5">You've been invited to join this trip</p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-[var(--bg)] rounded-xl px-4 py-3">
              <Navigation size={16} className="text-brand flex-shrink-0"/>
              <div className="text-sm">
                <span className="font-semibold text-[var(--text)]">{trip.start_location}</span>
                <span className="text-[var(--muted)]"> → </span>
                <span className="font-semibold text-[var(--text)]">{trip.destination}</span>
              </div>
            </div>
            {trip.start_date && (
              <div className="flex items-center gap-3 bg-[var(--bg)] rounded-xl px-4 py-3">
                <Calendar size={16} className="text-brand flex-shrink-0"/>
                <span className="text-sm text-[var(--text)] font-semibold">
                  {new Date(trip.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                  {trip.end_date && <> – {new Date(trip.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</>}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 bg-[var(--bg)] rounded-xl px-4 py-3">
              <Users size={16} className="text-brand flex-shrink-0"/>
              <span className="text-sm text-[var(--text)] font-semibold">{trip.member_count || 1} member{trip.member_count!==1?'s':''} joined</span>
            </div>
          </div>
        </div>

        <button onClick={handleJoin} disabled={joining}
          className="btn-primary w-full py-4 text-base font-bold">
          {joining
            ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Joining…</>
            : user ? '🚀 Join This Trip' : '🔑 Sign In to Join'}
        </button>

        {!user && (
          <p className="text-center text-xs text-[var(--muted)] mt-3">
            You'll be redirected back here after signing in
          </p>
        )}

        <button onClick={()=>navigate('/')} className="w-full text-center text-sm text-[var(--muted)] mt-4 hover:text-[var(--text)] transition-colors py-2">
          Back to Home
        </button>
      </div>
    </div>
  );
}
