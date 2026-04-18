import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI, expenseAPI, breakAPI } from '../utils/api';
import { getSessionId } from '../utils/session';
import { useOffline, flushQueue, getQueue } from '../utils/useOffline';
import supabase from '../utils/supabase';
import toast from 'react-hot-toast';
import {
  Spinner, StatusBadge, MemberAvatar, TripCodeBadge,
  ProgressBar, BottomSheet, formatCurrency, formatDate
} from '../components/ui/index.jsx';
import ItineraryTab       from '../components/trip/ItineraryTab.jsx';
import ExpensesTab        from '../components/trip/ExpensesTab.jsx';
import BreaksTab          from '../components/trip/BreaksTab.jsx';
import MapTab             from '../components/trip/MapTab.jsx';
import AIAssistant        from '../components/ai/AIAssistant.jsx';
import MembersPanel       from '../components/trip/MembersPanel.jsx';
import AnnouncementBanner from '../components/trip/AnnouncementBanner.jsx';
import TripSidebar        from '../components/trip/TripSidebar.jsx';
import TripReport         from '../components/trip/TripReport.jsx';
import QuickExpense       from '../components/trip/QuickExpense.jsx';

export default function TripDashboard() {
  const { code } = useParams();
  const navigate  = useNavigate();
  const {
    session, setSession, trip, members, days, progress, expenses, breaks,
    setTripData, setExpenses, setBreaks,
    activeDay, setActiveDay, getProgressPercent
  } = useTripStore();

  const [activeTab, setActiveTab]   = useState('itinerary');
  const [loading, setLoading]       = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showShare, setShowShare]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleting, setDeleting]     = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [lang, setLang]             = useState(() => localStorage.getItem('np_lang')||'en');
  const loadedRef = useRef(false);
  const isOffline = useOffline();

  const T = {
    plan:      lang==='ta'?'திட்டம்':'Plan',
    expenses:  lang==='ta'?'செலவுகள்':'Expenses',
    breaks:    lang==='ta'?'இடைவேளை':'Breaks',
    map:       lang==='ta'?'வரைபடம்':'Map',
    ai:        lang==='ta'?'AI':'AI',
    report:    lang==='ta'?'அறிக்கை':'Report',
  };

  useEffect(()=>{ localStorage.setItem('np_lang', lang); }, [lang]);

  // ── Load ──────────────────────────────────────────────────
  const loadTrip = useCallback(async () => {
    try {
      const res = await tripAPI.getByCode(code);
      if (res.trip.status==='deleted') { toast.error('This trip has been deleted'); navigate('/'); return; }
      setTripData({ trip:res.trip, members:res.members, days:res.days, progress:res.progress });

      const sid = getSessionId();
      if (!session || session.tripCode!==code) {
        const myRes = await tripAPI.getMyTrips(sid);
        const found = myRes.trips?.find(t=>t.trip_code===code);
        if (found) {
          setSession({ memberId:found.member_id, memberRowId:null, nickname:found.my_nickname,
            tripId:found.id, tripCode:code, isOrganizer:found.is_organizer });
        } else { setLoading(false); return; }
      }

      const [expRes, brkRes, annRes] = await Promise.all([
        expenseAPI.getAll(res.trip.id),
        breakAPI.getAll(res.trip.id),
        tripAPI.getAnnouncements(res.trip.id),
      ]);
      setExpenses(expRes.expenses||[]);
      setBreaks(brkRes.breaks||[]);
      setAnnouncements(annRes.announcements||[]);

      // Flush offline queue on reconnect
      const q = getQueue();
      if (q.length && !isOffline) {
        const n = await flushQueue(expenseAPI.add);
        if (n>0) toast.success(`📤 ${n} offline expense${n>1?'s':''} synced!`);
      }
    } catch (err) {
      if (err.message?.includes('not found')) { toast.error('Trip not found'); navigate('/'); }
    } finally { setLoading(false); }
  }, [code]);

  useEffect(()=>{ if(!loadedRef.current){ loadedRef.current=true; loadTrip(); } },[loadTrip]);

  // Reconnect flush
  useEffect(()=>{
    if(!isOffline && trip?.id) loadTrip();
  }, [isOffline]);

  // ── Realtime ──────────────────────────────────────────────
  useEffect(()=>{
    if(!trip?.id) return;
    const ch = supabase.channel(`trip-${trip.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'trip_members',     filter:`trip_id=eq.${trip.id}`},()=>loadTrip())
      .on('postgres_changes',{event:'*',schema:'public',table:'trip_progress',    filter:`trip_id=eq.${trip.id}`},()=>loadTrip())
      .on('postgres_changes',{event:'*',schema:'public',table:'trip_days',        filter:`trip_id=eq.${trip.id}`},()=>loadTrip())
      .on('postgres_changes',{event:'*',schema:'public',table:'trip_announcements',filter:`trip_id=eq.${trip.id}`},()=>loadTrip())
      .on('postgres_changes',{event:'*',schema:'public',table:'expenses',         filter:`trip_id=eq.${trip.id}`},async()=>{
        const r=await expenseAPI.getAll(trip.id); setExpenses(r.expenses||[]);
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'trip_breaks',      filter:`trip_id=eq.${trip.id}`},async()=>{
        const r=await breakAPI.getAll(trip.id); setBreaks(r.breaks||[]);
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'trips',filter:`id=eq.${trip.id}`},(p)=>{
        if(p.new?.status==='deleted'){ toast.error('🗑️ Trip deleted by organiser'); navigate('/'); }
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[trip?.id]);

  // ── Delete ────────────────────────────────────────────────
  async function handleDelete() {
    if(deleteStep===0){ setDeleteStep(1); return; }
    setDeleting(true);
    try {
      await tripAPI.delete(trip.id, session?.memberId);
      toast.success(lang==='ta'?'பயணம் நீக்கப்பட்டது':'Trip deleted');
      navigate('/');
    } catch(err){ toast.error(err.message); setDeleting(false); }
  }

  // ── Status ────────────────────────────────────────────────
  async function handleStatus(status) {
    try {
      await tripAPI.updateStatus(trip.id, status, session?.memberId);
      await loadTrip();
      toast.success(status==='active'?'🚀 Trip started!':'✅ Trip completed!');
    } catch(err){ toast.error(err.message); }
  }

  function copyCode(){ navigator.clipboard.writeText(code); toast.success('Code copied!'); }
  function copyLink(){ navigator.clipboard.writeText(`${window.location.origin}/join/${code}`); toast.success('Link copied!'); }

  // ── Guest view ────────────────────────────────────────────
  if(!loading && (!session||session.tripCode!==code)){
    return <GuestJoinView code={code} trip={trip} members={members}
      setSession={setSession} navigate={navigate} onJoined={loadTrip}/>;
  }

  if(loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-3xl">🗺️</span>
        </div>
        <Spinner size="lg" color="indigo"/>
        <p className="text-sm text-slate-500 font-semibold">
          {lang==='ta'?'பயணம் ஏற்றுகிறது...':'Loading your trip...'}
        </p>
      </div>
    </div>
  );

  const pct = getProgressPercent();
  const totalSpent = expenses.reduce((s,e)=>s+parseFloat(e.amount),0);
  const spotsLeft = (trip?.group_size||0)-members.length;
  const isOrg = session?.isOrganizer;
  // Overspend check
  const budgetTotal = trip?.ai_plan?.estimatedCost?.total;
  const overspend = budgetTotal && totalSpent > budgetTotal * 1.2;
  window.__npTotalSpent = totalSpent;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Offline banner ─────────────────────────────────── */}
      {isOffline && (
        <div className="offline-bar">
          📴 {lang==='ta'?'இணைப்பில்லை — செலவுகள் உள்ளூரில் சேமிக்கப்படும்':'Offline — expenses will sync when you reconnect'}
        </div>
      )}

      {/* ── Overspend banner ───────────────────────────────── */}
      {overspend && (
        <div className="bg-amber-500 text-white text-xs font-bold text-center py-1.5 px-3">
          ⚠️ {lang==='ta'?`நீங்கள் திட்டமிட்ட பட்ஜெட்டை ${Math.round((totalSpent/budgetTotal-1)*100)}% தாண்டிவிட்டீர்கள்!`:
          `You're ${Math.round((totalSpent/budgetTotal-1)*100)}% over your planned budget!`}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className={`bg-white border-b border-slate-100 ${isOffline||overspend?'':'pt-safe'} sticky top-0 z-20 shadow-sm`}>
        <div className="flex items-center gap-2 px-3 py-2.5">

          {/* Hamburger → sidebar */}
          <button onClick={()=>setShowSidebar(true)} className="btn-icon bg-slate-100">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-slate-900 text-base truncate">{trip?.title}</h1>
              <StatusBadge status={trip?.status}/>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{members.length}/{trip?.group_size}</span>
              {isOrg && <span className="badge badge-gold text-[10px]">★ {lang==='ta'?'ஒருங்கிணைப்பாளர்':'Organiser'}</span>}
              {isOffline && <span className="badge badge-red text-[10px]">📴 {lang==='ta'?'இணைப்பில்லை':'Offline'}</span>}
            </div>
          </div>

          <button onClick={()=>setShowMembers(true)} className="btn-icon bg-slate-100 relative">
            <span className="text-lg">👥</span>
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">{members.length}</span>
          </button>
          <button onClick={()=>setShowShare(true)} className="btn-icon bg-saffron-500">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
          </button>
        </div>

        {trip?.status==='active' && <div className="px-4 pb-2.5"><ProgressBar percent={pct}/></div>}

        {/* Stats strip */}
        <div className="flex border-t border-slate-100">
          {[
            {icon:'📍',label:lang==='ta'?'வழி':'Route',  value:`${trip?.start_location?.split(',')[0]} → ${trip?.end_location?.split(',')[0]}`},
            {icon:'📅',label:lang==='ta'?'தேதி':'Date',  value:formatDate(trip?.start_date)},
            {icon:'💰',label:lang==='ta'?'செலவு':'Spent',value:formatCurrency(totalSpent)},
          ].map((s,i)=>(
            <div key={i} className={`flex-1 px-2.5 py-2 ${i<2?'border-r border-slate-100':''}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase">{s.icon} {s.label}</div>
              <div className={`text-[11px] font-black truncate mt-0.5 ${i===2&&overspend?'text-amber-600':'text-slate-700'}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tab bar — simple icons only (sidebar has labels) */}
        <div className="tab-bar">
          {[
            {id:'itinerary',icon:'📅',label:T.plan},
            {id:'expenses', icon:'💸',label:T.expenses},
            {id:'breaks',   icon:'☕',label:T.breaks},
            {id:'map',      icon:'🗺️',label:T.map},
            {id:'ai',       icon:'🤖',label:T.ai},
            {id:'report',   icon:'📊',label:T.report},
          ].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className={`tab-item ${activeTab===tab.id?'tab-active':'tab-inactive'}`}>
              <span className="text-base">{tab.icon}</span>
              <span className="text-[9px]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Announcement */}
      {announcements.length>0 && <AnnouncementBanner announcement={announcements[0]}/>}

      {/* ── Tab content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab==='itinerary' && (
          <ItineraryTab trip={trip} days={days} members={members} progress={progress}
            session={session} activeDay={activeDay} setActiveDay={setActiveDay}
            onStatusChange={handleStatus} onRefresh={loadTrip}
            onDeleteTrip={()=>setShowDelete(true)} lang={lang}
          />
        )}
        {activeTab==='expenses' && (
          <div className="space-y-4 p-4">
            {/* Quick add always visible on Expenses tab */}
            <QuickExpense trip={trip} members={members} session={session} lang={lang} onAdded={loadTrip}/>
            <ExpensesTab trip={trip} members={members} expenses={expenses} session={session} lang={lang}/>
          </div>
        )}
        {activeTab==='breaks' && (
          <BreaksTab trip={trip} breaks={breaks} expenses={expenses} members={members} session={session} lang={lang}/>
        )}
        {activeTab==='map' && (
          <MapTab trip={trip} days={days} progress={progress} session={session} lang={lang}
            onProgressUpdate={async(data)=>{ await tripAPI.updateProgress(trip.id, data); }}/>
        )}
        {activeTab==='ai' && <AIAssistant trip={trip} session={session} lang={lang}/>}
        {activeTab==='report' && (
          <div className="pb-16">
            <TripReport tripId={trip?.id} trip={trip}/>
          </div>
        )}
      </div>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <TripSidebar
        isOpen={showSidebar} onClose={()=>setShowSidebar(false)}
        activeTab={activeTab} setActiveTab={setActiveTab}
        trip={trip} members={members} session={session} expenses={expenses}
        onShare={()=>setShowShare(true)}
        onDelete={()=>setShowDelete(true)}
        lang={lang} setLang={setLang}
      />

      {/* ── Share sheet ──────────────────────────────────── */}
      <BottomSheet isOpen={showShare} onClose={()=>setShowShare(false)}
        title={lang==='ta'?'பயணம் பகிர்':'Share Trip'}>
        <div className="space-y-4 pb-4">
          <p className="text-sm text-slate-500">
            {lang==='ta'?'உங்கள் பயண குழுவிடம் பகிரவும்':'Share with your travel group'}
          </p>
          <div><label className="label">{lang==='ta'?'பயண குறியீடு':'Trip Code'}</label><TripCodeBadge code={code} onCopy={copyCode}/></div>
          <button onClick={copyLink}
            className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-4 text-sm font-bold text-indigo-700 active:bg-indigo-100 flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <div className="text-left">
              <div>{lang==='ta'?'அழைப்பு இணைப்பு நகலெடு':'Copy Invite Link'}</div>
              <div className="text-xs font-normal text-indigo-400 mt-0.5">nam-payanam.vercel.app/join/{code}</div>
            </div>
          </button>
          <div className={`p-3 rounded-xl border text-center text-sm font-bold ${spotsLeft>0?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
            {members.length}/{trip?.group_size} {lang==='ta'?'உறுப்பினர்கள்':'members'}
            {spotsLeft>0?` · ${spotsLeft} ${lang==='ta'?'இடங்கள் உள்ளன':'open slots`':` · ${lang==='ta'?'குழு நிரம்பியது':'Group Full'}`}
          </div>
        </div>
      </BottomSheet>

      {/* ── Delete confirmation ────────────────────────── */}
      <BottomSheet isOpen={showDelete}
        onClose={()=>{setShowDelete(false);setDeleteStep(0);}}
        title={lang==='ta'?'பயணத்தை நீக்கு':'Delete Trip'}>
        <div className="space-y-4 pb-4">
          {deleteStep===0 ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                <div className="text-5xl mb-3">⚠️</div>
                <h3 className="font-display font-bold text-red-700 text-lg">
                  {lang==='ta'?`"${trip?.title}" நீக்கவா?`:`Delete "${trip?.title}"?`}
                </h3>
                <p className="text-sm text-red-600 mt-2">
                  {lang==='ta'
                    ?'அனைத்து உறுப்பினர்கள், செலவுகள், இடைவேளைகள் மற்றும் திட்டமிடல் தரவும் நிரந்தரமாக நீக்கப்படும்.'
                    :'This will permanently delete all members, expenses, breaks and itinerary data.'}
                </p>
              </div>
              <button onClick={handleDelete} className="btn-danger w-full py-4 text-base">
                {lang==='ta'?'ஆம், நீக்க விரும்புகிறேன்':'Yes, I want to delete this trip'}
              </button>
              <button onClick={()=>setShowDelete(false)} className="btn-ghost w-full">
                {lang==='ta'?'ரத்து செய்':'Cancel'}
              </button>
            </>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                <div className="text-5xl mb-3">🗑️</div>
                <h3 className="font-display font-bold text-red-700">
                  {lang==='ta'?'இறுதி உறுதிப்படுத்தல்':'Final Confirmation'}
                </h3>
                <p className="text-sm text-red-600 mt-2">
                  {lang==='ta'
                    ?`${members.length} உறுப்பினர்களுக்கு அறிவிக்கப்படும். ${expenses.length} செலவுகளும் அனைத்து தரவும் என்றும் அழிக்கப்படும்.`
                    :`All ${members.length} members will be notified. ${expenses.length} expenses and all trip data will be erased forever.`}
                </p>
              </div>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger w-full py-4 text-base">
                {deleting?<Spinner size="sm" color="white"/>:'🗑️'}
                {deleting?(lang==='ta'?'நீக்குகிறது...':'Deleting...'):(lang==='ta'?'நிரந்தரமாக நீக்கு':'PERMANENTLY DELETE')}
              </button>
              <button onClick={()=>{setShowDelete(false);setDeleteStep(0);}} className="btn-ghost w-full">
                {lang==='ta'?'ரத்து செய்':'Cancel'}
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* Members panel */}
      <MembersPanel isOpen={showMembers} onClose={()=>setShowMembers(false)}
        trip={trip} members={members} session={session} onRefresh={loadTrip}/>
    </div>
  );
}

// ── Guest Join View ───────────────────────────────────────────
function GuestJoinView({ code, trip, members, setSession, navigate, onJoined }) {
  const [nickname, setNickname] = useState('');
  const [joining, setJoining]   = useState(false);
  const isFull = (members?.length||0) >= (trip?.group_size||0);

  async function join() {
    if(!nickname.trim()) return toast.error('Enter your name');
    setJoining(true);
    try {
      const sid = getSessionId();
      const res = await tripAPI.join(code, nickname.trim(), sid);
      setSession({ memberId:res.memberUUID||res.memberId, memberRowId:res.memberId,
        nickname:nickname.trim(), tripId:res.tripId, tripCode:code, isOrganizer:false });
      toast.success('Joined! 🎉');
      onJoined();
    } catch(err){ toast.error(err.message); }
    finally { setJoining(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-900 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🤝</span>
          </div>
          <h1 className="font-display font-black text-slate-900 text-xl">{trip?.title||'Join Trip'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {trip?.start_location?.split(',')[0]} → {trip?.end_location?.split(',')[0]}
          </p>
          <div className="flex justify-center gap-2 mt-3">
            <span className="badge badge-indigo">{members?.length||0}/{trip?.group_size} members</span>
            {isFull && <span className="badge badge-red">Group Full</span>}
          </div>
        </div>
        {isFull ? (
          <div className="space-y-3">
            <div className="bg-red-50 rounded-xl p-4 text-center text-sm text-red-700 font-bold">This group is full ({trip?.group_size} max)</div>
            <button onClick={()=>navigate('/')} className="btn-ghost w-full">Go Back</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Your Nickname</label>
              <input className="input" placeholder="What should we call you?"
                value={nickname} onChange={e=>setNickname(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&join()} maxLength={30}/>
              <p className="text-xs text-slate-400 mt-1.5">No account needed!</p>
            </div>
            <button onClick={join} disabled={joining} className="btn-indigo w-full py-4 text-base">
              {joining?<Spinner size="sm" color="white"/>:'🚀'}
              {joining?'Joining...':'Join the Adventure!'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
