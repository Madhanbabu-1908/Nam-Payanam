import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI } from '../utils/api';
import { getSessionId } from '../utils/session';
import toast from 'react-hot-toast';
import { Spinner, StatusBadge, formatCurrency, formatDate } from '../components/ui/index.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const { session, setSession } = useTripStore();
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [myTrips, setMyTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    loadMyTrips();
  }, []);

  async function loadMyTrips() {
    const sid = getSessionId();
    try {
      const res = await tripAPI.getMyTrips(sid);
      setMyTrips(res.trips || []);
    } catch { setMyTrips([]); }
    finally { setLoadingTrips(false); }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return toast.error('Enter trip code and your name');
    setJoining(true);
    try {
      const sid = getSessionId();
      const res = await tripAPI.join(joinCode.trim().toUpperCase(), joinName.trim(), sid);
      setSession({ memberId: res.memberUUID, memberRowId: res.memberId, nickname: joinName.trim(), tripId: res.tripId, tripCode: joinCode.trim().toUpperCase(), isOrganizer: false });
      navigate(`/trip/${joinCode.trim().toUpperCase()}`);
    } catch (err) { toast.error(err.message); }
    finally { setJoining(false); }
  }

  function rejoinTrip(t) {
    setSession({ memberId: t.member_id, memberRowId: null, nickname: t.my_nickname, tripId: t.id, tripCode: t.trip_code, isOrganizer: t.is_organizer });
    navigate(`/trip/${t.trip_code}`);
  }

  const statusColor = { planning:'border-l-amber-400', active:'border-l-emerald-400', completed:'border-l-indigo-400' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero */}
      <div className="bg-hero-gradient relative overflow-hidden pt-safe">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-64 h-64 bg-white rounded-full -translate-x-8"/>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-saffron-500 rounded-full translate-y-16 -translate-x-8"/>
        </div>
        <div className="relative px-5 pt-10 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25 shadow-glass">
              <span className="text-3xl">🗺️</span>
            </div>
            <div>
              <h1 className="font-display font-black text-white text-2xl leading-none">Nam Payanam</h1>
              <p className="font-tamil text-white/70 text-sm mt-0.5">நம் பயணம்</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed mb-6 max-w-xs">
            AI-powered trip planning with real-time route tracking, smart expense splitting & group coordination.
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <button onClick={() => navigate('/create')}
              className="w-full bg-white text-indigo-700 font-display font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-3 px-5">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-xl">✈️</span></div>
              <div className="text-left">
                <div className="text-base">Plan a New Trip</div>
                <div className="text-xs text-indigo-400 font-body font-normal">AI suggestions + manual planner</div>
              </div>
              <svg className="w-5 h-5 text-indigo-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            <button onClick={() => setShowJoin(!showJoin)}
              className="w-full bg-white/15 backdrop-blur-sm border border-white/30 text-white font-display font-bold py-4 rounded-2xl active:scale-95 transition-all flex items-center gap-3 px-5">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-xl">🤝</span></div>
              <div className="text-left">
                <div className="text-base">Join a Trip</div>
                <div className="text-xs text-white/60 font-body font-normal">Have a trip code?</div>
              </div>
            </button>
          </div>

          {/* Join form inline */}
          {showJoin && (
            <form onSubmit={handleJoin} className="mt-4 bg-white rounded-2xl p-4 space-y-3 shadow-glass animate-slide-down">
              <h3 className="font-display font-bold text-slate-800 text-base">Join Trip Group</h3>
              <input className="input uppercase tracking-widest font-black text-center text-xl" placeholder="TRIP CODE" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} maxLength={6}/>
              <input className="input" placeholder="Your nickname (no personal info needed)" value={joinName} onChange={e=>setJoinName(e.target.value)} maxLength={30}/>
              <button type="submit" disabled={joining} className="btn-primary w-full py-3.5">
                {joining ? <Spinner size="sm" color="white"/> : '🚀'}{joining ? 'Joining...' : 'Join Trip'}
              </button>
            </form>
          )}
        </div>

        {/* Features strip */}
        <div className="flex border-t border-white/15 px-5 py-3 gap-4 justify-around">
          {[['🤖','AI Plans'],['🛣️','Live Route'],['💸','Split Bills'],['📊','Reports']].map(([ic,lb]) => (
            <div key={lb} className="flex flex-col items-center gap-1">
              <span className="text-xl">{ic}</span>
              <span className="text-white/70 text-[10px] font-bold">{lb}</span>
            </div>
          ))}
        </div>
      </div>

      {/* My Trips */}
      <div className="flex-1 px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-slate-900 text-lg">My Trips</h2>
          <button onClick={loadMyTrips} className="btn-icon bg-slate-100 active:bg-slate-200">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>

        {loadingTrips ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="skeleton h-24 w-full"/>)}
          </div>
        ) : myTrips.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-3">🗺️</div>
            <p className="font-display font-bold text-slate-700">No trips yet</p>
            <p className="text-sm text-slate-400 mt-1">Create or join a trip to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTrips.map(t => (
              <button key={t.id} onClick={() => rejoinTrip(t)}
                className={`w-full card p-4 text-left border-l-4 ${statusColor[t.status]||'border-l-slate-200'} active:scale-[0.98] transition-all`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-slate-900 text-sm truncate">{t.title}</h3>
                      {t.is_organizer && <span className="badge badge-gold text-[10px] flex-shrink-0">★ Org</span>}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span>📍</span> {t.start_location} → {t.end_location}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(t.start_date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusBadge status={t.status}/>
                    <span className="badge badge-indigo text-[10px]">{t.trip_code}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 text-center">
        <p className="text-xs text-slate-400 font-tamil">நம் பயணம் — உங்கள் பயண நண்பன்</p>
      </div>
    </div>
  );
}
