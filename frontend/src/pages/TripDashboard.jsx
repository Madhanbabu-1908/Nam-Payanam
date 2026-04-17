import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI, expenseAPI, breakAPI } from '../utils/api';
import { getSessionId } from '../utils/session';
import supabase from '../utils/supabase';
import toast from 'react-hot-toast';
import {
  Spinner, StatusBadge, MemberAvatar, TripCodeBadge,
  ProgressBar, BottomSheet, formatCurrency, formatDate
} from '../components/ui/index.jsx';
import ItineraryTab    from '../components/trip/ItineraryTab.jsx';
import ExpensesTab     from '../components/trip/ExpensesTab.jsx';
import BreaksTab       from '../components/trip/BreaksTab.jsx';
import MapTab          from '../components/trip/MapTab.jsx';
import AIAssistant     from '../components/ai/AIAssistant.jsx';
import MembersPanel    from '../components/trip/MembersPanel.jsx';
import AnnouncementBanner from '../components/trip/AnnouncementBanner.jsx';

const TABS = [
  { id:'itinerary', icon:'📅', label:'Plan'     },
  { id:'expenses',  icon:'💸', label:'Expenses' },
  { id:'breaks',    icon:'☕', label:'Breaks'   },
  { id:'map',       icon:'🗺️', label:'Map'      },
  { id:'ai',        icon:'🤖', label:'AI'       },
];

export default function TripDashboard() {
  const { code } = useParams();
  const navigate  = useNavigate();
  const {
    session, setSession, trip, members, days, progress, expenses, breaks,
    setTripData, setExpenses, setBreaks, setProgress,
    activeDay, setActiveDay, getProgressPercent
  } = useTripStore();

  const [activeTab, setActiveTab]       = useState('itinerary');
  const [loading, setLoading]           = useState(true);
  const [showMembers, setShowMembers]   = useState(false);
  const [showShare, setShowShare]       = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [deleteStep, setDeleteStep]     = useState(0); // 0=prompt,1=confirm
  const [deleting, setDeleting]         = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const loadedRef = useRef(false);

  // ── Load trip (idempotent, never clears on nav) ──────────
  const loadTrip = useCallback(async () => {
    try {
      const res = await tripAPI.getByCode(code);
      if (res.trip.status === 'deleted') {
        toast.error('This trip has been deleted');
        navigate('/');
        return;
      }
      setTripData({ trip: res.trip, members: res.members, days: res.days, progress: res.progress });

      const sid = getSessionId();
      if (!session || session.tripCode !== code) {
        // Try to restore session from DB
        const myRes = await tripAPI.getMyTrips(sid);
        const found = myRes.trips?.find(t => t.trip_code === code);
        if (found) {
          setSession({
            memberId: found.member_id, memberRowId: null,
            nickname: found.my_nickname, tripId: found.id,
            tripCode: code, isOrganizer: found.is_organizer
          });
        } else {
          setLoading(false);
          return; // show join view
        }
      }

      const [expRes, brkRes, annRes] = await Promise.all([
        expenseAPI.getAll(res.trip.id),
        breakAPI.getAll(res.trip.id),
        tripAPI.getAnnouncements(res.trip.id),
      ]);
      setExpenses(expRes.expenses || []);
      setBreaks(brkRes.breaks || []);
      setAnnouncements(annRes.announcements || []);
    } catch (err) {
      if (err.message?.includes('not found')) { toast.error('Trip not found'); navigate('/'); }
    } finally { setLoading(false); }
  }, [code]);

  useEffect(() => {
    if (!loadedRef.current) { loadedRef.current = true; loadTrip(); }
  }, [loadTrip]);

  // ── Realtime subscriptions ────────────────────────────────
  useEffect(() => {
    if (!trip?.id) return;
    const ch = supabase.channel(`trip-${trip.id}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'trip_members',      filter:`trip_id=eq.${trip.id}` }, () => loadTrip())
      .on('postgres_changes', { event:'*', schema:'public', table:'trip_progress',     filter:`trip_id=eq.${trip.id}` }, () => loadTrip())
      .on('postgres_changes', { event:'*', schema:'public', table:'trip_days',         filter:`trip_id=eq.${trip.id}` }, () => loadTrip())
      .on('postgres_changes', { event:'*', schema:'public', table:'trip_announcements',filter:`trip_id=eq.${trip.id}` }, () => loadTrip())
      .on('postgres_changes', { event:'*', schema:'public', table:'expenses',          filter:`trip_id=eq.${trip.id}` }, async () => {
        const r = await expenseAPI.getAll(trip.id); setExpenses(r.expenses||[]);
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'trip_breaks',       filter:`trip_id=eq.${trip.id}` }, async () => {
        const r = await breakAPI.getAll(trip.id); setBreaks(r.breaks||[]);
      })
      // Listen for trip deletion
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'trips', filter:`id=eq.${trip.id}` }, (payload) => {
        if (payload.new?.status === 'deleted') {
          toast.error('🗑️ This trip was deleted by the organiser');
          navigate('/');
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [trip?.id]);

  // ── Status change ─────────────────────────────────────────
  async function handleStatus(status) {
    try {
      await tripAPI.updateStatus(trip.id, status, session?.memberId);
      await loadTrip();
      toast.success(status === 'active' ? '🚀 Trip started!' : '🎉 Trip completed!');
    } catch (err) { toast.error(err.message); }
  }

  // ── Delete trip (double confirm) ──────────────────────────
  async function handleDelete() {
    if (deleteStep === 0) { setDeleteStep(1); return; }
    setDeleting(true);
    try {
      await tripAPI.delete(trip.id, session?.memberId);
      toast.success('Trip deleted');
      navigate('/');
    } catch (err) { toast.error(err.message); setDeleting(false); }
  }

  // ── Copy helpers ──────────────────────────────────────────
  function copyCode() { navigator.clipboard.writeText(code); toast.success('Code copied!'); }
  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    toast.success('Invite link copied!');
  }

  // ── Guest join view ───────────────────────────────────────
  if (!loading && (!session || session.tripCode !== code)) {
    return <GuestJoinView code={code} trip={trip} members={members}
      setSession={setSession} navigate={navigate} onJoined={loadTrip}/>;
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center animate-pulse"><span className="text-3xl">🗺️</span></div>
        <Spinner size="lg" color="indigo"/>
        <p className="text-sm text-slate-500 font-semibold">Loading your trip...</p>
      </div>
    </div>
  );

  const pct = getProgressPercent();
  const totalSpent = expenses.reduce((s,e) => s + parseFloat(e.amount), 0);
  const spotsLeft = (trip?.group_size||0) - members.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top header ───────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 pt-safe sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button onClick={() => navigate('/')} className="btn-icon bg-slate-100">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-slate-900 text-base truncate">{trip?.title}</h1>
              <StatusBadge status={trip?.status}/>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{members.length}/{trip?.group_size} members</span>
              {session?.isOrganizer && <span className="badge badge-gold text-[10px]">★ Organiser</span>}
            </div>
          </div>
          <button onClick={() => setShowMembers(true)} className="btn-icon bg-slate-100 relative">
            <span className="text-lg">👥</span>
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">{members.length}</span>
          </button>
          <button onClick={() => setShowShare(true)} className="btn-icon bg-saffron-500">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
        </div>

        {/* Progress bar for active trips */}
        {trip?.status === 'active' && (
          <div className="px-4 pb-2.5">
            <ProgressBar percent={pct}/>
          </div>
        )}

        {/* Stats strip */}
        <div className="flex border-t border-slate-100">
          {[
            { icon:'📍', label:'Route', value:`${trip?.start_location?.split(',')[0]} → ${trip?.end_location?.split(',')[0]}` },
            { icon:'📅', label:'Date',  value:formatDate(trip?.start_date) },
            { icon:'💰', label:'Spent', value:formatCurrency(totalSpent) },
          ].map((s,i) => (
            <div key={i} className={`flex-1 px-2.5 py-2 ${i<2?'border-r border-slate-100':''}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase">{s.icon} {s.label}</div>
              <div className="text-[11px] font-black text-slate-700 truncate mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="tab-bar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`tab-item ${activeTab===tab.id ? 'tab-active' : 'tab-inactive'}`}>
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Announcement banner */}
      {announcements.length > 0 && (
        <AnnouncementBanner announcement={announcements[0]}/>
      )}

      {/* ── Tab content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'itinerary' && (
          <ItineraryTab trip={trip} days={days} members={members} progress={progress}
            session={session} activeDay={activeDay} setActiveDay={setActiveDay}
            onStatusChange={handleStatus} onRefresh={loadTrip}
            onDeleteTrip={() => setShowDelete(true)}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab trip={trip} members={members} expenses={expenses} session={session}/>
        )}
        {activeTab === 'breaks' && (
          <BreaksTab trip={trip} breaks={breaks} expenses={expenses} members={members} session={session}/>
        )}
        {activeTab === 'map' && (
          <MapTab trip={trip} days={days} progress={progress} session={session}
            onProgressUpdate={async (data) => { await tripAPI.updateProgress(trip.id, data); }}
          />
        )}
        {activeTab === 'ai' && <AIAssistant trip={trip} session={session}/>}
      </div>

      {/* ── Share bottom sheet ────────────────────────────── */}
      <BottomSheet isOpen={showShare} onClose={() => setShowShare(false)} title="Share Trip">
        <div className="space-y-4 pb-4">
          <p className="text-sm text-slate-500">Share with your travel group</p>
          <div><label className="label">Trip Code</label><TripCodeBadge code={code} onCopy={copyCode}/></div>
          <button onClick={copyLink}
            className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-4 text-sm font-bold text-indigo-700 active:bg-indigo-100 transition-colors flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <div className="text-left">
              <div>Copy Invite Link</div>
              <div className="text-xs font-normal text-indigo-400 mt-0.5">nam-payanam.vercel.app/join/{code}</div>
            </div>
          </button>
          <div className={`p-3 rounded-xl border text-center text-sm font-bold ${spotsLeft>0?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
            {members.length}/{trip?.group_size} spots filled{spotsLeft>0?` · ${spotsLeft} open`:' · Group Full'}
          </div>
          {session?.isOrganizer && (
            <AnnouncementComposer tripId={trip?.id} nickname={session?.nickname} onPosted={() => { setShowShare(false); loadTrip(); }}/>
          )}
        </div>
      </BottomSheet>

      {/* ── Delete confirmation ───────────────────────────── */}
      <BottomSheet isOpen={showDelete} onClose={() => { setShowDelete(false); setDeleteStep(0); }} title="Delete Trip">
        <div className="space-y-4 pb-4">
          {deleteStep === 0 ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <div className="text-4xl mb-3">⚠️</div>
                <h3 className="font-display font-bold text-red-700 text-lg">Delete "{trip?.title}"?</h3>
                <p className="text-sm text-red-600 mt-2">This will permanently delete all members, expenses, breaks and itinerary data.</p>
              </div>
              <button onClick={handleDelete} className="btn-danger w-full py-4 text-base font-display font-bold">
                Yes, I want to delete this trip
              </button>
              <button onClick={() => setShowDelete(false)} className="btn-ghost w-full">Cancel</button>
            </>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <div className="text-4xl mb-3">🗑️</div>
                <h3 className="font-display font-bold text-red-700">Final Confirmation</h3>
                <p className="text-sm text-red-600 mt-2">All {members.length} members will be notified. {expenses.length} expenses and all trip data will be erased forever.</p>
              </div>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger w-full py-4 text-base font-display font-bold">
                {deleting ? <Spinner size="sm" color="white"/> : '🗑️'} {deleting ? 'Deleting...' : 'PERMANENTLY DELETE'}
              </button>
              <button onClick={() => { setShowDelete(false); setDeleteStep(0); }} className="btn-ghost w-full">Cancel</button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* Members panel */}
      <MembersPanel isOpen={showMembers} onClose={() => setShowMembers(false)}
        trip={trip} members={members} session={session} onRefresh={loadTrip}/>
    </div>
  );
}

// ── Guest Join View ──────────────────────────────────────────
function GuestJoinView({ code, trip, members, setSession, navigate, onJoined }) {
  const [nickname, setNickname] = useState('');
  const [joining, setJoining]   = useState(false);
  const isFull = (members?.length||0) >= (trip?.group_size||4);

  async function join() {
    if (!nickname.trim()) return toast.error('Enter your nickname');
    setJoining(true);
    try {
      const sid = getSessionId();
      const res = await tripAPI.join(code, nickname.trim(), sid);
      setSession({ memberId:res.memberUUID, memberRowId:res.memberId, nickname:nickname.trim(), tripId:res.tripId, tripCode:code, isOrganizer:false });
      toast.success('Joined! Welcome 🎉');
      onJoined();
    } catch (err) { toast.error(err.message); }
    finally { setJoining(false); }
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-glass animate-slide-up space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-4xl">🤝</span></div>
          <h1 className="font-display font-black text-slate-900 text-xl">{trip?.title || 'Join Trip'}</h1>
          <p className="text-sm text-slate-500 mt-1">{trip?.start_location} → {trip?.end_location}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="badge badge-indigo">{members?.length||0}/{trip?.group_size} members</span>
            {isFull && <span className="badge badge-red">Group Full</span>}
          </div>
        </div>
        {isFull ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-700 font-bold">This group is full</p>
            <button onClick={() => navigate('/')} className="btn-ghost mt-3 w-full">Back to Home</button>
          </div>
        ) : (
          <>
            <div>
              <label className="label">Your Nickname</label>
              <input className="input text-center text-lg font-bold" placeholder="What should we call you?" value={nickname}
                onChange={e => setNickname(e.target.value)} onKeyDown={e => e.key==='Enter' && join()} maxLength={30}/>
              <p className="text-xs text-slate-400 mt-1.5 text-center">No personal info needed — just a name!</p>
            </div>
            <button onClick={join} disabled={joining} className="btn-primary w-full py-4 text-base">
              {joining ? <Spinner size="sm" color="white"/> : '🚀'} {joining ? 'Joining...' : 'Join This Trip'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Announcement composer (organiser only) ───────────────────
function AnnouncementComposer({ tripId, nickname, onPosted }) {
  const [msg, setMsg]     = useState('');
  const [type, setType]   = useState('info');
  const [posting, setPosting] = useState(false);

  async function post() {
    if (!msg.trim()) return;
    setPosting(true);
    try {
      await tripAPI.postAnnouncement(tripId, { message:msg.trim(), type, postedBy:nickname });
      toast.success('Announcement posted!');
      setMsg(''); onPosted();
    } catch (err) { toast.error(err.message); }
    finally { setPosting(false); }
  }

  return (
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">📢 Post Announcement</p>
      <div className="flex gap-2">
        {[['info','ℹ️'],['warning','⚠️'],['alert','🚨'],['milestone','🎉']].map(([v,ic]) => (
          <button key={v} onClick={() => setType(v)}
            className={`flex-1 py-2 rounded-xl text-sm transition-all ${type===v?'bg-indigo-600 text-white':'bg-slate-100 text-slate-500'}`}>
            {ic}
          </button>
        ))}
      </div>
      <textarea className="input resize-none text-sm" rows={2} placeholder="Announce something to the group..." value={msg} onChange={e => setMsg(e.target.value)}/>
      <button onClick={post} disabled={posting||!msg.trim()} className="btn-indigo w-full">
        {posting ? <Spinner size="sm" color="white"/> : '📢'} Post
      </button>
    </div>
  );
}
