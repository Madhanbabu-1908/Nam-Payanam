import { useState, useEffect } from 'react';
import { expenseAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, CategoryIcon, MemberAvatar, BottomSheet, EmptyState, Spinner } from '../ui/index.jsx';
import SettlementsView from './SettlementsView.jsx';
import TripReport from './TripReport.jsx';

const CATEGORIES = ['food', 'transport', 'stay', 'activity', 'shopping', 'other'];
const CAT_ICONS = { food:'🍽️', transport:'🚗', stay:'🏨', activity:'🎯', shopping:'🛍️', other:'📌' };
const CAT_COLORS = {
  food: 'from-amber-400 to-yellow-500',
  transport: 'from-blue-400 to-blue-600',
  stay: 'from-purple-400 to-purple-600',
  activity: 'from-emerald-400 to-emerald-600',
  shopping: 'from-pink-400 to-pink-600',
  other: 'from-slate-400 to-slate-500',
};

export default function ExpensesTab({ trip, members, expenses, session }) {
  const [view, setView] = useState('list');
  const [showAdd, setShowAdd] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [filterDay, setFilterDay] = useState('all');

  const dayNums = [...new Set(expenses.map(e => e.day_number))].sort((a,b)=>a-b);
  const filtered = filterDay === 'all' ? expenses : expenses.filter(e => e.day_number === parseInt(filterDay));
  const total = filtered.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Break expenses (tagged with [break] in note)
  const breakExpenses = expenses.filter(e => e.note?.includes('[break]'));

  const grouped = filtered.reduce((acc, e) => {
    const key = e.day_number; if (!acc[key]) acc[key] = []; acc[key].push(e); return acc;
  }, {});

  return (
    <div className="flex flex-col pb-32 animate-fade-in">
      {/* Sub-nav */}
      <div className="flex bg-white border-b border-slate-100 sticky top-0 z-10">
        {[['list','💸 List'],['settlements','⚖️ Settle'],['report','📊 Report']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex-1 py-3 text-xs font-extrabold transition-all
              ${view === id ? 'text-[#FF6B35] border-b-2 border-[#FF6B35]' : 'text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'list' && (
        <div className="px-4 py-3">
          {/* Hero summary */}
          <div className="bg-gradient-to-br from-[#FF6B35] to-[#cc2900] rounded-2xl p-5 mb-4 text-white">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-wide">Total Spent</p>
                <p className="font-display font-extrabold text-4xl mt-0.5">{formatCurrency(total)}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs font-bold">Per Person</p>
                <p className="font-display font-bold text-2xl">
                  {members.length > 0 ? formatCurrency(total / members.length) : '—'}
                </p>
              </div>
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map(cat => {
                const catTotal = expenses.filter(e => e.category === cat).reduce((s,e) => s+parseFloat(e.amount), 0);
                if (!catTotal) return null;
                return (
                  <div key={cat} className="flex-shrink-0 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[56px]">
                    <div className="text-base">{CAT_ICONS[cat]}</div>
                    <div className="text-white text-[10px] font-extrabold mt-0.5">{formatCurrency(catTotal)}</div>
                  </div>
                );
              })}
              {breakExpenses.length > 0 && (
                <div className="flex-shrink-0 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[56px]">
                  <div className="text-base">☕</div>
                  <div className="text-white text-[10px] font-extrabold mt-0.5">{breakExpenses.length} breaks</div>
                </div>
              )}
            </div>
          </div>

          {/* Day filter */}
          {dayNums.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
              {[['all', 'All Days'], ...dayNums.map(d => [String(d), `Day ${d}`])].map(([val, label]) => (
                <button key={val} onClick={() => setFilterDay(val)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all
                    ${filterDay === val ? 'bg-[#FF6B35] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          {Object.keys(grouped).length === 0 ? (
            <EmptyState icon="💸" title="No expenses yet" description="Start tracking your trip spending!" />
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).sort(([a],[b]) => parseInt(a)-parseInt(b)).map(([day, exps]) => (
                <div key={day}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white text-[11px] font-extrabold rounded-lg flex items-center justify-center">D{day}</span>
                      <span className="text-xs font-bold text-slate-600">Day {day} Expenses</span>
                    </div>
                    <span className="text-xs font-extrabold text-[#FF6B35]">
                      {formatCurrency(exps.reduce((s,e)=>s+parseFloat(e.amount),0))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {exps.map(exp => (
                      <ExpenseCard key={exp.id} exp={exp} members={members} session={session} onEdit={() => setEditExp(exp)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'settlements' && <SettlementsView tripId={trip?.id} members={members} />}
      {view === 'report' && <TripReport tripId={trip?.id} trip={trip} />}

      {/* FAB */}
      {view === 'list' && (
        <button onClick={() => setShowAdd(true)}
          className="fixed bottom-6 right-4 w-14 h-14 bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white rounded-2xl shadow-[0_4px_20px_rgba(255,107,53,0.4)] active:scale-90 transition-all flex items-center justify-center text-2xl font-bold z-30">
          +
        </button>
      )}

      <ExpenseSheet
        isOpen={showAdd || !!editExp}
        onClose={() => { setShowAdd(false); setEditExp(null); }}
        trip={trip} members={members} session={session} editData={editExp}
      />
    </div>
  );
}

function ExpenseCard({ exp, members, session, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const canEdit = session?.nickname === exp.paid_by_nickname || session?.isOrganizer;
  const isBreak = exp.note?.includes('[break]');

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isBreak ? 'border-amber-200' : 'border-slate-100'}`}>
      {isBreak && <div className="h-0.5 bg-gradient-to-r from-amber-400 to-orange-400" />}
      <div className="p-3">
        <div className="flex items-center gap-3">
          <CategoryIcon category={exp.category} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="font-bold text-slate-800 text-sm truncate">{exp.title}</h4>
                {isBreak && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-md flex-shrink-0">☕</span>}
              </div>
              <span className="font-display font-extrabold text-slate-900 text-base ml-1 flex-shrink-0">{formatCurrency(exp.amount)}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">Paid by <span className="font-semibold text-slate-600">{exp.paid_by_nickname}</span></span>
              <span className="text-slate-200">·</span>
              <span className="text-xs text-slate-400">{exp.split_type === 'equal' ? '÷ Equal' : '⚖️ Manual'}</span>
            </div>
          </div>
          {canEdit && (
            <button onClick={onEdit} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 active:bg-slate-200">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>

        {exp.splits?.length > 0 && (
          <>
            <button onClick={() => setExpanded(!expanded)} className="w-full text-[11px] text-blue-500 font-bold mt-2 text-center">
              {expanded ? '▲ Hide split' : `▼ ${exp.splits.length} people`}
            </button>
            {expanded && (
              <div className="mt-2 bg-slate-50 rounded-xl p-2 space-y-1.5">
                {exp.splits.map((sp, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MemberAvatar nickname={sp.nickname} size="sm" />
                      <span className="text-xs text-slate-600 font-medium">{sp.nickname}</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-700">{formatCurrency(sp.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ExpenseSheet({ isOpen, onClose, trip, members, session, editData }) {
  const [form, setForm] = useState({ title:'', amount:'', category:'food', dayNumber:0, splitType:'equal', note:'', customSplits:{} });
  const [loading, setL] = useState(false);
  const [deleting, setD] = useState(false);

  useEffect(() => {
    if (editData) {
      const cs = {}; editData.splits?.forEach(s => { cs[s.nickname] = s.amount; });
      setForm({ title: editData.title, amount: editData.amount, category: editData.category, dayNumber: editData.day_number, splitType: editData.split_type, note: editData.note || '', customSplits: cs });
    } else {
      setForm({ title:'', amount:'', category:'food', dayNumber:0, splitType:'equal', note:'', customSplits:{} });
    }
  }, [editData, isOpen]);

  function spread() {
    if (!form.amount) return;
    const per = (parseFloat(form.amount) / members.length).toFixed(2);
    const cs = {}; members.forEach(m => { cs[m.nickname] = per; });
    setForm(p => ({ ...p, customSplits: cs }));
  }

  async function submit() {
    if (!form.title.trim() || !form.amount) return toast.error('Title and amount required');
    setL(true);
    try {
      const splits = form.splitType === 'equal'
        ? members.map(m => ({ nickname: m.nickname, memberId: m.id, amount: Math.round(parseFloat(form.amount) / members.length * 100) / 100 }))
        : members.map(m => ({ nickname: m.nickname, memberId: m.id, amount: parseFloat(form.customSplits[m.nickname] || 0) }));

      const payload = { tripId: trip.id, dayNumber: form.dayNumber, title: form.title.trim(), amount: parseFloat(form.amount), category: form.category, paidByNickname: session?.nickname, paidByMemberId: session?.memberRowId, splitType: form.splitType, splits, note: form.note };

      if (editData) { await expenseAPI.update(editData.id, payload); toast.success('Updated ✅'); }
      else { await expenseAPI.add(payload); toast.success('Expense added 💰'); }
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setL(false); }
  }

  async function del() {
    setD(true);
    try { await expenseAPI.delete(editData.id); toast.success('Deleted'); onClose(); }
    catch { toast.error('Failed to delete'); }
    finally { setD(false); }
  }

  const splitTotal = Object.values(form.customSplits).reduce((s,v) => s + parseFloat(v||0), 0);
  const diff = Math.abs(splitTotal - (parseFloat(form.amount)||0));

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editData ? '✏️ Edit Expense' : '➕ Add Expense'}>
      <div className="space-y-4 pb-4">
        <div>
          <label className="label">What was spent? *</label>
          <input className="input" placeholder="e.g. Lunch at Hotel" value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" className="input text-xl font-bold" placeholder="0" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} />
          </div>
          <div>
            <label className="label">Day</label>
            <select className="input" value={form.dayNumber} onChange={e => setForm(p=>({...p,dayNumber:parseInt(e.target.value)}))}>
              <option value={0}>Pre-trip (Day 0)</option>
              {Array.from({length:15},(_,i) => <option key={i+1} value={i+1}>Day {i+1}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setForm(p=>({...p,category:cat}))}
                className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all
                  ${form.category === cat ? 'bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                <span>{CAT_ICONS[cat]}</span> {cat.charAt(0).toUpperCase()+cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Split</label>
          <div className="flex gap-2">
            {[['equal','÷ Equal'],['manual','⚖️ Custom']].map(([v,l]) => (
              <button key={v} onClick={() => { setForm(p=>({...p,splitType:v})); if(v==='manual') spread(); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-all
                  ${form.splitType===v ? 'bg-[#FF6B35] text-white shadow' : 'bg-slate-100 text-slate-600'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {form.splitType === 'manual' && members.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Custom splits</label>
              <button onClick={spread} className="text-xs text-blue-600 font-bold">Reset equal</button>
            </div>
            {diff > 0.5 && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold">
                ⚠️ Total {formatCurrency(splitTotal)} vs {formatCurrency(parseFloat(form.amount)||0)} · diff {formatCurrency(diff)}
              </div>
            )}
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <MemberAvatar nickname={m.nickname} size="sm" />
                  <span className="text-sm font-semibold text-slate-700 flex-1 truncate">{m.nickname}</span>
                  <input type="number" className="input w-28" placeholder="0"
                    value={form.customSplits[m.nickname]||''} onChange={e => setForm(p=>({...p,customSplits:{...p.customSplits,[m.nickname]:e.target.value}}))} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Note (optional)</label>
          <input className="input" placeholder="Any note..." value={form.note} onChange={e => setForm(p=>({...p,note:e.target.value}))} />
        </div>

        <div className="flex gap-3 pt-1">
          {editData && (
            <button onClick={del} disabled={deleting} className="w-12 h-12 bg-red-50 border border-red-200 text-red-500 rounded-xl flex items-center justify-center active:scale-95">
              {deleting ? <Spinner size="sm" /> : '🗑️'}
            </button>
          )}
          <button onClick={submit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 font-extrabold">
            {loading ? <Spinner size="sm" color="white" /> : null}
            {loading ? 'Saving...' : editData ? 'Update' : '💰 Add Expense'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
