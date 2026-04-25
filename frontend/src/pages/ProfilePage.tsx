import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Moon, Sun, LogOut, User, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../config/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0|1>(0);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('np_dark', next ? '1' : '0');
  };

  async function handleDeleteAccount() {
    if (deleteStep === 0) { setDeleteStep(1); return; }
    if (confirmText.toLowerCase() !== 'delete my account') {
      toast.error('Type the confirmation text exactly');
      return;
    }
    setDeleting(true);
    try {
      await api.delete('/auth/account');
      await signOut();
      toast.success('Account deleted');
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete account');
      setDeleting(false);
    }
  }

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

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-4 pb-12">
        {/* User card */}
        <div className="card p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center">
            <User size={32} className="text-brand"/>
          </div>
          <div>
            <p className="font-display font-bold text-[var(--text)] text-lg">{user?.user_metadata?.full_name || 'Traveller'}</p>
            <p className="text-[var(--muted)] text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Settings */}
        <div className="card divide-y divide-[var(--border)]">
          {/* Dark mode */}
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

          {/* Sign out */}
          <button onClick={signOut} className="p-4 flex items-center gap-3 w-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
            <LogOut size={18}/><span className="font-semibold text-sm">Sign Out</span>
          </button>

          {/* Delete account */}
          <button onClick={() => setShowDeleteConfirm(true)} className="p-4 flex items-center gap-3 w-full text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
            <Trash2 size={18}/><span className="font-semibold text-sm">Delete Account</span>
          </button>
        </div>

        <p className="text-center font-tamil text-[var(--muted)] text-xs pt-2">உங்கள் பயண தோழன் — Nam Payanam v2</p>
      </main>

      {/* Delete account sheet */}
      {showDeleteConfirm && (
        <>
          <div className="sheet-overlay" onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); setConfirmText(''); }}/>
          <div className="sheet">
            <div className="sheet-handle"/>
            <div className="px-5 pb-6 space-y-4">
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-center">
                <AlertTriangle size={40} className="text-rose-500 mx-auto mb-3"/>
                <h3 className="font-display font-bold text-rose-700 dark:text-rose-400 text-lg">
                  {deleteStep === 0 ? 'Delete Your Account?' : 'Final Confirmation'}
                </h3>
                <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">
                  {deleteStep === 0
                    ? 'This will permanently delete your account, all your trips, expenses, and data. This cannot be undone.'
                    : 'Type "delete my account" below to confirm.'}
                </p>
              </div>

              {deleteStep === 1 && (
                <div>
                  <label className="label">Type to confirm</label>
                  <input className="input" placeholder='delete my account' value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}/>
                </div>
              )}

              <button onClick={handleDeleteAccount} disabled={deleting || (deleteStep===1&&confirmText.toLowerCase()!=='delete my account')}
                className="w-full bg-rose-500 disabled:opacity-40 text-white font-display font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                {deleting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Deleting…</> : 
                 <><Trash2 size={16}/>{deleteStep===0?'Yes, Delete My Account':'CONFIRM DELETE'}</>}
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteStep(0); setConfirmText(''); }}
                className="w-full btn-secondary py-3">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
