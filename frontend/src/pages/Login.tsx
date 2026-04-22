import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, MapPin } from 'lucide-react';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await signIn(email, password);
    if (error) { setError(error.message); setLoading(false); }
    else navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-5 pt-safe">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-brand">
          <MapPin className="text-white" size={28} />
        </div>
        <h1 className="font-display font-black text-[var(--text)] text-2xl">Nam Payanam</h1>
        <p className="font-tamil text-[var(--muted)] text-sm mt-1">நம் பயணம் · Your Journey</p>
      </div>

      <div className="card w-full max-w-sm p-6 animate-slide-up">
        <h2 className="font-display font-bold text-[var(--text)] text-xl mb-6">Welcome back 👋</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4 animate-pop">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input type="email" className="input pl-10" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input type={show ? 'text' : 'password'} className="input pl-10 pr-10" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in…</>
            ) : '🚀 Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-4">
          No account?{' '}
          <Link to="/register" className="text-brand font-semibold hover:underline">Create one</Link>
        </p>
      </div>

      <p className="font-tamil text-[var(--muted)] text-xs mt-6">உங்கள் பயண தோழன்</p>
    </div>
  );
}
