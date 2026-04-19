import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Spinner } from '../components/ui/index.jsx';
import toast from 'react-hot-toast';

const ORG_KEY = 'np_org_account';

export function getOrgAccount() {
  try { return JSON.parse(localStorage.getItem(ORG_KEY)); } catch { return null; }
}

export function setOrgAccount(account) {
  localStorage.setItem(ORG_KEY, JSON.stringify(account));
}

export function clearOrgAccount() {
  localStorage.removeItem(ORG_KEY);
}

export default function OrgLoginPage() {
  const navigate = useNavigate();
  const [mode, setMode]       = useState('login');  // 'login' | 'register'
  const [userId, setUserId]   = useState('');
  const [pin, setPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!userId.trim() || !pin.trim()) 
      return toast.error('Enter User ID and PIN');

    if (mode === 'register') {
      if (pin !== confirmPin) 
        return toast.error('PINs do not match');
      if (!/^\d{4}$/.test(pin)) 
        return toast.error('PIN must be exactly 4 digits');
    }

    setLoading(true);
    try {
      const fn = mode === 'register' ? authAPI.register : authAPI.login;
      
      // Send userId + pin only
      const res = await fn({ 
        userId: userId.trim().toLowerCase(), // normalize to lowercase
        pin 
      });
      setOrgAccount({ 
        id: res.account.id, 
        userId: res.account.userId, 
        // Optional: store name if backend returns it
        name: res.account.name || userId.trim() 
      });

      toast.success(mode === 'register' 
        ? `Welcome, ${res.account.name || userId}! 🎉` 
        : `Welcome back, ${res.account.name || userId}! 👋`);

      navigate('/create');
    } catch (err) {
      toast.error(err.message);
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-saffron-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/25">
              <span className="text-3xl">🗺️</span>
            </div>
            <div>
              <h1 className="font-display font-black text-white text-2xl leading-none">Nam Payanam</h1>
              <p className="font-tamil text-white/70 text-sm mt-0.5">நம் பயணம் · Organiser Portal</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Tab toggle */}
          <div className="flex">
            {[['login','🔑 Login'],['register','✨ Register']].map(([m,label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-4 text-sm font-display font-bold transition-all ${mode===m ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* USER ID FIELD - REPLACES PHONE & NAME */}
            <div>
              <label className="label">User ID *</label>
              <input 
                className="input" 
                placeholder="e.g. arun_kumar or arun@email.com" 
                value={userId} 
                onChange={e => setUserId(e.target.value)} 
                autoFocus
              />
            </div>

            {/* PIN */}
            <div>
              <label className="label">4-Digit PIN *</label>
              <input 
                className="input tracking-[0.5em] text-center font-black text-xl"
                type="password" 
                inputMode="numeric" 
                placeholder="••••" 
                value={pin} 
                onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))} 
                maxLength={4}
              />
            </div>

            {/* CONFIRM PIN (REGISTER ONLY) */}
            {mode === 'register' && (
              <div>
                <label className="label">Confirm PIN *</label>
                <input 
                  className="input tracking-[0.5em] text-center font-black text-xl"
                  type="password" 
                  inputMode="numeric" 
                  placeholder="••••" 
                  value={confirmPin} 
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,4))} 
                  maxLength={4}
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-indigo w-full py-4 text-base">
              {loading ? <Spinner size="sm" color="white"/> : null}
              {loading ? 'Please wait...' : mode === 'login' ? '🚀 Login & Plan' : '✨ Create Account'}
            </button>

            <p className="text-xs text-slate-400 text-center">
              {mode === 'login'
                ? "Don't have an account? Switch to Register above."                : 'Your PIN lets you access your trips from any device.'}
            </p>
          </form>
        </div>

        <button onClick={() => navigate('/')} className="mt-6 text-white/60 text-sm font-semibold active:text-white">
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
