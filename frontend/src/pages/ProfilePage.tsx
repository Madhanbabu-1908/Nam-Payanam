import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Moon, Sun, LogOut, User } from 'lucide-react';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('np_dark', next ? '1' : '0');
  };

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Profile</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center">
            <User size={32} className="text-brand"/>
          </div>
          <div>
            <p className="font-display font-bold text-[var(--text)] text-lg">{user?.user_metadata?.full_name || 'Traveller'}</p>
            <p className="text-[var(--muted)] text-sm">{user?.email}</p>
          </div>
        </div>
        <div className="card divide-y divide-[var(--border)]">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dark ? <Moon size={18} className="text-indigo-400"/> : <Sun size={18} className="text-amber-500"/>}
              <span className="font-semibold text-[var(--text)] text-sm">Dark Mode</span>
            </div>
            <button onClick={toggleDark}
              className={`w-12 h-6 rounded-full transition-all duration-200 relative ${dark?'bg-brand':'bg-[var(--border)]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${dark?'left-6':'left-0.5'}`}/>
            </button>
          </div>
          <button onClick={signOut} className="p-4 flex items-center gap-3 w-full text-rose-500 hover:bg-rose-50 transition-colors">
            <LogOut size={18}/><span className="font-semibold text-sm">Sign Out</span>
          </button>
        </div>
        <p className="text-center font-tamil text-[var(--muted)] text-xs pt-2">உங்கள் பயண தோழன் — Nam Payanam v2</p>
      </main>
    </div>
  );
}
