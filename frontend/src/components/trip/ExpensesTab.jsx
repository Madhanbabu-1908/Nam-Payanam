import { useState, useEffect } from 'react';
import { expenseAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, CategoryIcon, MemberAvatar, BottomSheet, EmptyState, Spinner } from '../ui/index.jsx';
import SettlementsView from './SettlementsView.jsx';
import TripReport from './TripReport.jsx';

const CATEGORIES = ['food', 'transport', 'stay', 'activity', 'shopping', 'other'];
const CATEGORY_ICONS = { food:'🍽️', transport:'🚗', stay:'🏨', activity:'🎯', shopping:'🛍️', other:'📌' };

export default function ExpensesTab({ trip, members, expenses, session }) {
  const [activeView, setActiveView] = useState('list'); // list | settlements | report
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [filterDay, setFilterDay] = useState('all');

  const dayNumbers = [...new Set(expenses.map(e => e.day_number))].sort((a,b)=>a-b);
  const filteredExpenses = filterDay === 'all' ? expenses : expenses.filter(e => e.day_number === parseInt(filterDay));
  const totalSpent = filteredExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Group expenses by day
  const grouped = filteredExpenses.reduce((acc, exp) => {
    const key = exp.day_number;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {});

  return (
    <div className="flex flex-col pb-28 animate-fade-in">
      {/* Sub-nav */}
      <div className="flex border-b border-slate-100 bg-white sticky top-0 z-10">
        {[['list','💸 Expenses'],['settlements','⚖️ Settle'],['report','📊 Report']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveView(id)}
            className={`flex-1 py-3 text-xs font-bold transition-colors
              ${activeView === id ? 'text-saffron-600 border-b-2 border-saffron-500' : 'text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeView === 'list' && (
        <div className="px-4 py-3">
          {/* Summary card */}
          <div className="card p-4 mb-4 bg-gradient-to-r from-saffron-500 to-orange-500 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/70 text-xs font-semibold">Total Spent</p>
                <p className="font-display font-extrabold text-3xl">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs font-semibold">Per Person avg</p>
                <p className="font-display font-bold text-xl">
                  {members.length > 0 ? formatCurrency(totalSpent / members.length) : '—'}
                </p>
              </div>
            </div>
            {/* Category mini-breakdown */}
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map(cat => {
                const catTotal = expenses.filter(e => e.category === cat).reduce((s,e) => s+parseFloat(e.amount),0);
                if (!catTotal) return null;
                return (
                  <div key={cat} className="flex-shrink-0 bg-white/20 rounded-xl px-2.5 py-1.5 text-center">
                    <div className="text-sm">{CATEGORY_ICONS[cat]}</div>
                    <div className="text-white text-[10px] font-bold">{formatCurrency(catTotal)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day filter */}
          {dayNumbers.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              <button onClick={() => setFilterDay('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                  ${filterDay === 'all' ? 'bg-saffron-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                All Days
              </button>
              {dayNumbers.map(d => (
                <button key={d} onClick={() => setFilterDay(String(d))}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                    ${filterDay === String(d) ? 'bg-saffron-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                  Day {d}
                </button>
              ))}
            </div>
          )}

          {/* Expense list */}
          {Object.keys(grouped).length === 0 ? (
            <EmptyState icon="💸" title="No expenses yet" description="Add the first expense!" />
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).sort(([a],[b]) => parseInt(a)-parseInt(b)).map(([day, exps]) => (
                <div key={day}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Day {day}</span>
                    <span className="text-xs font-bold text-saffron-600">
                      {formatCurrency(exps.reduce((s,e)=>s+parseFloat(e.amount),0))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {exps.map(exp => (
                      <ExpenseCard key={exp.id} exp={exp} members={members} session={session}
                        onEdit={() => setEditExpense(exp)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'settlements' && (
        <SettlementsView tripId={trip?.id} members={members} />
      )}

      {activeView === 'report' && (
        <TripReport tripId={trip?.id} trip={trip} />
      )}

      {/* FAB: Add Expense */}
      {activeView === 'list' && (
        <button
          onClick={() => setShowAddSheet(true)}
          className="fixed bottom-6 right-4 w-14 h-14 bg-saffron-500 text-white rounded-2xl 
                     shadow-lg active:scale-90 transition-all flex items-center justify-center text-2xl z-30"
        >
          +
        </button>
      )}

      {/* Add/Edit Expense Sheet */}
      <ExpenseSheet
        isOpen={showAddSheet || !!editExpense}
        onClose={() => { setShowAddSheet(false); setEditExpense(null); }}
        trip={trip} members={members} session={session}
        editData={editExpense}
      />
    </div>
  );
}

// ── Expense Card ──────────────────────────────────────────────────────────────
function ExpenseCard({ exp, members, session, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const canEdit = session?.nickname === exp.paid_by_nickname || session?.isOrganizer;

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <CategoryIcon category={exp.category} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-800 text-sm truncate">{exp.title}</h4>
            <span className="font-display font-bold text-slate-800 text-base ml-2 flex-shrink-0">
              {formatCurrency(exp.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">Paid by <span className="font-semibold text-slate-600">{exp.paid_by_nickname}</span></span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-400">{exp.split_type === 'equal' ? '÷ Equal' : '⚖️ Manual'}</span>
          </div>
        </div>
        {canEdit && (
          <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200 flex-shrink-0">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      {/* Expand splits */}
      {exp.splits?.length > 0 && (
        <>
          <button onClick={() => setExpanded(!expanded)}
            className="w-full text-[11px] text-ocean-600 font-semibold mt-2 text-center">
            {expanded ? '▲ Hide splits' : `▼ ${exp.splits.length} people split`}
          </button>
          {expanded && (
            <div className="mt-2 bg-slate-50 rounded-xl p-2 space-y-1">
              {exp.splits.map((split, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MemberAvatar nickname={split.nickname} size="sm" />
                    <span className="text-xs text-slate-600">{split.nickname}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">{formatCurrency(split.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Add/Edit Expense Sheet ────────────────────────────────────────────────────
function ExpenseSheet({ isOpen, onClose, trip, members, session, editData }) {
  const [form, setForm] = useState({
    title: '', amount: '', category: 'food', dayNumber: 0,
    splitType: 'equal', note: '', customSplits: {}
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (editData) {
      const customSplits = {};
      editData.splits?.forEach(s => { customSplits[s.nickname] = s.amount; });
      setForm({
        title: editData.title,
        amount: editData.amount,
        category: editData.category,
        dayNumber: editData.day_number,
        splitType: editData.split_type,
        note: editData.note || '',
        customSplits
      });
    } else {
      setForm({ title:'', amount:'', category:'food', dayNumber:0, splitType:'equal', note:'', customSplits:{} });
    }
  }, [editData, isOpen]);

  function updateSplit(nickname, val) {
    setForm(p => ({ ...p, customSplits: { ...p.customSplits, [nickname]: val } }));
  }

  function distributeEqually() {
    if (!form.amount) return;
    const perPerson = (parseFloat(form.amount) / members.length).toFixed(2);
    const splits = {};
    members.forEach(m => { splits[m.nickname] = perPerson; });
    setForm(p => ({ ...p, customSplits: splits }));
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.amount) return toast.error('Title and amount required');
    setLoading(true);
    try {
      let splits = [];
      if (form.splitType === 'equal') {
        const perPerson = parseFloat(form.amount) / members.length;
        splits = members.map(m => ({ nickname: m.nickname, memberId: m.id, amount: Math.round(perPerson * 100) / 100 }));
      } else {
        splits = members.map(m => ({ nickname: m.nickname, memberId: m.id, amount: parseFloat(form.customSplits[m.nickname] || 0) }));
      }

      const payload = {
        tripId: trip.id,
        dayNumber: form.dayNumber,
        title: form.title.trim(),
        amount: parseFloat(form.amount),
        category: form.category,
        paidByNickname: session?.nickname,
        paidByMemberId: session?.memberRowId,
        splitType: form.splitType,
        splits,
        note: form.note,
      };

      if (editData) {
        await expenseAPI.update(editData.id, payload);
        toast.success('Expense updated ✅');
      } else {
        await expenseAPI.add(payload);
        toast.success('Expense added! 💰');
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editData) return;
    setDeleting(true);
    try {
      await expenseAPI.delete(editData.id);
      toast.success('Expense deleted');
      onClose();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const splitTotal = Object.values(form.customSplits).reduce((s, v) => s + parseFloat(v || 0), 0);
  const amountNum = parseFloat(form.amount) || 0;
  const splitDiff = Math.abs(splitTotal - amountNum);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editData ? 'Edit Expense' : 'Add Expense'}>
      <div className="space-y-4 pb-4">
        <div>
          <label className="label">Title *</label>
          <input className="input" placeholder="e.g. Lunch at Hotel" value={form.title}
            onChange={e => setForm(p => ({...p, title: e.target.value}))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" className="input" placeholder="0" value={form.amount}
              onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
          </div>
          <div>
            <label className="label">Day</label>
            <select className="input" value={form.dayNumber}
              onChange={e => setForm(p => ({...p, dayNumber: parseInt(e.target.value)}))}>
              <option value={0}>Day 0 (Pre-trip)</option>
              {Array.from({length: 15}, (_, i) => (
                <option key={i+1} value={i+1}>Day {i+1}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setForm(p => ({...p, category: cat}))}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all
                  ${form.category === cat ? 'bg-saffron-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <span>{CATEGORY_ICONS[cat]}</span> {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Split Type</label>
          <div className="flex gap-2">
            {[['equal','÷ Equal split'],['manual','⚖️ Manual split']].map(([val, label]) => (
              <button key={val} onClick={() => { setForm(p => ({...p, splitType: val})); if(val==='manual') distributeEqually(); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${form.splitType === val ? 'bg-saffron-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.splitType === 'manual' && members.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Split Among Members</label>
              <button onClick={distributeEqually} className="text-xs text-ocean-600 font-semibold">Reset equal</button>
            </div>
            {splitDiff > 0.5 && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">
                Split total ({formatCurrency(splitTotal)}) ≠ Expense ({formatCurrency(amountNum)}) · Diff: {formatCurrency(splitDiff)}
              </div>
            )}
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700 w-24 truncate">{m.nickname}</span>
                  <input type="number" className="input flex-1" placeholder="0"
                    value={form.customSplits[m.nickname] || ''}
                    onChange={e => updateSplit(m.nickname, e.target.value)} />
                  <span className="text-xs text-slate-400">₹</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Note (optional)</label>
          <input className="input" placeholder="Any note..." value={form.note}
            onChange={e => setForm(p => ({...p, note: e.target.value}))} />
        </div>

        <div className="flex gap-3 pt-2">
          {editData && (
            <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-shrink-0">
              {deleting ? '...' : '🗑️'}
            </button>
          )}
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <Spinner size="sm" color="white" /> : null}
            {loading ? 'Saving...' : editData ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
