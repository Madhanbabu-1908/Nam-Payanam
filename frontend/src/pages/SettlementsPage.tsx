import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';

export default function SettlementsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTx]   = useState<any[]>([]);
  const [balances, setBal]       = useState<Record<string, number>>({});
  const [loading, setLoading]    = useState(true);
  const [settled, setSettled]    = useState<Set<number>>(new Set());
  const [members, setMembers]    = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [settleRes, memRes] = await Promise.all([
        api.get(`/expenses/${tripId}/settlements`),
        api.get(`/trips/${tripId}/members`).catch(() => ({ data: { data: [] } })),
      ]);
      setTx(settleRes.data.data?.transactions || []);
      setBal(settleRes.data.data?.balances || {});

      // Build name map from members
      const nameMap: Record<string, string> = {};
      (memRes.data.data || []).forEach((m: any) => {
        nameMap[m.user_id] = m.user_id === user?.id ? 'You' : m.user_id.substring(0, 8) + '…';
      });
      setMembers(nameMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (tripId) load(); }, [tripId]);

  const myBal    = user ? (balances[user.id] || 0) : 0;
  const isOwed   = myBal > 0.01;
  const owesOthers = myBal < -0.01;
  const name = (id: string) => members[id] || id.substring(0, 8) + '…';

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]" />
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Settlements</h1>
          <button onClick={load} className="btn-icon bg-[var(--bg)] text-[var(--muted)]">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* My balance */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`stat-card border-l-4 ${isOwed ? 'border-l-jade' : 'border-l-transparent'}`}>
            <p className="text-xs font-bold text-jade uppercase tracking-wider">You Are Owed</p>
            <p className="font-display font-black text-2xl text-[var(--text)] mt-0.5">
              ₹{isOwed ? myBal.toFixed(0) : '0'}
            </p>
          </div>
          <div className={`stat-card border-l-4 ${owesOthers ? 'border-l-rose-500' : 'border-l-transparent'}`}>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">You Owe</p>
            <p className="font-display font-black text-2xl text-[var(--text)] mt-0.5">
              ₹{owesOthers ? Math.abs(myBal).toFixed(0) : '0'}
            </p>
          </div>
        </div>

        {/* All balances */}
        {Object.keys(balances).length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--muted)] uppercase mb-3">All Balances</p>
            <div className="space-y-2">
              {Object.entries(balances).map(([uid, bal]) => (
                <div key={uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--bg)] rounded-lg flex items-center justify-center text-xs font-bold text-[var(--muted)]">
                      {name(uid).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{name(uid)}</span>
                  </div>
                  <span className={`font-display font-bold text-sm px-3 py-1 rounded-xl ${
                    bal > 0.01 ? 'bg-emerald-50 text-jade' :
                    bal < -0.01 ? 'bg-red-50 text-rose-600' : 'bg-[var(--bg)] text-[var(--muted)]'
                  }`}>
                    {bal > 0.01 ? '+' : ''}{bal.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div>
          <h3 className="font-display font-bold text-[var(--text)] mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand" /> Recommended Payments
          </h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-16"/>)}</div>
          ) : transactions.length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle size={44} className="text-jade mx-auto mb-3" />
              <p className="font-display font-bold text-[var(--text)] text-lg">All Settled! 🎉</p>
              <p className="text-[var(--muted)] text-sm mt-1">No one owes anyone anything.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t, idx) => {
                const isMe = t.from === user?.id;
                const done = settled.has(idx);
                return (
                  <div key={idx} className={`card p-4 transition-all ${done ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center font-bold text-[var(--muted)] flex-shrink-0 text-sm">
                        {name(t.from).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--muted)]">
                          <span className="font-bold text-[var(--text)]">{name(t.from)}</span>
                          {' '}pays{' '}
                          <span className="font-bold text-[var(--text)]">{name(t.to)}</span>
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-[var(--muted)]" />
                      <span className="font-display font-black text-jade text-lg">₹{t.amount}</span>
                    </div>
                    {isMe && !done && (
                      <button onClick={() => setSettled(s => new Set([...s, idx]))}
                        className="mt-3 w-full btn-secondary py-2 text-sm border-jade/30 text-jade">
                        <CheckCircle size={14} /> Mark as Paid
                      </button>
                    )}
                    {done && <p className="text-center text-xs text-jade font-bold mt-2">✓ Marked as paid</p>}
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
