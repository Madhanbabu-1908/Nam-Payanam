import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { ArrowLeft, Moon, Sun, LogOut, User, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark]           = useState(() => document.documentElement.classList.contains('dark'));
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting]   = useState(false);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('np_dark', next ? '1' : '0');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return toast.error('Type DELETE to confirm');
    setDeleting(true);
    try {
      await api.delete('/auth/account');
      await signOut();
      toast.success('Account deleted. Goodbye!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete account');
    } finally { setDeleting(false); }
  };

  const name  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Traveller';
  const email = user?.email || '';

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

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4 pb-16">
        {/* Avatar card */}
        <div className="card p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-brand/15 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User size={32} className="text-brand"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[var(--text)] text-xl truncate">{name}</p>
            <p className="text-[var(--muted)] text-sm truncate">{email}</p>
          </div>
        </div>

        {/* Settings */}
        <div className="card divide-y divide-[var(--border)]">
          {/* Dark mode */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              {dark
                ? <Moon size={18} className="text-indigo-400"/>
                : <Sun size={18} className="text-amber-500"/>}
              <div>
                <p className="font-semibold text-[var(--text)] text-sm">Dark Mode</p>
                <p className="text-[var(--muted)] text-xs">{dark ? 'Currently on' : 'Currently off'}</p>
              </div>
            </div>
            <button onClick={toggleDark}
              className={`w-12 h-6 rounded-full relative transition-all duration-200 ${dark ? 'bg-brand' : 'bg-[var(--border)]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${dark ? 'left-6' : 'left-0.5'}`}/>
            </button>
          </div>

          {/* Sign out */}
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-4 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
            <LogOut size={18}/>
            <span className="font-semibold text-sm">Sign Out</span>
          </button>

          {/* Delete account */}
          <button onClick={() => setShowDelete(true)}
            className="w-full flex items-center gap-3 px-4 py-4 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
            <Trash2 size={18}/>
            <div className="text-left">
              <p className="font-semibold text-sm">Delete Account</p>
              <p className="text-xs text-rose-400">Permanently remove all your data</p>
            </div>
          </button>
        </div>

        <p className="text-center font-tamil text-[var(--muted)] text-xs pt-2">
          உங்கள் பயண தோழன் — Nam Payanam v2
        </p>
      </main>

      {/* Delete confirmation sheet */}
      {showDelete && (
        <>
          <div className="sheet-overlay" onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}/>
          <div className="sheet">
            <div className="sheet-handle"/>
            <div className="px-5 py-4 space-y-4 pb-safe">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={24} className="text-rose-600"/>
                </div>
                <div>
                  <h2 className="font-display font-bold text-[var(--text)] text-lg">Delete Account?</h2>
                  <p className="text-[var(--muted)] text-sm">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 space-y-1">
                <p>• All your trips will be deleted</p>
                <p>• All expenses you recorded will be deleted</p>
                <p>• You will be removed from all group trips</p>
                <p>• Your account cannot be recovered</p>
              </div>

              <div>
                <label className="label">Type <span className="font-mono font-black text-rose-600">DELETE</span> to confirm</label>
                <input className="input border-rose-300 focus:border-rose-500"
                  placeholder="DELETE"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value.toUpperCase())}/>
              </div>

              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'DELETE'}
                className="btn-danger w-full py-4 text-base disabled:opacity-40">
                {deleting
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Deleting…</>
                  : <><Trash2 size={16}/>Permanently Delete Account</>}
              </button>

              <button onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                className="btn-ghost w-full py-3 border border-[var(--border)]">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
