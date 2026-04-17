import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI, expenseAPI, sessionAPI, trackingAPI } from '../utils/api';
import supabase from '../utils/supabase';
import toast from 'react-hot-toast';
import { Spinner, TripCodeBadge, ProgressBar, StatusBadge, MemberAvatar, formatCurrency, formatDate, BottomSheet } from '../components/ui/index.jsx';
import ItineraryTab from '../components/trip/ItineraryTab.jsx';
import ExpensesTab from '../components/trip/ExpensesTab.jsx';
import MapTab from '../components/trip/MapTab.jsx';
import AIAssistant from '../components/ai/AIAssistant.jsx';
import MembersPanel from '../components/trip/MembersPanel.jsx';
import BreakStopSheet from '../components/trip/BreakStopSheet.jsx';

const TABS = [
  { id:'itinerary', icon:'📅', label:'Plan' },
  { id:'expenses',  icon:'💸', label:'Expenses' },
  { id:'breaks',    icon:'☕', label:'Breaks' },
  { id:'map',       icon:'🗺️', label:'Map' },
  { id:'ai',        icon:'🤖', label:'AI' },
];

export default function TripDashboard() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { session, setSession, trip, members, days, progress, expenses, setTripData, setExpenses, activeDay, setActiveDay, getProgressPercent } = useTripStore();

  const [activeTab, setActiveTab] = useState('itinerary');
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showBreakSheet, setShowBreakSheet] = useState(false);
  const [breakStops, setBreakStops] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTrip = useCallback(async () => {
    try {
      const res = await tripAPI.getByCode(code);
      setTripData({ trip: res.trip, members: res.members, days: res.days, progress: res.progress });
      setBreakStops(res.breakStops || []);
      if (!session || session.tripCode !== code) { setLoading(false); return; }
      const expRes = await expenseAPI.getAll(res.trip.id);
      setExpenses(expRes.expenses || []);
      const sid = localStorage.getItem('np_session_id');
      if (sid) sessionAPI.touch(sid, code).catch(()=>{});
    } catch {
      toast.error('Trip not found');
      navigate('/');
    } finally { setLoading(false); }
  }, [code]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  useEffect(() => {
    if (!trip?.id) return;
    const ch = supabase.channel(`trip-${trip.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'trip_members',filter:`trip_id=eq.${trip.id}`},()=>loadTrip())
      .on('postgres_changes',{event:'*',schema:'public',table:'expenses',filter:`trip_id=eq.${trip.id}`},async()=>{ const r=await expenseAPI.getAll(trip.id); setExpenses(r.expenses||[]); })
      .on('postgres_changes',{event:'*',schema:'public',table:'trip_progress',filter:`trip_id=eq.${trip.id}`},()=>loadTrip())
      .on('postgres_changes',{event:'*',schema:'public',table:'break_stops',filter:`trip_id=eq.${trip.id}`},()=>loadTrip())
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, [trip?.id]);

  async function handleStatusChange(s) {
    try { await tripAPI.updateStatus(trip.id, s, session?.memberId); await loadTrip(); toast.success(s==='active'?'Trip started! 🚀':'Trip completed! 🎉'); }
    catch(err){ toast.error(err.message); }
  }

  async function handleDeleteTrip() {
    setDeleting(true);
    try { await tripAPI.deleteTrip(trip.id, session?.memberId); toast.success('Trip deleted'); navigate('/'); }
    catch(err){ toast.error(err.message); }
    finally { setDeleting(false); }
  }

  function copyCode() { navigator.clipboard.writeText(code); toast.success('Code copied!'); }
  function copyLink() { navigator.clipboard.writeText(`${window.location.origin}/join/${code}`); toast.success('Link copied!'); }

  if (!loading && (!session || session.tripCode !== code)) {
    return <GuestJoinView code={code} trip={trip} members={members} onJoined={loadTrip} setSession={setSession} navigate={navigate}/>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#FF4500] rounded-2xl flex items-center justify-center animate-pulse-soft"><span className="text-3xl">🗺️</span></div>
          <Spinner size="lg"/><p className="text-sm text-slate-500 font-semibold mt-1">Loading trip...</p>
        </div>
      </div>
    );
  }

  const pct = getProgressPercent();
  const totalSpent = expenses.reduce((s,e)=>s+parseFloat(e.amount),0);
  const isOrganizer = session?.isOrganizer;
  const isActive = trip?.status === 'active';

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pt-safe sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={()=>navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex-1 mx-3">
            <h1 className="font-display font-extrabold text-slate-900 text-base leading-tight truncate">{trip?.title}</h1>
            <div className="flex items-center gap-2">
              <StatusBadge status={trip?.status}/>
              <span className="text-xs text-slate-400">{members.length}/{trip?.group_size} members</span>
              {isOrganizer&&<span className="text-[10px] bg-orange-100 text-[#FF6B35] font-bold px-1.5 py-0.5 rounded-md">Organiser</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowMembers(true)} className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200">
              <span className="text-base">👥</span>
              {members.length>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B35] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{members.length}</span>}
            </button>
            <button onClick={()=>setShowShareSheet(true)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#FF4500] active:scale-95">
              <span className="text-base">🔗</span>
            </button>
          </div>
        </div>
        {isActive&&<div className="px-4 pb-2"><ProgressBar percent={pct}/></div>}
        <div className="grid grid-cols-3 border-t border-slate-100">
          {[
            {icon:'📍',label:'Route',value:`${trip?.start_location?.split(',')[0]}→${trip?.end_location?.split(',')[0]}`},
            {icon:'📅',label:'Date',value:formatDate(trip?.start_date)},
            {icon:'💰',label:'Spent',value:formatCurrency(totalSpent)},
          ].map((s,i)=>(
            <div key={i} className={`px-3 py-2 ${i<2?'border-r border-slate-100':''}`}>
              <div className="text-[10px] text-slate-400 font-bold">{s.icon} {s.label}</div>
              <div className="text-xs font-bold text-slate-700 truncate mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="flex border-t border-slate-100 overflow-x-auto scrollbar-hide">
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={`flex-1 min-w-[60px] py-2.5 flex flex-col items-center gap-0.5 transition-colors text-xs font-bold ${activeTab===tab.id?'text-[#FF6B35] border-b-2 border-[#FF6B35]':'text-slate-400'}`}>
              <span className="text-base">{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab==='itinerary'&&<ItineraryTab trip={trip} days={days} members={members} progress={progress} session={session} activeDay={activeDay} setActiveDay={setActiveDay} onStatusChange={handleStatusChange} onRefresh={loadTrip}/>}
        {activeTab==='expenses'&&<ExpensesTab trip={trip} members={members} expenses={expenses} session={session}/>}
        {activeTab==='breaks'&&(
          <BreaksTab
            trip={trip} breakStops={breakStops} session={session} days={days}
            onAddBreak={()=>setShowBreakSheet(true)}
            onRefresh={loadTrip}
          />
        )}
        {activeTab==='map'&&<MapTab trip={trip} days={days} progress={progress} breakStops={breakStops} session={session}/>}
        {activeTab==='ai'&&<AIAssistant trip={trip} session={session}/>}
      </div>

      {/* Organiser delete button — bottom left, only visible */}
      {isOrganizer&&(
        <div className="fixed bottom-6 left-4 z-30">
          <button onClick={()=>setShowDeleteConfirm(true)} className="w-11 h-11 bg-white border-2 border-red-200 text-red-500 rounded-xl flex items-center justify-center shadow active:scale-95">🗑️</button>
        </div>
      )}

      {/* Members panel */}
      <MembersPanel isOpen={showMembers} onClose={()=>setShowMembers(false)} trip={trip} members={members} session={session} onRefresh={loadTrip}/>

      {/* Share sheet */}
      <BottomSheet isOpen={showShareSheet} onClose={()=>setShowShareSheet(false)} title="Share Trip">
        <div className="space-y-4 pb-4">
          <p className="text-sm text-slate-500">Share this code with your travel buddies</p>
          <TripCodeBadge code={code} onCopy={copyCode}/>
          <button onClick={copyLink} className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 font-bold active:bg-blue-100 text-left">📋 Copy invite link</button>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-semibold">{members.length}/{trip?.group_size} spots filled {members.length>=trip?.group_size?'· Full!':''}</p>
          </div>
        </div>
      </BottomSheet>

      {/* Break sheet — only triggered from Breaks tab */}
      <BreakStopSheet isOpen={showBreakSheet} onClose={()=>setShowBreakSheet(false)} trip={trip} session={session} days={days} onAdded={()=>{ loadTrip(); }}/>

      {/* Delete confirm */}
      <BottomSheet isOpen={showDeleteConfirm} onClose={()=>setShowDeleteConfirm(false)} title="⚠️ Delete Trip Group">
        <div className="space-y-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-bold text-red-700 mb-1">This cannot be undone!</p>
            <p className="text-xs text-red-600">All members, expenses, breaks, tracking data will be deleted permanently.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDeleteTrip} disabled={deleting} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              {deleting?<Spinner size="sm" color="white"/>:'🗑️'}
              {deleting?'Deleting...':'Delete'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ── Breaks Tab ─────────────────────────────────────────────────────────────────
function BreaksTab({ trip, breakStops, session, days, onAddBreak, onRefresh }) {
  const totalDuration = breakStops.reduce((s,b)=>s+(b.duration_minutes||0), 0);

  return (
    <div className="flex flex-col pb-28 animate-fade-in">
      {/* Header */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-lg">Break Log ☕</h2>
            <p className="text-white/80 text-xs mt-0.5">Stops, rests & unplanned fun</p>
          </div>
          {/* Log Break button — ONLY in this tab */}
          {trip?.status === 'active' && (
            <button onClick={onAddBreak} className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-4 py-2 rounded-xl text-sm active:scale-95">
              + Log Break
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-4">
          <div><div className="text-white/70 text-xs">Total Breaks</div><div className="font-extrabold text-xl">{breakStops.length}</div></div>
          <div className="w-px bg-white/20"/>
          <div><div className="text-white/70 text-xs">Total Time</div><div className="font-extrabold text-xl">{totalDuration}m</div></div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 mt-4 space-y-3">
        {breakStops.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">☕</div>
            <h3 className="font-display font-bold text-slate-700 text-base mb-1">No breaks logged yet</h3>
            <p className="text-sm text-slate-400 mb-4">Stopped for chai? A scenic view? Log it!</p>
            {trip?.status === 'active' && <button onClick={onAddBreak} className="btn-primary px-6">Log First Break</button>}
          </div>
        ) : (
          breakStops.map(b => (
            <div key={b.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">☕</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">{b.reason}</h4>
                    <span className="text-xs text-slate-400 flex-shrink-0">Day {b.day_number}</span>
                  </div>
                  {b.location&&<p className="text-xs text-blue-600 font-semibold mt-0.5">📍 {b.location}</p>}
                  {b.activities&&<p className="text-xs text-slate-500 mt-1">🎯 {b.activities}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    {b.duration_minutes&&<span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-lg">⏱️ {b.duration_minutes}m</span>}
                    <span className="text-xs text-slate-400">by {b.added_by_nickname}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Guest Join View ────────────────────────────────────────────────────────────
function GuestJoinView({ code, trip, members, onJoined, setSession, navigate }) {
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    if (!nickname.trim()) return toast.error('Enter your name');
    setJoining(true);
    try {
      const sessionId = localStorage.getItem('np_session_id') || crypto.randomUUID();
      localStorage.setItem('np_session_id', sessionId);
      const res = await tripAPI.join(code, nickname.trim(), sessionId);
      setSession({ memberId: res.member?.member_id||res.memberId, memberRowId: res.memberId, nickname: nickname.trim(), tripId: res.tripId, tripCode: code, isOrganizer: false, sessionId });
      toast.success('Joined! 🎉');
      onJoined();
    } catch(err){ toast.error(err.message); }
    finally { setJoining(false); }
  }

  const isFull = members?.length >= trip?.group_size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0066CC] via-[#0052A3] to-[#003d7a] flex flex-col items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"><div className="absolute top-10 right-10 w-40 h-40 border-4 border-white rounded-full"/><div className="absolute bottom-20 left-5 w-24 h-24 border-2 border-white rounded-full"/></div>
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><span className="text-3xl">🤝</span></div>
          <h1 className="font-display font-extrabold text-slate-900 text-xl">{trip?.title||'Join Trip'}</h1>
          <p className="text-sm text-slate-500 mt-1">{trip?.start_location?.split(',')[0]} → {trip?.end_location?.split(',')[0]}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="badge badge-blue">{members?.length||0}/{trip?.group_size} members</span>
            {isFull&&<span className="badge badge-red">Full</span>}
          </div>
        </div>
        {isFull ? (
          <div className="bg-red-50 rounded-xl p-4 text-center"><p className="text-sm text-red-700 font-bold mb-3">Group is full</p><button onClick={()=>navigate('/')} className="btn-secondary w-full">Go Back</button></div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Your Nickname</label>
              <input className="input" placeholder="What should we call you?" value={nickname} onChange={e=>setNickname(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleJoin()} maxLength={30}/>
            </div>
            <button onClick={handleJoin} disabled={joining} className="btn-ocean w-full flex items-center justify-center gap-2 py-4 font-extrabold text-base">
              {joining?<Spinner size="sm" color="white"/>:'🚀'}
              {joining?'Joining...':'Join the Adventure!'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
