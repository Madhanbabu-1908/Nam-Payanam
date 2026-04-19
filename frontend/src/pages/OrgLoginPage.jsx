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
  const [phone, setPhone]     = useState('');
  const [name, setName]       = useState('');
  const [pin, setPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!phone.trim() || !pin.trim()) return toast.error('Enter phone and PIN');
    if (mode === 'register') {
      if (!name.trim()) return toast.error('Enter your name');
      if (pin !== confirmPin) return toast.error('PINs do not match');
      if (!/^\d{4}$/.test(pin)) return toast.error('PIN must be 4 digits');
    }
    setLoading(true);
    try {
      const fn = mode === 'register' ? authAPI.register : authAPI.login;
      const res = await fn({ phone: phone.replace(/\D/g,''), name, pin });
      setOrgAccount({ id: res.account.id, name: res.account.name, phone: res.account.phone });
      toast.success(mode === 'register' ? `Welcome, ${res.account.name}! 🎉` : `Welcome back, ${res.account.name}! 👋`);
      navigate('/create');
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col items-center justify-center p-5 pt-safe">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/25">
          <span className="text-4xl">🗺️</span>
        </div>
        <h1 className="font-display font-black text-white text-3xl">Nam Payanam</h1>
        <p className="font-tamil text-white/70 text-sm mt-1">நம் பயணம் · Organiser Portal</p>
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
          {mode === 'register' && (
            <div>
              <label className="label">Your Full Name</label>
              <input className="input" placeholder="e.g. Arun Kumar" value={name} onChange={e=>setName(e.target.value)} maxLength={60}/>
            </div>
          )}

          <div>
            <label className="label">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+91</span>
              <input className="input pl-12" type="tel" inputMode="numeric" placeholder="98765 43210"
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} maxLength={10}/>
            </div>
          </div>

          <div>
            <label className="label">4-Digit PIN</label>
            <input className="input tracking-[0.5em] text-center font-black text-xl"
              type="password" inputMode="numeric" placeholder="••••"
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))} maxLength={4}/>
          </div>

          {mode === 'register' && (
            <div>
              <label className="label">Confirm PIN</label>
              <input className="input tracking-[0.5em] text-center font-black text-xl"
                type="password" inputMode="numeric" placeholder="••••"
                value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,4))} maxLength={4}/>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-indigo w-full py-4 text-base">
            {loading ? <Spinner size="sm" color="white"/> : null}
            {loading ? 'Please wait...' : mode === 'login' ? '🚀 Login & Plan' : '✨ Create Account'}
          </button>

          <p className="text-xs text-slate-400 text-center">
            {mode === 'login'
              ? "Don't have an account? Switch to Register above."
              : 'Your PIN lets you access your trips from any device.'}
          </p>
        </form>
      </div>

      <button onClick={() => navigate('/')} className="mt-6 text-white/60 text-sm font-semibold active:text-white">
        ← Back to Home
      </button>
    </div>
  );
}
