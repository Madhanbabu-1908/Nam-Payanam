import { useState } from 'react';
import { expenseAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { Spinner, formatCurrency } from '../ui/index.jsx';

const QUICK_CATS = [
  { id:'food',      icon:'🍽️', label:'Food',      ta:'உணவு'     },
  { id:'fuel',      icon:'⛽', label:'Fuel',      ta:'எரிபொருள்' },
  { id:'stay',      icon:'🏨', label:'Stay',      ta:'தங்குமிடம்' },
  { id:'activity',  icon:'🎯', label:'Activity',  ta:'செயல்பாடு' },
  { id:'transport', icon:'🚗', label:'Travel',    ta:'பயணம்'     },
  { id:'shopping',  icon:'🛍️', label:'Shopping',  ta:'வாங்குதல்' },
  { id:'medical',   icon:'💊', label:'Medical',   ta:'மருத்துவம்' },
  { id:'other',     icon:'📌', label:'Other',     ta:'மற்றவை'    },
];

export default function QuickExpense({ trip, members, session, lang='en', onAdded }) {
  const [amount, setAmount]     = useState('');
  const [cat, setCat]           = useState('food');
  const [paidBy, setPaidBy]     = useState(session?.nickname || '');
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (!paidBy) return toast.error('Who paid?');
    setSaving(true);
    try {
      const splits = members.map(m => ({
        nickname: m.nickname, memberId: m.id,
        amount: Math.round((amt / members.length) * 100) / 100,
      }));
      await expenseAPI.add({
        tripId: trip.id,
        dayNumber: 0,
        title: note.trim() || QUICK_CATS.find(c=>c.id===cat)?.label || cat,
        amount: amt,
        category: cat,
        paidByNickname: paidBy,
        paidByMemberId: members.find(m=>m.nickname===paidBy)?.id,
        splitType: 'equal',
        splits,
        note: note,
      });

      // Overspend check
      const budget = trip?.ai_plan?.estimatedCost?.perPerson * members.length;
      if (budget) {
        const allExp = window.__npTotalSpent || 0;
        if ((allExp + amt) > budget * 1.2) {
          toast('⚠️ You\'re 20% over budget!', { icon: '⚠️', style: { background:'#fef3c7', color:'#92400e' } });
        }
      }

      toast.success(`✅ ₹${amt} added · ₹${Math.round(amt/members.length)}/person`);
      setAmount(''); setNote(''); setCat('food');
      onAdded?.();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  const perPerson = amount && members.length ? Math.round(parseFloat(amount)/members.length) : null;

  return (
    <div className="card p-4 space-y-4">
      {/* Amount row */}
      <div>
        <label className="label">{lang==='ta'?'தொகை (₹)':'Amount (₹)'}</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₹</span>
          <input
            type="number" inputMode="numeric"
            className="input pl-9 text-xl font-black"
            placeholder="0"
            value={amount}
            onChange={e=>setAmount(e.target.value)}
            onKeyDown={e => e.key==='Enter' && submit()}
          />
        </div>
        {perPerson && (
          <p className="text-xs text-indigo-500 font-bold mt-1.5">
            → {formatCurrency(perPerson)} {lang==='ta'?'ஒவ்வொருவருக்கும்':'per person'}
            {members.length > 0 && ` (÷${members.length})`}
          </p>
        )}
      </div>

      {/* Category row */}
      <div>
        <label className="label">{lang==='ta'?'வகை':'Category'}</label>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {QUICK_CATS.map(c=>(
            <button key={c.id} onClick={()=>setCat(c.id)}
              className={`quick-cat flex-shrink-0 ${cat===c.id?'quick-cat-active':'quick-cat-idle'}`}>
              <span className="text-lg">{c.icon}</span>
              <span className="text-[10px]">{lang==='ta'?c.ta:c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Paid by */}
      <div>
        <label className="label">{lang==='ta'?'செலுத்தியவர்':'Paid by'}</label>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {members.map(m=>(
            <button key={m.id} onClick={()=>setPaidBy(m.nickname)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all
                ${paidBy===m.nickname?'border-indigo-500 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-500'}`}>
              {m.nickname[0].toUpperCase()} {m.nickname}
              {m.is_organizer && ' ★'}
            </button>
          ))}
        </div>
      </div>

      {/* Optional note toggle */}
      <button onClick={()=>setExpanded(!expanded)} className="text-xs text-slate-400 font-semibold text-left">
        {expanded?'▲ Hide note':'▼ Add note (optional)'}
      </button>
      {expanded && (
        <input className="input" placeholder={lang==='ta'?'குறிப்பு...':'Note (e.g. dinner at hotel)'}
          value={note} onChange={e=>setNote(e.target.value)}/>
      )}

      {/* Submit */}
      <button onClick={submit} disabled={saving||!amount} className="btn-primary w-full">
        {saving ? <Spinner size="sm" color="white"/> : '💰'}
        {saving
          ? (lang==='ta'?'சேமிக்கிறது...':'Saving...')
          : (lang==='ta'?'செலவு சேர்':'Add Expense')}
      </button>
    </div>
  );
}
