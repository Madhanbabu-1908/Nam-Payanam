import { useState, useEffect } from 'react';
import { tripAPI, expenseAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { Spinner, BottomSheet, formatCurrency } from '../ui/index.jsx';

const BREAK_CATEGORIES = [
  { id: 'chai', icon: '☕', label: 'Chai / Tea' },
  { id: 'food', icon: '🍽️', label: 'Food Stop' },
  { id: 'fuel', icon: '⛽', label: 'Fuel Stop' },
  { id: 'scenic', icon: '🌄', label: 'Scenic View' },
  { id: 'rest', icon: '😴', label: 'Rest Break' },
  { id: 'shopping', icon: '🛍️', label: 'Shopping' },
  { id: 'emergency', icon: '⚠️', label: 'Emergency' },
  { id: 'other', icon: '📌', label: 'Other' },
];

export default function BreakStopSheet({ isOpen, onClose, trip, session, days, onAdded }) {
  const [step, setStep] = useState(0); // 0: break details, 1: add expense?
  const [saving, setS] = useState(false);
  const [breakId, setBreakId] = useState(null);

  const [form, setForm] = useState({
    reason: '',
    category: 'chai',
    location: '',
    activities: '',
    durationMinutes: '',
    dayNumber: 1,
  });

  const [expForm, setExpForm] = useState({
    addExpense: false,
    title: '',
    amount: '',
    category: 'food',
    splitType: 'equal',
  });

  useEffect(() => {
    if (!isOpen) { setStep(0); setBreakId(null); setForm({ reason:'', category:'chai', location:'', activities:'', durationMinutes:'', dayNumber: days?.[0]?.day_number || 1 }); setExpForm({ addExpense:false, title:'', amount:'', category:'food', splitType:'equal' }); }
    else if (days?.length) setForm(p => ({ ...p, dayNumber: days.find(d => !d.is_reached)?.day_number || days[days.length-1]?.day_number || 1 }));
  }, [isOpen, days]);

  async function saveBreak() {
    const cat = BREAK_CATEGORIES.find(c => c.id === form.category);
    const reason = form.reason.trim() || `${cat?.label} Break`;
    if (!reason) return toast.error('Add a reason');
    setS(true);
    try {
      const res = await tripAPI.addBreak({
        tripId: trip.id,
        dayNumber: form.dayNumber,
        addedByNickname: session?.nickname,
        reason,
        location: form.location,
        activities: form.activities,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null,
      });
      setBreakId(res.breakStop?.id);
      setStep(1);
    } catch (err) { toast.error(err.message); }
    finally { setS(false); }
  }

  async function saveWithExpense() {
    if (expForm.addExpense) {
      if (!expForm.title.trim() || !expForm.amount) return toast.error('Enter expense title and amount');
      try {
        const members_res = await fetch(`${import.meta.env.VITE_API_URL}/trips/${trip.trip_code}`);
        // Just use what we have
        await expenseAPI.add({
          tripId: trip.id,
          dayNumber: form.dayNumber,
          title: expForm.title.trim(),
          amount: parseFloat(expForm.amount),
          category: expForm.category,
          paidByNickname: session?.nickname,
          paidByMemberId: session?.memberRowId,
          splitType: expForm.splitType,
          splits: [],
          note: `[break] ${form.reason || 'Break stop'}`,
        });
        toast.success('Break & expense logged! ☕💰');
      } catch (err) { toast.error('Break saved but expense failed: ' + err.message); }
    } else {
      toast.success('Break logged! ☕');
    }
    onAdded();
    onClose();
  }

  const EXPENSE_CATEGORIES = [
    { id: 'food', icon: '🍽️', label: 'Food' },
    { id: 'transport', icon: '⛽', label: 'Fuel' },
    { id: 'activity', icon: '🎯', label: 'Activity' },
    { id: 'shopping', icon: '🛍️', label: 'Shopping' },
    { id: 'other', icon: '📌', label: 'Other' },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={step === 0 ? '☕ Log a Break Stop' : '💰 Add Break Expenses?'}>
      {step === 0 && (
        <div className="space-y-4 pb-6">
          {/* Category quick select */}
          <div>
            <label className="label">Break Type</label>
            <div className="grid grid-cols-4 gap-2">
              {BREAK_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => { setForm(p => ({ ...p, category: c.id })); if (!form.reason) setForm(p => ({ ...p, category: c.id, reason: c.label })); }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all border-2
                    ${form.category === c.id ? 'bg-amber-500 text-white border-amber-500 shadow' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-[10px] leading-tight text-center">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Reason / Note *</label>
            <input className="input" placeholder="e.g. Stopped for chai at Vellore bypass"
              value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location (optional)</label>
              <input className="input" placeholder="e.g. Vellore bypass"
                value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Duration (mins)</label>
              <input type="number" className="input" placeholder="e.g. 20"
                value={form.durationMinutes} onChange={e => setForm(p => ({ ...p, durationMinutes: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Activities (optional)</label>
            <input className="input" placeholder="e.g. Photos, local snacks, short walk"
              value={form.activities} onChange={e => setForm(p => ({ ...p, activities: e.target.value }))} />
          </div>

          {days?.length > 1 && (
            <div>
              <label className="label">During Day</label>
              <select className="input" value={form.dayNumber} onChange={e => setForm(p => ({ ...p, dayNumber: parseInt(e.target.value) }))}>
                {days.map(d => <option key={d.day_number} value={d.day_number}>Day {d.day_number}: {d.title}</option>)}
              </select>
            </div>
          )}

          <button onClick={saveBreak} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-extrabold">
            {saving ? <Spinner size="sm" color="white" /> : '☕'}
            {saving ? 'Saving...' : 'Save Break Stop'}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 pb-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-sm font-bold text-emerald-700">✅ Break logged successfully!</p>
            <p className="text-xs text-emerald-600 mt-0.5">Did you spend anything at this stop?</p>
          </div>

          {/* Toggle add expense */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="font-bold text-slate-800 text-sm">Add Expense</div>
              <div className="text-xs text-slate-500 mt-0.5">Log what you spent here</div>
            </div>
            <button
              onClick={() => setExpForm(p => ({ ...p, addExpense: !p.addExpense }))}
              className={`w-12 h-7 rounded-full transition-all ${expForm.addExpense ? 'bg-[#FF6B35]' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow mx-1 transition-all ${expForm.addExpense ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {expForm.addExpense && (
            <div className="space-y-3 animate-slide-down">
              <div>
                <label className="label">What did you buy? *</label>
                <input className="input" placeholder="e.g. Chai and snacks"
                  value={expForm.title} onChange={e => setExpForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input type="number" className="input" placeholder="0"
                    value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Split</label>
                  <select className="input" value={expForm.splitType} onChange={e => setExpForm(p => ({ ...p, splitType: e.target.value }))}>
                    <option value="equal">Equal Split</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {EXPENSE_CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setExpForm(p => ({ ...p, category: c.id }))}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all
                        ${expForm.category === c.id ? 'bg-[#FF6B35] text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <span>{c.icon}</span>{c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { toast.success('Break saved ☕'); onAdded(); onClose(); }} className="btn-secondary flex-1">
              Skip Expense
            </button>
            <button onClick={saveWithExpense} className="btn-primary flex-1 font-extrabold">
              {expForm.addExpense ? '💰 Save Both' : '✅ Done'}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
