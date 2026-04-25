import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, X, TrendingUp, Users, User } from 'lucide-react';

const CATS = [
  {id:'FOOD',icon:'🍽️',label:'Food'},{id:'TRAVEL',icon:'🚗',label:'Travel'},
  {id:'STAY',icon:'🏨',label:'Stay'},{id:'ACTIVITY',icon:'🎯',label:'Activity'},
  {id:'SHOPPING',icon:'🛍️',label:'Shopping'},{id:'OTHER',icon:'📌',label:'Other'},
];
const CAT_COLOR: Record<string,string> = {
  FOOD:'bg-orange-100 text-orange-600',TRAVEL:'bg-sky-100 text-sky-600',
  STAY:'bg-violet-100 text-violet-600',ACTIVITY:'bg-emerald-100 text-emerald-600',
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
  // form
  const [amount, setAmount]       = useState('');
  const [desc, setDesc]           = useState('');
  const [cat, setCat]             = useState('FOOD');
  const [splitMode, setSplitMode] = useState<'equal'|'manual'>('equal');
  const [manualSplits, setManualSplits] = useState<Record<string,string>>({});
  const [saving, setSaving]       = useState(false);

  const load = () => Promise.all([
    api.get(`/expenses/${tripId}`),
    api.get(`/trips/${tripId}/members`).catch(()=>({data:{data:[]}})),
  ]).then(([eRes,mRes])=>{
    setExpenses(eRes.data.data||[]);
    setMembers(mRes.data.data||[]);
    setLoading(false);
  }).catch(()=>setLoading(false));

  useEffect(()=>{ if(tripId) load(); },[tripId]);

  // When amount changes in equal mode, recompute manual splits
  useEffect(()=>{
    if (splitMode==='manual' && members.length>0 && amount) {
      const pp = (parseFloat(amount)||0) / members.length;
      const splits: Record<string,string> = {};
      members.forEach(m=>{ splits[m.user_id] = pp.toFixed(2); });
      setManualSplits(splits);
    }
  },[amount, splitMode, members]);

  const splitTotal = Object.values(manualSplits).reduce((s,v)=>s+parseFloat(v||'0'),0);
  const amountNum  = parseFloat(amount)||0;
  const splitOk    = Math.abs(splitTotal - amountNum) < 0.05;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount||!desc) return;
    if (splitMode==='manual' && !splitOk) { alert(`Split total ₹${splitTotal.toFixed(0)} ≠ expense ₹${amountNum.toFixed(0)}`); return; }
    setSaving(true);
    try {
      const payload: any = {
        amount:parseFloat(amount), description:desc, category:cat,
        date:new Date().toISOString(), splitMode,
      };
      if (splitMode==='manual') {
        payload.customSplits = Object.entries(manualSplits).map(([uid,amt])=>({user_id:uid,amount:parseFloat(amt)}));
      }
      await api.post(`/expenses/${tripId}`, payload);
      setSheet(false); setAmount(''); setDesc(''); setCat('FOOD'); setSplitMode('equal'); setManualSplits({});
      await load();
    } catch { alert('Failed to add expense'); }
    finally { setSaving(false); }
  };

  const total = expenses.reduce((s,e)=>s+(e.amount||0),0);
  const byDay = expenses.reduce((acc:any,e)=>{
    const d=new Date(e.date||e.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
    if(!acc[d])acc[d]=[];acc[d].push(e);return acc;
  },{});

  const catTotals = CATS.map(c=>({...c,total:expenses.filter(e=>e.category===c.id).reduce((s,e)=>s+e.amount,0)})).filter(c=>c.total>0);

  const memberName = (uid:string) => {
    if (uid===user?.id) return 'You';
    const m = members.find(m=>m.user_id===uid);
    return m?.user?.full_name || m?.user?.email?.split('@')[0] || uid.slice(0,6)+'…';
  };

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={()=>navigate(-1)} className="btn-icon bg-[var(--bg)]"><ArrowLeft size={20} className="text-[var(--muted)]"/></button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Expenses</h1>
          <button onClick={()=>setSheet(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={16}/> Add</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-10">
        {/* Summary card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
          <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Total Spent</p>
          <p className="font-display font-black text-4xl mt-1">₹{total.toLocaleString('en-IN')}</p>
          <div className="flex gap-3 mt-4 overflow-x-auto scrollbar-hide pb-1">
            {catTotals.map(c=>(
              <div key={c.id} className="flex-shrink-0 bg-white/15 rounded-xl px-3 py-2 text-center min-w-[64px]">
                <span className="text-lg">{c.icon}</span>
                <p className="text-white/60 text-[10px] mt-0.5">{c.label}</p>
                <p className="text-white font-bold text-xs">₹{c.total.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-16"/>)}</div>
        ) : Object.keys(byDay).length===0 ? (
          <div className="card p-8 text-center">
            <TrendingUp size={40} className="text-[var(--muted)] mx-auto mb-3 opacity-40"/>
            <p className="font-bold text-[var(--text)]">No expenses yet</p>
            <p className="text-[var(--muted)] text-sm mt-1">Tap + Add to start tracking</p>
          </div>
        ) : (
          Object.entries(byDay).map(([date,items]:any)=>(
            <div key={date}>
              <p className="text-xs font-bold text-[var(--muted)] uppercase mb-2">{date}</p>
              <div className="space-y-2">
                {items.map((exp:any)=>(
                  <div key={exp.id} className="card px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${CAT_COLOR[exp.category]||CAT_COLOR.OTHER}`}>
                        {CATS.find(c=>c.id===exp.category)?.icon||'📌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[var(--text)] text-sm truncate">{exp.description}</p>
                        <p className="text-[var(--muted)] text-xs">{exp.category} · paid by {memberName(exp.paid_by_user_id)}</p>
                      </div>
                      <p className="font-display font-bold text-[var(--text)]">₹{exp.amount?.toLocaleString('en-IN')}</p>
                    </div>
                    {/* Show splits if available */}
                    {exp.splits?.length>0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-wrap gap-1.5">
                        {exp.splits.map((s:any,si:number)=>(
                          <span key={si} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_settled?'bg-emerald-50 text-emerald-700':'bg-[var(--bg)] text-[var(--muted)]'}`}>
                            {memberName(s.user_id)} ₹{parseFloat(s.amount_owed||s.amount).toFixed(0)}{s.is_settled?'✓':''}
                          </span>
                        ))}
                      </div>
                    )}
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
          <div className="sheet-overlay" onClick={()=>setSheet(false)}/>
          <div className="sheet">
            <div className="sheet-handle"/>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <h2 className="font-display font-bold text-[var(--text)] text-lg">Add Expense</h2>
              <button onClick={()=>setSheet(false)} className="btn-icon bg-[var(--bg)]"><X size={18}/></button>
            </div>
            <form onSubmit={handleAdd} className="px-5 py-4 space-y-4 pb-safe">
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" inputMode="decimal" className="input text-2xl font-black" placeholder="0"
                  value={amount} onChange={e=>setAmount(e.target.value)} required autoFocus/>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="e.g. Lunch at hotel"
                  value={desc} onChange={e=>setDesc(e.target.value)} required/>
              </div>
              <div>
                <label className="label">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATS.map(c=>(
                    <button key={c.id} type="button" onClick={()=>setCat(c.id)}
                      className={`cat-pill ${cat===c.id?'cat-active':'cat-inactive'}`}>
                      <span className="text-xl">{c.icon}</span><span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── SPLIT MODE ── */}
              <div>
                <label className="label">Split</label>
                <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
                  <button type="button" onClick={()=>setSplitMode('equal')}
                    className={`flex-1 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all ${splitMode==='equal'?'bg-brand text-white':'bg-[var(--bg)] text-[var(--muted)]'}`}>
                    <Users size={15}/> Equal
                  </button>
                  <button type="button" onClick={()=>{ setSplitMode('manual'); if(amount&&members.length>0){ const pp=(parseFloat(amount)||0)/members.length; const s:Record<string,string>={};members.forEach(m=>{s[m.user_id]=pp.toFixed(2)});setManualSplits(s); } }}
                    className={`flex-1 py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all ${splitMode==='manual'?'bg-brand text-white':'bg-[var(--bg)] text-[var(--muted)]'}`}>
                    <User size={15}/> Manual
                  </button>
                </div>
              </div>

              {splitMode==='equal' && members.length>0 && amount && (
                <div className="bg-[var(--bg)] rounded-xl p-3">
                  <p className="text-xs font-bold text-[var(--muted)] mb-2">Split equally among {members.length} members</p>
                  <div className="flex flex-wrap gap-2">
                    {members.map(m=>(
                      <div key={m.user_id} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--text)]">
                        {memberName(m.user_id)} — ₹{((parseFloat(amount)||0)/members.length).toFixed(0)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {splitMode==='manual' && members.length>0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--muted)]">Enter amount per person</p>
                    <p className={`text-xs font-bold ${splitOk?'text-emerald-600':'text-rose-500'}`}>
                      {splitOk?'✓ Balanced':`₹${(amountNum-splitTotal).toFixed(0)} remaining`}
                    </p>
                  </div>
                  {members.map(m=>(
                    <div key={m.user_id} className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[var(--text)] flex-1 truncate">{memberName(m.user_id)}</span>
                      <div className="relative w-28">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">₹</span>
                        <input type="number" className="input pl-7 py-2 text-sm text-right"
                          value={manualSplits[m.user_id]||''}
                          onChange={e=>setManualSplits(p=>({...p,[m.user_id]:e.target.value}))}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={saving} className="btn-primary w-full py-4 text-base">
                {saving?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</>:<>💰 Add Expense</>}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
