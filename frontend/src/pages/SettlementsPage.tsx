import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettlementsPage() {
  const { tripId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [transactions, setTx]  = useState<any[]>([]);
  const [balances, setBal]     = useState<Record<string,number>>({});
  const [loading, setLoading]  = useState(true);
  const [marking, setMarking]  = useState<number|null>(null);
  const [members, setMembers]  = useState<Record<string,string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, mRes] = await Promise.all([
        api.get(`/expenses/${tripId}/settlements`),
        api.get(`/trips/${tripId}/members`).catch(()=>({data:{data:[]}})),
      ]);
      setTx(sRes.data.data?.transactions || []);
      setBal(sRes.data.data?.balances    || {});
      const nm: Record<string,string> = {};
      (mRes.data.data||[]).forEach((m:any)=>{
        nm[m.user_id] = m.user_id===user?.id ? 'You' : (m.user?.full_name||m.user?.email?.split('@')[0]||m.user_id.slice(0,8)+'…');
      });
      setMembers(nm);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if(tripId) load(); },[tripId]);

  const name = (id:string) => members[id] || id.slice(0,8)+'…';

  // Mark a transaction as paid — updates expense_splits in DB
  async function markPaid(idx: number, tx: any) {
    setMarking(idx);
    try {
      await api.post(`/expenses/${tripId}/settle`, { fromUserId: tx.from, toUserId: tx.to, amount: tx.amount });
      toast.success('Payment recorded ✓');
      await load(); // refresh so balances recalculate
    } catch(err:any) {
      toast.error(err.response?.data?.error || 'Failed to mark paid');
    } finally { setMarking(null); }
  }

  const myBal      = user ? (balances[user.id]||0) : 0;
  const isOwed     = myBal >  0.01;
  const owesOthers = myBal < -0.01;

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={()=>navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Settlements</h1>
          <button onClick={load} className="btn-icon bg-[var(--bg)] text-[var(--muted)]">
            <RefreshCw size={16} className={loading?'animate-spin':''}/>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-10">
        {/* My balance summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`stat-card border-l-4 ${isOwed?'border-l-emerald-500':'border-l-transparent'}`}>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">You Are Owed</p>
            <p className="font-display font-black text-2xl text-[var(--text)] mt-0.5">
              ₹{isOwed?myBal.toFixed(0):'0'}
            </p>
          </div>
          <div className={`stat-card border-l-4 ${owesOthers?'border-l-rose-500':'border-l-transparent'}`}>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">You Owe</p>
            <p className="font-display font-black text-2xl text-[var(--text)] mt-0.5">
              ₹{owesOthers?Math.abs(myBal).toFixed(0):'0'}
            </p>
          </div>
        </div>

        {/* All balances */}
        {Object.keys(balances).length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-bold text-[var(--muted)] uppercase mb-3">All Balances</p>
            <div className="space-y-2">
              {Object.entries(balances).map(([uid,bal])=>(
                <div key={uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--bg)] rounded-lg flex items-center justify-center text-xs font-bold text-[var(--muted)]">
                      {name(uid).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text)]">{name(uid)}</span>
                  </div>
                  <span className={`font-display font-bold text-sm px-3 py-1 rounded-xl ${
                    bal>0.01?'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20':
                    bal<-0.01?'bg-red-50 text-rose-600 dark:bg-rose-900/20':
                    'bg-[var(--bg)] text-[var(--muted)]'}`}>
                    {bal>0.01?'+':''}{bal.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div>
          <h3 className="font-display font-bold text-[var(--text)] mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand"/> Recommended Payments
          </h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-20"/>)}</div>
          ) : transactions.length===0 ? (
            <div className="card p-8 text-center">
              <CheckCircle size={44} className="text-emerald-500 mx-auto mb-3"/>
              <p className="font-display font-bold text-[var(--text)] text-lg">All Settled! 🎉</p>
              <p className="text-[var(--muted)] text-sm mt-1">No one owes anyone anything.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t,idx)=>{
                const iAmPayer = t.from===user?.id;
                const iAmReceiver = t.to===user?.id;
                return (
                  <div key={idx} className={`card p-4 transition-all ${iAmPayer?'ring-2 ring-rose-200 dark:ring-rose-900':iAmReceiver?'ring-2 ring-emerald-200 dark:ring-emerald-900':''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--bg)] rounded-xl flex items-center justify-center font-bold text-[var(--muted)] text-sm flex-shrink-0">
                        {name(t.from).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--muted)]">
                          <span className="font-bold text-[var(--text)]">{name(t.from)}</span>
                          {' '}pays{' '}
                          <span className="font-bold text-[var(--text)]">{name(t.to)}</span>
                        </p>
                        {iAmPayer && <p className="text-xs text-rose-500 font-semibold mt-0.5">You need to pay this</p>}
                        {iAmReceiver && <p className="text-xs text-emerald-600 font-semibold mt-0.5">You will receive this</p>}
                      </div>
                      <ArrowRight size={14} className="text-[var(--muted)]"/>
                      <span className="font-display font-black text-emerald-600 text-lg">₹{t.amount}</span>
                    </div>

                    {/* Mark paid — either the payer OR receiver can record it */}
                    {(iAmPayer || iAmReceiver) && (
                      <button
                        onClick={()=>markPaid(idx,t)}
                        disabled={marking===idx}
                        className="mt-3 w-full flex items-center justify-center gap-2 font-semibold text-sm py-2.5 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400 transition-colors disabled:opacity-50">
                        {marking===idx
                          ? <><div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin"/>Recording…</>
                          : <><CheckCircle size={16}/>{iAmPayer?'I have paid this':'Mark as received'}</>
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-4 text-center">
          <p className="text-xs text-[var(--muted)]">💡 Payments happen outside the app — settle via UPI, cash, etc. Once marked, balances update for everyone.</p>
        </div>
      </main>
    </div>
  );
}
