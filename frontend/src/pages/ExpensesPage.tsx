import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, X, ChevronDown, Users, User } from 'lucide-react';
import toast from 'react-hot-toast';

const CATS = [
  {id:'FOOD',icon:'🍽️',label:'Food'},{id:'TRAVEL',icon:'🚗',label:'Travel'},
  {id:'STAY',icon:'🏨',label:'Stay'},{id:'ACTIVITY',icon:'🎯',label:'Activity'},
  {id:'SHOPPING',icon:'🛍️',label:'Shopping'},{id:'OTHER',icon:'📌',label:'Other'},
];
const CAT_STYLE: Record<string,string> = {
  FOOD:'bg-orange-100 text-orange-600',TRAVEL:'bg-sky-100 text-sky-600',
  STAY:'bg-violet-100 text-violet-600',ACTIVITY:'bg-jade/10 text-jade',
  SHOPPING:'bg-pink-100 text-pink-600',OTHER:'bg-slate-100 text-slate-500',
};

export default function ExpensesPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sheet, setSheet]       = useState(false);

  // Form state
  const [amount, setAmount]       = useState('');
  const [desc, setDesc]           = useState('');
  const [cat, setCat]             = useState('FOOD');
  const [splitType, setSplitType] = useState<'EQUAL'|'MANUAL'>('EQUAL');
  const [manualSplits, setManualSplits] = useState<Record<string,string>>({});
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    try {
      const [expRes, memRes] = await Promise.all([
        api.get(`/expenses/${tripId}`),
        api.get(`/trips/${tripId}/members`).catch(() => ({data:{data:[]}})),
      ]);
      setExpenses(expRes.data.data || []);
      const m = memRes.data.data || [];
      setMembers(m);
      // Init manual splits
      const init: Record<string,string> = {};
      m.forEach((mem: any) => { init[mem.user_id] = ''; });
      setManualSplits(init);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (tripId) load(); }, [tripId]);

  // When amount changes with EQUAL, spread evenly
  useEffect(() => {
    if (splitType === 'EQUAL' || !amount || !members.length) return;
    const per = (parseFloat(amount) / members.length).toFixed(2);
    const init: Record<string,string> = {};
    members.forEach((m: any) => { init[m.user_id] = per; });
    setManualSplits(init);
  }, [amount, members, splitType]);

  const manualTotal = Object.values(manualSplits).reduce((s,v) => s + (parseFloat(v)||0), 0);
  const manualDiff  = Math.abs(manualTotal - (parseFloat(amount)||0));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !desc) return toast.error('Amount and description required');
    if (splitType === 'MANUAL' && manualDiff > 0.5) return toast.error(`Split total ₹${manualTotal.toFixed(0)} ≠ ₹${amount}`);
    setSaving(true);
    try {
      const payload: any = { amount: parseFloat(amount), description: desc, category: cat, date: new Date().toISOString(), split_type: splitType };
      if (splitType === 'MANUAL') {
        payload.manual_splits = members.map((m: any) => ({ user_id: m.user_id, amount_owed: parseFloat(manualSplits[m.user_id]||'0') }));
      }
      await api.post(`/expenses/${tripId}`, payload);
      setSheet(false); setAmount(''); setDesc(''); setCat('FOOD'); setSplitType('EQUAL');
      toast.success('Expense added!');
      await load();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try { await api.delete(`/expenses/${tripId}/${id}`); toast.success('Deleted'); await load(); }
    catch { toast.error('Failed'); }
  };

  const total  = expenses.reduce((s,e) => s+(e.amount||0), 0);
  const byDay  = expenses.reduce((acc: any, e) => {
    const d = new Date(e.date||e.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'});
    if (!acc[d]) acc[d] = []; acc[d].push(e); return acc;
  }, {});
  const catTotals = CATS.map(c => ({ ...c, total: expenses.filter(e=>e.category===c.id).reduce((s,e)=>s+e.amount,0) })).filter(c=>c.total>0);
  const getMemberName = (uid: string) => members.find(m=>m.user_id===uid)?.profile?.full_name || members.find(m=>m.user_id===uid)?.profile?.email?.split('@')[0] || uid.substring(0,6);

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]"><ArrowLeft size={20} className="text-[var(--muted)]"/></button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Expenses</h1>
          <button onClick={() => setSheet(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={15}/>Add</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-10">
        {/* Summary card */}
        <div className="bg-gradient-to-br from-jade to-teal-600 rounded-2xl p-5 text-white">
          <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Total Spent</p>
          <p className="font-display font-black text-4xl mt-1">₹{total.toLocaleString('en-IN')}</p>
          {catTotals.length > 0 && (
            <div className="flex gap-3 mt-4 overflow-x-auto scrollbar-hide pb-1">
              {catTotals.map(c => (
                <div key={c.id} className="flex-shrink-0 bg-white/15 rounded-xl px-3 py-2 text-center min-w-[60px]">
                  <span className="text-lg">{c.icon}</span>
                  <p className="text-white/60 text-[10px] mt-0.5">{c.label}</p>
                  <p className="text-white font-bold text-xs">₹{c.total.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense list */}
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-16"/>)}</div>
        ) : Object.keys(byDay).length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="font-bold text-[var(--text)]">No expenses yet</p>
            <p className="text-[var(--muted)] text-sm mt-1">Tap + Add to start tracking</p>
          </div>
        ) : (
          Object.entries(byDay).map(([date, items]: any) => (
            <div key={date}>
              <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">{date}</p>
              <div className="space-y-2">
                {items.map((exp: any) => (
                  <div key={exp.id} className="card px-4 py-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${CAT_STYLE[exp.category]||CAT_STYLE.OTHER}`}>
                      {CATS.find(c=>c.id===exp.category)?.icon||'📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text)] text-sm truncate">{exp.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[var(--muted)] text-xs">{exp.split_type === 'EQUAL' ? <span className="flex items-center gap-1"><Users size={10}/>Equal split</span> : <span className="flex items-center gap-1"><User size={10}/>Custom split</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-[var(--text)]">₹{exp.amount?.toLocaleString('en-IN')}</p>
                      {exp.paid_by_user_id === user?.id && (
                        <button onClick={() => deleteExpense(exp.id)} className="btn-icon w-7 h-7 text-[var(--muted)] hover:text-rose-500"><X size={13}/></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Add expense sheet */}
      {sheet && (
        <>
          <div className="sheet-overlay" onClick={() => setSheet(false)}/>
          <div className="sheet">
            <div className="sheet-handle"/>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <h2 className="font-display font-bold text-[var(--text)] text-lg">Add Expense</h2>
              <button onClick={() => setSheet(false)} className="btn-icon bg-[var(--bg)]"><X size={18}/></button>
            </div>
            <form onSubmit={handleAdd} className="px-5 py-4 space-y-4 pb-safe">
              <div>
                <label className="label">Amount (₹) *</label>
                <input type="number" inputMode="decimal" className="input text-2xl font-black"
                  placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} required autoFocus/>
              </div>
              <div>
                <label className="label">Description *</label>
                <input className="input" placeholder="e.g. Lunch at hotel" value={desc} onChange={e=>setDesc(e.target.value)} required/>
              </div>
              {/* Category */}
              <div>
                <label className="label">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATS.map(c => (
                    <button key={c.id} type="button" onClick={() => setCat(c.id)}
                      className={`cat-pill ${cat===c.id?'cat-active':'cat-inactive'}`}>
                      <span className="text-xl">{c.icon}</span><span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Split type */}
              <div>
                <label className="label">How to split?</label>
                <div className="flex gap-2">
                  {([['EQUAL','÷ Equal Split','Everyone pays same'],['MANUAL','⚖️ Custom','Set per person']] as const).map(([v,label,sub]) => (
                    <button key={v} type="button" onClick={() => setSplitType(v)}
                      className={`flex-1 py-3 rounded-xl border-2 text-xs font-bold transition-all text-left px-3
                        ${splitType===v ? 'border-brand bg-brand/10 text-brand' : 'border-[var(--border)] text-[var(--muted)]'}`}>
                      <div className="font-bold text-sm">{label}</div>
                      <div className="font-normal opacity-70 text-[11px] mt-0.5">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Manual splits */}
              {splitType === 'MANUAL' && members.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Per person amount</label>
                    {manualDiff > 0.5 && <span className="text-xs text-rose-500 font-bold">Diff: ₹{manualDiff.toFixed(0)}</span>}
                  </div>
                  {members.map((m: any) => (
                    <div key={m.user_id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[var(--bg)] rounded-lg flex items-center justify-center text-xs font-bold text-[var(--muted)] flex-shrink-0">
                        {getMemberName(m.user_id).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-[var(--text)] flex-1 truncate">
                        {m.user_id === user?.id ? 'You' : getMemberName(m.user_id)}
                      </span>
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] font-bold">₹</span>
                        <input type="number" className="input pl-6 text-sm py-2"
                          value={manualSplits[m.user_id]||''}
                          onChange={e => setManualSplits(p => ({...p,[m.user_id]:e.target.value}))}/>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-1 border-t border-[var(--border)]">
                    <span className="text-[var(--muted)]">Total split</span>
                    <span className={`font-bold ${manualDiff > 0.5 ? 'text-rose-500' : 'text-jade'}`}>₹{manualTotal.toFixed(0)}</span>
                  </div>
                </div>
              )}
              <button type="submit" disabled={saving} className="btn-primary w-full py-4 text-base">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : '💰'}
                {saving ? 'Saving…' : 'Add Expense'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
