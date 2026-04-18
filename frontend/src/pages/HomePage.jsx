import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI } from '../utils/api';
import { getSessionId } from '../utils/session';
import toast from 'react-hot-toast';
import { Spinner, StatusBadge, formatCurrency, formatDate } from '../components/ui/index.jsx';

const FEATURES = [
  { icon:'🤖', en:'AI Plans',      ta:'AI திட்டங்கள்'  },
  { icon:'🛣️', en:'Live Route',    ta:'நேரடி வழி'      },
  { icon:'💸', en:'Split Bills',   ta:'செலவு பகிர்'    },
  { icon:'📊', en:'Reports',       ta:'அறிக்கை'        },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { session, setSession } = useTripStore();
  const [joinCode, setJoinCode]     = useState('');
  const [joinName, setJoinName]     = useState('');
  const [joining, setJoining]       = useState(false);
  const [showJoin, setShowJoin]     = useState(false);
  const [myTrips, setMyTrips]       = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [lang, setLang]             = useState(() => localStorage.getItem('np_lang') || 'en');

  const T = {
    tagline:     lang==='ta' ? 'AI-powered பயண திட்டமிடல்' : 'AI-powered trip planning',
    planBtn:     lang==='ta' ? 'புதிய பயணம் திட்டமிடு'    : 'Plan a New Trip',
    planSub:     lang==='ta' ? 'AI + கையேடு திட்டமிடல்'   : 'AI suggestions + manual planner',
    joinBtn:     lang==='ta' ? 'பயணத்தில் சேரு'           : 'Join a Trip',
    joinSub:     lang==='ta' ? 'ட்ரிப் கோட் உள்ளதா?'      : 'Have a trip code?',
    myTrips:     lang==='ta' ? 'என் பயணங்கள்'             : 'My Trips',
    noTrips:     lang==='ta' ? 'பயணங்கள் இல்லை'           : 'No trips yet',
    noTripsSub:  lang==='ta' ? 'பயணம் உருவாக்கு அல்லது சேரு' : 'Create or join a trip',
    joinGroup:   lang==='ta' ? 'குழுவில் சேரு'             : 'Join Trip Group',
    codePH:      lang==='ta' ? 'பயண குறியீடு'             : 'TRIP CODE',
    namePH:      lang==='ta' ? 'உங்கள் பெயர்'             : 'Your nickname',
    joining:     lang==='ta' ? 'சேர்கிறோம்...'            : 'Joining...',
    joinNow:     lang==='ta' ? '🚀 குழுவில் சேரு'         : '🚀 Join Trip',
    resume:      lang==='ta' ? 'தொடர்'                     : 'Continue',
    refresh:     lang==='ta' ? 'புதுப்பி'                  : 'Refresh',
  };

  useEffect(() => { loadMyTrips(); }, []);
  useEffect(() => { localStorage.setItem('np_lang', lang); }, [lang]);

  async function loadMyTrips() {
    setLoadingTrips(true);
    try {
      const res = await tripAPI.getMyTrips(getSessionId());
      setMyTrips(res.trips || []);
    } catch { setMyTrips([]); }
    finally { setLoadingTrips(false); }
  }

  async function handleJoin(e) {
    e?.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return toast.error(lang==='ta'?'குறியீடு மற்றும் பெயர் தேவை':'Enter trip code and name');
    setJoining(true);
    try {
      const res = await tripAPI.join(joinCode.trim().toUpperCase(), joinName.trim(), getSessionId());
      setSession({ memberId: res.memberUUID, memberRowId: res.memberId, nickname: joinName.trim(),
        tripId: res.tripId, tripCode: joinCode.trim().toUpperCase(), isOrganizer: false });
      navigate(`/trip/${joinCode.trim().toUpperCase()}`);
    } catch (err) { toast.error(err.message); }
    finally { setJoining(false); }
  }

  function rejoinTrip(t) {
    setSession({ memberId: t.member_id, memberRowId: null, nickname: t.my_nickname,
      tripId: t.id, tripCode: t.trip_code, isOrganizer: t.is_organizer });
    navigate(`/trip/${t.trip_code}`);
  }

  const STATUS_BORDER = { planning:'border-l-amber-400', active:'border-l-emerald-400', completed:'border-l-indigo-400' };
  const STATUS_EMOJI  = { planning:'✈️', active:'🚀', completed:'✅' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="bg-hero-gradient relative overflow-hidden pt-safe">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-64 h-64 bg-white rounded-full -translate-x-8"/>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-saffron-500 rounded-full translate-y-16 -translate-x-8"/>
        </div>

        <div className="relative px-5 pt-8 pb-6">
          {/* Brand + lang toggle */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25">
                <span className="text-2xl">🗺️</span>
              </div>
              <div>
                <h1 className="font-display font-black text-white text-xl leading-none">Nam Payanam</h1>
                <p className="font-tamil text-white/70 text-xs mt-0.5">நம் பயணம்</p>
              </div>
            </div>
            <button onClick={() => setLang(l => l==='en'?'ta':'en')}
              className="bg-white/15 border border-white/30 rounded-xl px-3 py-1.5 text-white text-xs font-bold active:scale-95 transition-all">
              {lang==='en' ? '🌐 தமிழ்' : '🌐 English'}
            </button>
          </div>

          <p className="text-white/80 text-sm mb-5">{T.tagline}</p>

          {/* Main CTAs */}
          <div className="space-y-3">
            <button onClick={() => navigate('/create')}
              className="w-full bg-white text-indigo-700 font-display font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center gap-3 px-5">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">✈️</span>
              </div>
              <div className="text-left flex-1">
                <div className="text-base">{T.planBtn}</div>
                <div className="text-xs text-indigo-400 font-normal mt-0.5">{T.planSub}</div>
              </div>
              <svg className="w-5 h-5 text-indigo-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            <button onClick={() => setShowJoin(!showJoin)}
              className="w-full bg-white/15 backdrop-blur-sm border border-white/30 text-white font-display font-bold py-4 rounded-2xl active:scale-[0.98] transition-all flex items-center gap-3 px-5">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🤝</span>
              </div>
              <div className="text-left flex-1">
                <div className="text-base">{T.joinBtn}</div>
                <div className="text-xs text-white/60 font-normal mt-0.5">{T.joinSub}</div>
              </div>
              <svg className={`w-5 h-5 text-white/50 flex-shrink-0 transition-transform ${showJoin?'rotate-90':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {/* Inline join form */}
          {showJoin && (
            <form onSubmit={handleJoin} className="mt-3 bg-white rounded-2xl p-4 space-y-3 shadow-lg animate-slide-up">
              <h3 className="font-display font-bold text-slate-800">{T.joinGroup}</h3>
              <input className="input uppercase tracking-[0.3em] font-black text-center text-2xl"
                placeholder={T.codePH} value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6}/>
              <input className="input" placeholder={T.namePH}
                value={joinName} onChange={e => setJoinName(e.target.value)} maxLength={30}/>
              <button type="submit" disabled={joining} className="btn-primary w-full py-3.5">
                {joining ? <Spinner size="sm" color="white"/> : null}
                {joining ? T.joining : T.joinNow}
              </button>
            </form>
          )}
        </div>

        {/* Feature strip */}
        <div className="flex border-t border-white/15 px-5 py-3 gap-0 justify-around">
          {FEATURES.map(f => (
            <div key={f.en} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-xl">{f.icon}</span>
              <span className="text-white/70 text-[10px] font-bold text-center">{lang==='ta'?f.ta:f.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── My Trips ──────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-5 pb-8">
        {/* Section header — fully separated from hero, never hidden */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-slate-900 text-lg">{T.myTrips}</h2>
          <button onClick={loadMyTrips} disabled={loadingTrips}
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl active:scale-95 transition-all disabled:opacity-50">
            {loadingTrips
              ? <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
            }
            {T.refresh}
          </button>
        </div>

        {loadingTrips ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="skeleton h-[88px] w-full"/>)}
          </div>
        ) : myTrips.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-3">🗺️</div>
            <p className="font-display font-bold text-slate-700">{T.noTrips}</p>
            <p className="text-sm text-slate-400 mt-1">{T.noTripsSub}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTrips.map(t => (
              <button key={t.id} onClick={() => rejoinTrip(t)}
                className={`w-full card p-4 text-left border-l-4 ${STATUS_BORDER[t.status]||'border-l-slate-200'} active:scale-[0.98] transition-all`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{STATUS_EMOJI[t.status]||'🗺️'}</span>
                      <h3 className="font-display font-bold text-slate-900 text-sm truncate">{t.title}</h3>
                      {t.is_organizer && <span className="badge badge-gold text-[10px] flex-shrink-0">★ {lang==='ta'?'ஒருங்கிணைப்பாளர்':'Org'}</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">📍 {t.start_location?.split(',')[0]} → {t.end_location?.split(',')[0]}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(t.start_date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <StatusBadge status={t.status}/>
                    <span className="badge badge-indigo text-[10px] font-mono">{t.trip_code}</span>
                    <span className="text-xs text-indigo-500 font-bold">{T.resume} →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Tamil tagline footer */}
        <div className="mt-6 text-center">
          <p className="font-tamil text-slate-400 text-xs">உங்கள் பயண தோழன் — Nam Payanam</p>
        </div>
      </div>
    </div>
  );
}
