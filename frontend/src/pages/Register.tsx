import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, MapPin, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  
  // State for the Confirmation Popup
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) { 
      setError('Password must be at least 6 characters'); 
      return; 
    }
    
    setLoading(true); 
    setError(null);
    
    const { error } = await signUp(email, password);
    
    if (error) { 
      setError(error.message); 
      setLoading(false); 
    } else {
      // Success! Show the confirmation popup instead of navigating immediately
      setShowConfirmation(true);
      setLoading(false);
    }
  };

  const handleConfirmRedirect = () => {
    setShowConfirmation(false);
    navigate('/login'); // Or wherever you want them to go next
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-5 pt-safe relative overflow-hidden">
      
      {/* Background Decoration (Optional) */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand/5 to-transparent pointer-events-none" />

      <div className="text-center mb-8 z-10">
        <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-brand">
          <MapPin className="text-white" size={28}/>
        </div>
        <h1 className="font-display font-black text-[var(--text)] text-2xl">Nam Payanam</h1>
        <p className="font-tamil text-[var(--muted)] text-sm mt-1">நம் பயணம் · Your Journey</p>
      </div>

      <div className="card w-full max-w-sm p-6 animate-slide-up z-10 bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
        <h2 className="font-display font-bold text-[var(--text)] text-xl mb-6">Create account ✨</h2>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4 flex items-center gap-2"
          >
            <span className="block w-1.5 h-1.5 rounded-full bg-red-500"/>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"/>
              <input className="input pl-10" placeholder="Arun Kumar"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"/>
              <input type="email" className="input pl-10" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"/>
              <input type={show ? 'text' : 'password'} className="input pl-10 pr-10" placeholder="Min. 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-brand transition-colors">
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Creating…
              </>
            ) : (
              '✨ Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
        </p>
      </div>

      {/* --- CONFIRMATION POPUP MODAL --- */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-green-600" size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Email!</h3>
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                We've sent a confirmation link to <strong>{email}</strong>. Please check your inbox and confirm your email to log in.
              </p>
              
              <button
                onClick={handleConfirmRedirect}
                className="w-full bg-brand text-white font-semibold py-3 rounded-xl hover:bg-brand/90 transition-all active:scale-95 shadow-lg shadow-brand/20"
              >
                Got it, take me to Login
              </button>
              
              <p className="mt-4 text-xs text-gray-400">
                Didn't receive the email? Check your spam folder.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
