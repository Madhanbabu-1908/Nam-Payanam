import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, RefreshCw, CheckCircle, ArrowRight, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettlementsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/expenses/${tripId}/settlements`);
      setData(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tripId) load(); }, [tripId]);

  const handleSettle = async (tx: any) => {
    // Find the split for this transaction
    setSettling(tx.from + tx.to);
    try {
      // Get expense splits for current user
      const expRes = await api.get(`/expenses/${tripId}`);
      const unsettled = expRes.data.data?.flatMap((e: any) =>
        (e.expense_splits || []).filter((s: any) => s.user_id === user?.id && !s.is_settled)
      ) || [];

      if (unsettled.length === 0) {
        toast.success('All splits already settled!');
        setSettling(null);
        return;
      }

      // Settle all splits for this user
      await Promise.all(unsettled.map((s: any) =>
        api.patch(`/expenses/splits/${s.id}/settle`, { settled_amount: s.amount_owed })
      ));

      toast.success(`Payment of ₹${tx.amount} marked as settled!`);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to settle');
    } finally { setSettling(null); }
  };

  const myBal       = data?.balances?.[user?.id || ''] || 0;
  const isOwed      = myBal > 0.01;
  const owesOthers  = myBal < -0.01;
  const nameMap     = data?.nameMap || {};
  const getName     = (id: string) => id === user?.id ? 'You' : (nameMap[id] || id.substring(0, 8) + '…');

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Settlements</h1>
          <button onClick={load} disabled={loading} className="btn-icon bg-[var(--bg)] text-[var(--muted)]">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-10">
        {/* My balance cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`stat-card border-l-4 ${isOwed ? 'border-l-jade' : 'border-l-[var(--border)]'}`}>
            <p className="text-xs font-bold text-jade uppercase tracking-wider">You Are Owed</p>
            <p className="font-display font-black text-2xl text-[var(--text)] mt-0.5">
              ₹{isOwed ? Math.abs(myBal).toFixed(0) : '0'}
            </p>
            {isOwed && <p className="text-xs text-jade mt-0.5">Others owe you</p>}
          </div>
          <div className={`stat-card border-l-4 ${owesOthers ? 'border-l-rose-500' : 'border-l-[var(--border)]'}`}>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">You Owe</p>
            <p className="font-display font-black text-2xl text-[var(--text)] mt-0.5">
              ₹{owesOthers ? Math.abs(myBal).toFixed(0) : '0'}
            </p>
            {owesOthers && <p className="text-xs text-rose-500 mt-0.5">Tap to settle</p>}
          </div>
        </div>

        {/* All balances */}
        {data?.balances && Object.keys(data.balances).length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">All Balances</p>
            <div className="space-y-2.5">
              {Object.entries(data.balances).map(([uid, bal]: any) => (
                <div key={uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[var(--bg)] rounded-lg flex items-center justify-center text-xs font-black text-[var(--muted)]">
                      {getName(uid).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{getName(uid)}</span>
                  </div>
                  <span className={`font-display font-bold text-sm px-3 py-1 rounded-xl ${
                    bal > 0.01 ? 'bg-emerald-50 text-jade' :
                    bal < -0.01 ? 'bg-red-50 text-rose-600' : 'bg-[var(--bg)] text-[var(--muted)]'
                  }`}>
                    {bal > 0.01 ? '+' : ''}{parseFloat(bal).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div>
          <h3 className="font-display font-bold text-[var(--text)] mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand"/>Recommended Payments
          </h3>
          {loading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="skeleton h-20"/>)}</div>
          ) : !data?.transactions?.length ? (
            <div className="card p-10 text-center">
              <CheckCircle size={48} className="text-jade mx-auto mb-3"/>
              <p className="font-display font-bold text-[var(--text)] text-lg">All Settled! 🎉</p>
              <p className="text-[var(--muted)] text-sm mt-1">No outstanding balances.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.transactions.map((tx: any, i: number) => {
                const isMe = tx.from === user?.id;
                const isSettling = settling === tx.from + tx.to;
                return (
                  <div key={i} className="card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center font-black text-[var(--muted)] flex-shrink-0">
                        {getName(tx.from).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text)]">
                          <span className="font-bold">{getName(tx.from)}</span>
                          <span className="text-[var(--muted)] font-normal"> pays </span>
                          <span className="font-bold">{getName(tx.to)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ArrowRight size={14} className="text-[var(--muted)]"/>
                        <span className="font-display font-black text-jade text-xl">₹{tx.amount}</span>
                      </div>
                    </div>
                    {isMe && (
                      <button
                        onClick={() => handleSettle(tx)}
                        disabled={!!isSettling}
                        className="w-full btn-primary py-2.5 text-sm"
                      >
                        {isSettling
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Settling…</>
                          : <><CheckCircle size={15}/>Mark as Paid</>
                        }
                      </button>
                    )}
                    {!isMe && tx.to === user?.id && (
                      <div className="text-center text-xs text-[var(--muted)] bg-[var(--bg)] rounded-xl py-2">
                        Waiting for {getName(tx.from)} to pay
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
