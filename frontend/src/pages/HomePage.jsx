import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI, sessionAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Spinner } from '../components/ui/index.jsx';

// Stable session ID stored in localStorage
function getSessionId() {
  let id = localStorage.getItem('np_session_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('np_session_id', id); }
  return id;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { setSession } = useTripStore();
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [myTrips, setMyTrips] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const sessionId = getSessionId();

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await sessionAPI.getTrips(sessionId);
      setMyTrips(res.trips || []);
    } catch { /* ignore */ }
    finally { setLoadingHistory(false); }
  }

  async function handleJoin(e) {
    e?.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return toast.error('Enter trip code and your name');
    setJoining(true);
    try {
      const res = await tripAPI.join(joinCode.trim().toUpperCase(), joinName.trim(), sessionId);
      setSession({
        memberId: res.member?.member_id || res.memberId,
        memberRowId: res.memberId,
        nickname: joinName.trim(),
        tripId: res.tripId,
        tripCode: joinCode.trim().toUpperCase(),
        isOrganizer: false,
        sessionId,
      });
      navigate(`/trip/${joinCode.trim().toUpperCase()}`);
    } catch (err) {
      toast.error(err.message);
    } finally { setJoining(false); }
  }

  function openTrip(trip, sessionData) {
    setSession({
      memberId: sessionData.member_id,
      memberRowId: sessionData.member_row_id,
      nickname: sessionData.nickname,
      tripId: sessionData.trip_id,
      tripCode: trip.trip_code,
      isOrganizer: sessionData.is_organizer,
      sessionId,
    });
    navigate(`/trip/${trip.trip_code}`);
  }

  const STATUS_CONFIG = {
    planning: { label: 'Planning', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    active: { label: 'Live 🟢', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    completed: { label: 'Completed', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FF6B35] via-[#FF4500] to-[#cc2900] pt-safe">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 border-4 border-white rounded-full" />
          <div className="absolute top-16 right-16 w-16 h-16 border-2 border-white rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 border-4 border-white rounded-full" />
        </div>

        <div className="relative px-5 pt-8 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🗺️</span>
            </div>
            <div>
              <h1 className="font-display font-extrabold text-white text-2xl leading-tight">Nam Payanam</h1>
              <p className="font-tamil text-white/70 text-sm">நம் பயணம் · Your Journey</p>
            </div>
          </div>

          <p className="text-white/90 text-base font-semibold mb-1">Where will you go next? 🌄</p>
          <p className="text-white/60 text-sm">Plan smarter. Travel together.</p>
        </div>

        {/* Wave bottom */}
        <div className="h-6 bg-[#f0f4f8] rounded-t-[2rem]" />
      </div>

      <div className="flex-1 px-4 -mt-2 pb-24 space-y-5">
        {/* My Trips */}
        {(loadingHistory || myTrips.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-slate-800 text-base">My Trips</h2>
              {!loadingHistory && <button onClick={loadHistory} className="text-xs text-[#FF6B35] font-semibold">Refresh</button>}
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {[1,2].map(i => (
                  <div key={i} className="h-24 skeleton rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {myTrips.map((s) => {
                  const t = s.trip;
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.planning;
                  return (
                    <button key={s.id} onClick={() => openTrip(t, s)} className="trip-history-card w-full text-left">
                      {/* Color accent bar */}
                      <div className={`h-1.5 w-full ${t.status === 'active' ? 'bg-emerald-500' : t.status === 'completed' ? 'bg-slate-300' : 'bg-[#FF6B35]'}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-bold text-slate-900 text-sm truncate">{t.title}</h3>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[11px] text-slate-500 font-medium truncate">
                                📍 {t.start_location} → {t.end_location}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </span>
                              <span className="text-[11px] text-slate-400">{t.start_date}</span>
                              {s.is_organizer && <span className="text-[11px] bg-[#FF6B35]/10 text-[#FF6B35] font-bold px-1.5 py-0.5 rounded-md">Organiser</span>}
                            </div>
                          </div>
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                            <span className="text-lg">{t.status === 'active' ? '🚀' : t.status === 'completed' ? '✅' : '✈️'}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Action Cards */}
        <section>
          <h2 className="font-display font-bold text-slate-800 text-base mb-3">Start a New Journey</h2>
          <div className="space-y-3">
            {/* Plan New Trip */}
            <button
              onClick={() => navigate('/create')}
              className="w-full text-left bg-gradient-to-r from-[#FF6B35] to-[#FF4500] rounded-2xl p-5 shadow-[0_4px_20px_rgba(255,107,53,0.3)] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">✈️</span>
                    <span className="font-display font-extrabold text-white text-lg">Plan a Trip</span>
                  </div>
                  <p className="text-white/70 text-sm">I'm the organiser — create a new group trip</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Join Trip */}
            <button
              onClick={() => setShowJoin(!showJoin)}
              className="w-full text-left bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-[#FF6B35] active:scale-[0.98] transition-all shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🤝</span>
                    <span className="font-display font-bold text-slate-800 text-lg">Join a Trip</span>
                  </div>
                  <p className="text-slate-500 text-sm">I have a trip code from my organiser</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showJoin ? 'bg-[#FF6B35] text-white' : 'bg-slate-100'}`}>
                  <svg className={`w-5 h-5 ${showJoin ? 'text-white rotate-90' : 'text-slate-500'} transition-all`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Join Form */}
            {showJoin && (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-slide-down space-y-4">
                <h3 className="font-display font-bold text-slate-800">Enter Trip Details</h3>
                <div>
                  <label className="label">Trip Code</label>
                  <input
                    className="input uppercase tracking-[0.25em] font-bold text-center text-xl"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="label">Your Nickname</label>
                  <input
                    className="input"
                    placeholder="What should we call you?"
                    value={joinName}
                    onChange={e => setJoinName(e.target.value)}
                    maxLength={30}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                  <p className="text-xs text-slate-400 mt-1.5">No account needed — just a name!</p>
                </div>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                >
                  {joining ? <Spinner size="sm" color="white" /> : <span>🚀</span>}
                  {joining ? 'Joining...' : 'Join Trip Group'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100">
          <h3 className="font-display font-bold text-slate-700 text-sm mb-4">Everything you need for a perfect trip</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '📍', title: 'Real Distance', desc: 'Actual route calculations' },
              { icon: '🤖', title: 'AI Planning', desc: '3 smart trip suggestions' },
              { icon: '💸', title: 'Split Expenses', desc: 'Track & settle bills' },
              { icon: '☕', title: 'Break Logger', desc: 'Log stops & activities' },
              { icon: '🗺️', title: 'Live Map', desc: 'Track trip progress' },
              { icon: '📊', title: 'Trip Report', desc: 'Full journey summary' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-xl flex-shrink-0">{f.icon}</span>
                <div>
                  <div className="font-bold text-slate-800 text-xs">{f.title}</div>
                  <div className="text-slate-400 text-[11px]">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
