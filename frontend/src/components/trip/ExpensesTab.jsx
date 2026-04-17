import { useState } from 'react';
import { expenseAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { CategoryIcon, MemberAvatar, BottomSheet, EmptyState, Spinner, formatCurrency } from '../ui/index.jsx';
import SettlementsView from './SettlementsView.jsx';
import TripReport from './TripReport.jsx';

const CATS = ['food','transport','stay','activity','shopping','fuel','medical','other'];
const CAT_ICONS = { food:'🍽️',transport:'🚗',stay:'🏨',activity:'🎯',shopping:'🛍️',fuel:'⛽',medical:'💊',other:'📌' };

export default function ExpensesTab({ trip, members, expenses, session }) {
  const [view, setView]           = useState('list');
  const [showAdd, setShowAdd]     = useState(false);
  const [editExp, setEditExp]     = useState(null);
  const [filterDay, setFilterDay] = useState('all');

  const dayNums   = [...new Set(expenses.map(e=>e.day_number))].sort((a,b)=>a-b);
  const filtered  = filterDay==='all' ? expenses : expenses.filter(e=>e.day_number===parseInt(filterDay));
  const total     = filtered.reduce((s,e)=>s+parseFloat(e.amount),0);
  const grouped   = filtered.reduce((acc,exp)=>{ const k=exp.day_number; if(!acc[k])acc[k]=[]; acc[k].push(exp); return acc; },{});

  return (
    <div className="flex flex-col pb-28 animate-fade-in">
      {/* Sub-nav */}
      <div className="flex border-b border-slate-100 bg-white sticky top-0 z-10">
        {[['list','💸 Expenses'],['settlements','⚖️ Settle'],['report','📊 Report']].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)}
            className={`flex-1 py-3 text-xs font-black transition-colors ${view===id?'text-saffron-600 border-b-2 border-saffron-500':'text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {view==='list' && (
        <div className="px-4 py-3">
          {/* Hero summary */}
          <div className="card-indigo rounded-2xl p-4 mb-4">
            <div className="flex items-end justify-between mb-3">
              <div><p className="text-white/60 text-xs font-bold uppercase">Total Spent</p>
                <p className="font-display font-black text-4xl text-white mt-1">{formatCurrency(total)}</p></div>
              <div className="text-right"><p className="text-white/60 text-xs font-bold uppercase">Per Person</p>
                <p className="font-display font-black text-xl text-saffron-400 mt-1">{members.length>0?formatCurrency(total/members.length):'—'}</p></div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATS.map(cat=>{
                const amt=expenses.filter(e=>e.category===cat).reduce((s,e)=>s+parseFloat(e.amount),0);
                if(!amt) return null;
                return (
                  <div key={cat} className="flex-shrink-0 bg-white/15 rounded-xl px-2.5 py-2 text-center">
                    <div className="text-base">{CAT_ICONS[cat]}</div>
                    <div className="text-white font-bold text-xs mt-0.5">{formatCurrency(amt)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day filter */}
          {dayNums.length>1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              <button onClick={()=>setFilterDay('all')} className={`flex-shrink-0 day-chip ${filterDay==='all'?'day-chip-active':'day-chip-idle'}`}>All Days</button>
              {dayNums.map(d=>(
                <button key={d} onClick={()=>setFilterDay(String(d))} className={`flex-shrink-0 day-chip ${filterDay===String(d)?'day-chip-active':'day-chip-idle'}`}>Day {d}</button>
              ))}
            </div>
          )}

          {/* List */}
          {Object.keys(grouped).length===0 ? (
            <EmptyState icon="💸" title="No expenses yet" description="Tap + to add the first expense"/>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).sort(([a],[b])=>parseInt(a)-parseInt(b)).map(([day,exps])=>(
                <div key={day}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-black text-slate-500 uppercase">Day {day}</span>
                    <span className="font-black text-saffron-600 text-sm">{formatCurrency(exps.reduce((s,e)=>s+parseFloat(e.amount),0))}</span>
                  </div>
                  <div className="space-y-2">
                    {exps.map(exp=>(
                      <ExpenseCard key={exp.id} exp={exp} session={session} onEdit={()=>setEditExp(exp)}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view==='settlements' && <SettlementsView tripId={trip?.id} members={members}/>}
      {view==='report' && <TripReport tripId={trip?.id} trip={trip}/>}

      {view==='list' && (
        <button onClick={()=>setShowAdd(true)}
          className="fixed bottom-6 right-4 w-14 h-14 bg-saffron-500 rounded-2xl shadow-saffron flex items-center justify-center text-3xl text-white active:scale-90 transition-all z-30">
          +
        </button>
      )}

      <ExpenseSheet isOpen={showAdd||!!editExp} onClose={()=>{setShowAdd(false);setEditExp(null);}}
        trip={trip} members={members} session={session} editData={editExp}/>
    </div>
  );
}

function ExpenseCard({ exp, session, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const canEdit = session?.nickname===exp.paid_by_nickname||session?.isOrganizer;
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-3">
        <CategoryIcon category={exp.category} size="sm"/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-slate-800 text-sm truncate">{exp.title}</h4>
            <span className="font-display font-black text-slate-900 text-base ml-2 flex-shrink-0">{formatCurrency(exp.amount)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-slate-400">Paid by <span className="font-bold text-slate-600">{exp.paid_by_nickname}</span></span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-400">{exp.split_type==='equal'?'÷ Equal':'⚖️ Custom'}</span>
          </div>
        </div>
        {canEdit && (
          <button onClick={onEdit} className="btn-icon bg-slate-100 w-8 h-8">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
        )}
      </div>
      {exp.splits?.length>0 && (
        <>
          <button onClick={()=>setExpanded(!expanded)} className="w-full text-[11px] text-indigo-600 font-bold mt-2 text-center">
            {expanded?'▲ Hide':'▼'} {exp.splits.length} people split
          </button>
          {expanded && (
            <div className="mt-2 bg-slate-50 rounded-xl p-2.5 space-y-1.5 animate-fade-in">
              {exp.splits.map((s,i)=>(
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><MemberAvatar nickname={s.nickname} size="sm"/><span className="text-xs text-slate-600">{s.nickname}</span></div>
                  <span className="text-xs font-black text-slate-700">{formatCurrency(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExpenseSheet({ isOpen, onClose, trip, members, session, editData }) {
  const [form, setForm] = useState({ title:'',amount:'',category:'food',dayNumber:0,splitType:'equal',note:'',splits:{} });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));

  useState(() => {
    if (editData) {
      const spl = {}; editData.splits?.forEach(s=>{ spl[s.nickname]=s.amount; });
      setForm({ title:editData.title, amount:editData.amount, category:editData.category, dayNumber:editData.day_number, splitType:editData.split_type, note:editData.note||'', splits:spl });
    } else {
      setForm({ title:'',amount:'',category:'food',dayNumber:0,splitType:'equal',note:'',splits:{} });
    }
  }, [editData, isOpen]);

  function equalSplit() {
    if (!form.amount||!members.length) return;
    const pp = (parseFloat(form.amount)/members.length).toFixed(2);
    const spl={}; members.forEach(m=>{ spl[m.nickname]=pp; });
    setForm(p=>({...p,splits:spl}));
  }

  async function save() {
    if (!form.title.trim()||!form.amount) return toast.error('Title and amount required');
    setSaving(true);
    try {
      let splits=[];
      if (form.splitType==='equal') {
        const pp=parseFloat(form.amount)/members.length;
        splits=members.map(m=>({ nickname:m.nickname, memberId:m.id, amount:Math.round(pp*100)/100 }));
      } else {
        splits=members.map(m=>({ nickname:m.nickname, memberId:m.id, amount:parseFloat(form.splits[m.nickname]||0) }));
      }
      const payload={ tripId:trip.id, dayNumber:form.dayNumber, title:form.title.trim(), amount:parseFloat(form.amount), category:form.category, paidByNickname:session?.nickname, paidByMemberId:session?.memberRowId, splitType:form.splitType, splits, note:form.note };
      if (editData) { await expenseAPI.update(editData.id, payload); toast.success('Updated ✅'); }
      else { await expenseAPI.add(payload); toast.success('Expense added! 💰'); }
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function del() {
    setDeleting(true);
    try { await expenseAPI.delete(editData.id); toast.success('Deleted'); onClose(); }
    catch { toast.error('Failed'); setDeleting(false); }
  }

  const splitTotal = Object.values(form.splits).reduce((s,v)=>s+parseFloat(v||0),0);
  const amtNum = parseFloat(form.amount)||0;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editData?'Edit Expense':'Add Expense'} fullscreen>
      <div className="space-y-4 pb-6">
        <div><label className="label">Title *</label><input className="input" placeholder="e.g. Lunch at Saravana Bhavan" value={form.title} onChange={e=>upd('title',e.target.value)}/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Amount (₹) *</label><input type="number" className="input" placeholder="0" value={form.amount} onChange={e=>upd('amount',e.target.value)}/></div>
          <div><label className="label">Day</label>
            <select className="input" value={form.dayNumber} onChange={e=>upd('dayNumber',parseInt(e.target.value))}>
              <option value={0}>Pre-trip</option>
              {Array.from({length:15},(_,i)=><option key={i+1} value={i+1}>Day {i+1}</option>)}
            </select>
          </div>
        </div>
        <div><label className="label">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATS.map(cat=>(
              <button key={cat} onClick={()=>upd('category',cat)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold border transition-all
                  ${form.category===cat?'bg-indigo-600 text-white border-indigo-600':'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <span className="text-base">{CAT_ICONS[cat]}</span>{cat.charAt(0).toUpperCase()+cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div><label className="label">Split Type</label>
          <div className="flex gap-2">
            {[['equal','÷ Equal'],['manual','⚖️ Manual']].map(([v,l])=>(
              <button key={v} onClick={()=>{upd('splitType',v);if(v==='manual')equalSplit();}}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${form.splitType===v?'bg-indigo-600 text-white shadow-indigo':'bg-slate-100 text-slate-600'}`}>{l}</button>
            ))}
          </div>
        </div>
        {form.splitType==='manual' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Per Member</label>
              <button onClick={equalSplit} className="text-xs text-indigo-600 font-bold">Reset equal</button>
            </div>
            {Math.abs(splitTotal-amtNum)>0.5 && (
              <div className="mb-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                ⚠️ Split {formatCurrency(splitTotal)} ≠ {formatCurrency(amtNum)} · Diff: {formatCurrency(Math.abs(splitTotal-amtNum))}
              </div>
            )}
            {members.map(m=>(
              <div key={m.id} className="flex items-center gap-3 mb-2">
                <MemberAvatar nickname={m.nickname} size="sm"/>
                <span className="text-sm font-bold text-slate-700 flex-1 truncate">{m.nickname}</span>
                <input type="number" className="input w-28 text-right font-bold" value={form.splits[m.nickname]||''} onChange={e=>setForm(p=>({...p,splits:{...p.splits,[m.nickname]:e.target.value}}))}/>
              </div>
            ))}
          </div>
        )}
        <div><label className="label">Note (optional)</label><input className="input" placeholder="Any note..." value={form.note} onChange={e=>upd('note',e.target.value)}/></div>
        <div className="flex gap-3 pt-1">
          {editData && <button onClick={del} disabled={deleting} className="btn-danger px-4">{deleting?'...':'🗑️'}</button>}
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving?<Spinner size="sm" color="white"/>:null}{saving?'Saving...':editData?'Update':'Add Expense'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
