import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI, expenseAPI } from '../utils/api';
import supabase from '../utils/supabase';
import toast from 'react-hot-toast';
import { Spinner, PageHeader, TripCodeBadge, ProgressBar, StatusBadge, MemberAvatar, formatCurrency, formatDate, BottomSheet } from '../components/ui/index.jsx';
import ItineraryTab from '../components/trip/ItineraryTab.jsx';
import ExpensesTab from '../components/trip/ExpensesTab.jsx';
import MapTab from '../components/trip/MapTab.jsx';
import AIAssistant from '../components/ai/AIAssistant.jsx';
import MembersPanel from '../components/trip/MembersPanel.jsx';

const TABS = [
  { id: 'itinerary', icon: '📅', label: 'Plan' },
  { id: 'expenses', icon: '💸', label: 'Expenses' },
  { id: 'map', icon: '🗺️', label: 'Map' },
  { id: 'ai', icon: '🤖', label: 'AI Help' },
];

export default function TripDashboard() {
  const { code } = useParams();
  const navigate = useNavigate();
  const {
    session, setSession, trip, members, days, progress, expenses,
    setTripData, setExpenses, setProgress,
    activeDay, setActiveDay, getProgressPercent
  } = useTripStore();

  const [activeTab, setActiveTab] = useState('itinerary');
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Load trip data
  const loadTrip = useCallback(async () => {
    try {
      const res = await tripAPI.getByCode(code);
      setTripData({ trip: res.trip, members: res.members, days: res.days, progress: res.progress });

      // If no session, prompt to join
      if (!session || session.tripCode !== code) {
        setLoading(false);
        return;
      }

      // Load expenses
      const expRes = await expenseAPI.getAll(res.trip.id);
      setExpenses(expRes.expenses || []);
    } catch (err) {
      toast.error('Trip not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  // Realtime subscriptions
  useEffect(() => {
    if (!trip?.id) return;

    const channel = supabase.channel(`trip-${trip.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${trip.id}` },
        () => loadTrip())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${trip.id}` },
        async () => {
          const expRes = await expenseAPI.getAll(trip.id);
          setExpenses(expRes.expenses || []);
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_progress', filter: `trip_id=eq.${trip.id}` },
        () => loadTrip())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [trip?.id]);

  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success('Trip code copied!');
  }

  function copyShareLink() {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Share link copied!');
  }

  async function handleStatusChange(newStatus) {
    try {
      await tripAPI.updateStatus(trip.id, newStatus, session?.memberId);
      await loadTrip();
      toast.success(`Trip ${newStatus === 'active' ? 'started! 🚀' : 'completed! 🎉'}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Guest view (not joined)
  if (!loading && (!session || session.tripCode !== code)) {
    return <GuestJoinView code={code} trip={trip} members={members} onJoined={loadTrip} setSession={setSession} navigate={navigate} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">Loading your trip...</p>
        </div>
      </div>
    );
  }

  const progressPct = getProgressPercent();
  const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 pt-safe sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 mx-3">
            <h1 className="font-display font-bold text-slate-900 text-base leading-tight truncate">{trip?.title}</h1>
            <div className="flex items-center gap-2">
              <StatusBadge status={trip?.status} />
              <span className="text-xs text-slate-400">{members.length}/{trip?.group_size} members</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowMembers(true)} className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100">
              <span className="text-base">👥</span>
              {members.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-saffron-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {members.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowShareSheet(true)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-saffron-500">
              <span className="text-base">🔗</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {trip?.status === 'active' && (
          <div className="px-4 pb-3">
            <ProgressBar percent={progressPct} />
          </div>
        )}

        {/* Stats strip */}
        <div className="flex border-t border-slate-100">
          {[
            { label: 'Route', value: `${trip?.start_location} → ${trip?.end_location}`, icon: '📍' },
            { label: 'Dates', value: `${formatDate(trip?.start_date)}`, icon: '📅' },
            { label: 'Spent', value: formatCurrency(totalSpent), icon: '💰' },
          ].map((stat, i) => (
            <div key={i} className={`flex-1 px-3 py-2 ${i < 2 ? 'border-r border-slate-100' : ''}`}>
              <div className="text-[10px] text-slate-400 font-semibold">{stat.icon} {stat.label}</div>
              <div className="text-xs font-bold text-slate-700 truncate mt-0.5">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-t border-slate-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors text-xs font-semibold
                ${activeTab === tab.id ? 'text-saffron-600 border-b-2 border-saffron-500' : 'text-slate-400'}`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'itinerary' && (
          <ItineraryTab
            trip={trip} days={days} members={members} progress={progress}
            session={session} activeDay={activeDay} setActiveDay={setActiveDay}
            onStatusChange={handleStatusChange} onRefresh={loadTrip}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab trip={trip} members={members} expenses={expenses} session={session} />
        )}
        {activeTab === 'map' && (
          <MapTab trip={trip} days={days} progress={progress} />
        )}
        {activeTab === 'ai' && (
          <AIAssistant trip={trip} session={session} />
        )}
      </div>

      {/* Members bottom sheet */}
      <MembersPanel
        isOpen={showMembers}
        onClose={() => setShowMembers(false)}
        trip={trip} members={members}
        session={session}
        onRefresh={loadTrip}
      />

      {/* Share bottom sheet */}
      <BottomSheet isOpen={showShareSheet} onClose={() => setShowShareSheet(false)} title="Share Trip">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Share this code or link with your travel buddies</p>
          <div>
            <label className="label">Trip Code</label>
            <TripCodeBadge code={code} onCopy={copyCode} />
          </div>
          <div>
            <label className="label">Share Link</label>
            <button onClick={copyShareLink}
              className="w-full bg-ocean-50 border border-ocean-200 rounded-xl px-4 py-3 text-sm text-ocean-700 font-semibold active:bg-ocean-100 transition-colors text-left">
              📋 Copy invite link → nam-payanam.vercel.app/join/{code}
            </button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-semibold">
              {members.length}/{trip?.group_size} spots filled
              {members.length >= trip?.group_size ? ' · Group is full!' : ` · ${trip?.group_size - members.length} spots left`}
            </p>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ── Guest Join View ──────────────────────────────────────────────────────────
function GuestJoinView({ code, trip, members, onJoined, setSession, navigate }) {
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    if (!nickname.trim()) return toast.error('Enter your name');
    setJoining(true);
    try {
      const res = await tripAPI.join(code, nickname.trim());
      setSession({
        memberId: res.member.member_id,
        memberRowId: res.memberId,
        nickname: nickname.trim(),
        tripId: res.tripId,
        tripCode: code,
        isOrganizer: false,
      });
      toast.success('Joined! Welcome to the trip 🎉');
      onJoined();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoining(false);
    }
  }

  const isFull = members?.length >= trip?.group_size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-500 to-ocean-700 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-slide-up">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🤝</div>
          <h1 className="font-display font-bold text-slate-900 text-xl">{trip?.title || 'Join Trip'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {trip?.start_location} → {trip?.end_location}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="badge badge-ocean">{members?.length || 0}/{trip?.group_size} members</span>
            {isFull && <span className="badge badge-red">Group Full</span>}
          </div>
        </div>

        {isFull ? (
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-sm text-red-700 font-semibold">This group is full ({trip?.group_size} members)</p>
            <button onClick={() => navigate('/')} className="btn-secondary mt-3 w-full">Back to Home</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Your Name / Nickname</label>
              <input className="input" placeholder="What should we call you?" value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={30} />
              <p className="text-xs text-slate-400 mt-1">No personal info needed — just a name!</p>
            </div>
            <button onClick={handleJoin} className="btn-primary w-full flex items-center justify-center gap-2 py-4" disabled={joining}>
              {joining ? <Spinner size="sm" color="white" /> : '🚀'}
              {joining ? 'Joining...' : 'Join this Trip!'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
