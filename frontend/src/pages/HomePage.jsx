import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../store/tripStore';
import { tripAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { Spinner } from '../components/ui/index.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const { setSession } = useTripStore();
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return toast.error('Enter trip code and your name');
    setJoining(true);
    try {
      const res = await tripAPI.join(joinCode.trim().toUpperCase(), joinName.trim());
      setSession({
        memberId: res.member.member_id,
        memberRowId: res.memberId,
        nickname: joinName.trim(),
        tripId: res.tripId,
        tripCode: joinCode.trim().toUpperCase(),
        isOrganizer: false,
      });
      navigate(`/trip/${joinCode.trim().toUpperCase()}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-saffron-500 via-saffron-400 to-orange-500 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">
        {/* Logo */}
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 shadow-lg border border-white/30">
          <span className="text-4xl">🗺️</span>
        </div>

        <h1 className="font-display font-extrabold text-white text-4xl leading-tight mb-2">
          Nam Payanam
        </h1>
        <p className="font-tamil text-white/80 text-lg mb-1">நம் பயணம்</p>
        <p className="text-white/70 text-sm font-body max-w-xs leading-relaxed mb-10">
          A comprehensive trip planning friend.<br />
          <span className="font-tamil text-white/60 text-xs">ஒரு மேம்படுத்தப்பட்ட பயண நண்பன்</span>
        </p>

        {/* Main Actions */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => navigate('/create')}
            className="w-full bg-white text-saffron-600 font-display font-bold py-4 rounded-2xl 
                       shadow-lg active:scale-95 transition-all duration-150 flex items-center justify-center gap-3"
          >
            <span className="text-xl">✈️</span>
            <div className="text-left">
              <div className="text-base">Plan a New Trip</div>
              <div className="text-xs text-saffron-400 font-body font-normal">I'm the organizer</div>
            </div>
          </button>

          <button
            onClick={() => setShowJoin(!showJoin)}
            className="w-full bg-white/20 backdrop-blur-sm border border-white/40 text-white 
                       font-display font-bold py-4 rounded-2xl active:scale-95 transition-all duration-150
                       flex items-center justify-center gap-3"
          >
            <span className="text-xl">🤝</span>
            <div className="text-left">
              <div className="text-base">Join a Trip</div>
              <div className="text-xs text-white/60 font-body font-normal">I have a trip code</div>
            </div>
          </button>
        </div>

        {/* Join form */}
        {showJoin && (
          <div className="w-full max-w-sm mt-4 bg-white rounded-2xl p-5 shadow-xl animate-slide-down">
            <h3 className="font-display font-bold text-slate-800 text-base mb-4">Join a Trip Group</h3>
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="label">Trip Code</label>
                <input
                  className="input uppercase tracking-widest font-bold text-center text-lg"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
              <div>
                <label className="label">Your Name / Nickname</label>
                <input
                  className="input"
                  placeholder="What should we call you?"
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  maxLength={30}
                />
                <p className="text-xs text-slate-400 mt-1">No personal info required — just a name!</p>
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={joining}>
                {joining ? <Spinner size="sm" color="white" /> : '🚀'}
                {joining ? 'Joining...' : 'Join Trip'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Features strip */}
      <div className="bg-white/10 backdrop-blur-sm border-t border-white/20 px-6 py-5">
        <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
          {[
            { icon: '🤖', label: 'AI Plans' },
            { icon: '🗺️', label: 'Live Map' },
            { icon: '💸', label: 'Split Bills' },
            { icon: '📊', label: 'Reports' },
          ].map(f => (
            <div key={f.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{f.icon}</span>
              <span className="text-white/80 text-[10px] font-semibold">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
