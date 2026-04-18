import { useState } from 'react';
import { breakAPI, expenseAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { BottomSheet, MemberAvatar, EmptyState, Spinner, formatCurrency, formatTime, formatDuration, BreakTypeIcon, CategoryIcon } from '../ui/index.jsx';

const BREAK_TYPES = [
  { value:'food',       label:'Food Stop',     icon:'🍽️' },
  { value:'fuel',       label:'Fuel Stop',     icon:'⛽' },
  { value:'rest',       label:'Rest Stop',     icon:'☕' },
  { value:'attraction', label:'Attraction',    icon:'🎯' },
  { value:'hotel',      label:'Hotel Check-in',icon:'🏨' },
  { value:'medical',    label:'Medical Stop',  icon:'💊' },
  { value:'viewpoint',  label:'Viewpoint',     icon:'🏔️' },
  { value:'shopping',   label:'Shopping',      icon:'🛍️' },
  { value:'other',      label:'Other',         icon:'📍' },
];

export default function BreaksTab({ trip, breaks, expenses, members, session }) {
  const [showAdd, setShowAdd]     = useState(false);
  const [editBreak, setEditBreak] = useState(null);
  const [filterDay, setFilterDay] = useState('all');

  // Get unique day numbers from breaks for filtering
  const dayNums = [...new Set(breaks.map(b => b.day_number))].sort((a,b) => a-b);

  // Filter breaks by selected day
  const filtered = filterDay==='all' ? breaks : breaks.filter(b => b.day_number===parseInt(filterDay));

  // Calculate total break time
  const totalBreakTime = breaks.reduce((s,b) => s+(b.duration_minutes||0), 0);

  return (
    <div className="flex flex-col pb-28 animate-fade-in">
      {/* Summary Card */}
      <div className="mx-4 mt-4 card-indigo rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase">Total Breaks</p>
            <p className="font-display font-black text-white text-3xl mt-1">{breaks.length}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs font-bold uppercase">Break Time</p>
            <p className="font-display font-black text-saffron-400 text-3xl mt-1">{formatDuration(totalBreakTime)||'—'}</p>
          </div>
        </div>
        {/* Type breakdown */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {BREAK_TYPES.filter(t => breaks.some(b=>b.break_type===t.value)).map(t => (
            <div key={t.value} className="flex-shrink-0 bg-white/15 rounded-xl px-2.5 py-1.5 text-center">
              <div className="text-base">{t.icon}</div>              <div className="text-white text-[10px] font-bold mt-0.5">{breaks.filter(b=>b.break_type===t.value).length}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Day filter chips */}
      {dayNums.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto pb-1">
          <button onClick={() => setFilterDay('all')} className={`flex-shrink-0 day-chip ${filterDay==='all'?'day-chip-active':'day-chip-idle'}`}>All</button>
          {dayNums.map(d => (
            <button key={d} onClick={() => setFilterDay(String(d))} className={`flex-shrink-0 day-chip ${filterDay===String(d)?'day-chip-active':'day-chip-idle'}`}>Day {d}</button>
          ))}
        </div>
      )}

      {/* Break List */}
      <div className="px-4 pt-3 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon="☕" title="No breaks logged" description="Any member can log a food, fuel or rest stop here"/>
        ) : (
          filtered.map(b => (
            <BreakCard 
              key={b.id} 
              breakEntry={b}
              expenses={expenses.filter(e => e.break_id===b.id)}
              session={session} 
              trip={trip} 
              members={members}
              onEdit={() => setEditBreak(b)}
              onDelete={(id) => handleDeleteBreak(id)} // 👈 NEW: Pass delete handler
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-saffron-500 rounded-2xl shadow-saffron flex items-center justify-center text-2xl text-white active:scale-90 transition-all z-30">
        +
      </button>

      {/* Break Sheet - Now passes 'days' prop for dynamic day selection */}
      <BreakSheet 
        isOpen={showAdd||!!editBreak} 
        onClose={() => { setShowAdd(false); setEditBreak(null); }}
        trip={trip} 
        members={members} 
        session={session} 
        editData={editBreak}        days={trip?.itinerary || []} // 👈 PASS DAYS FROM TRIP ITINERARY
      />
    </div>
  );
}

// Helper function to delete break (can be moved to parent if needed)
async function handleDeleteBreak(breakId) {
  try {
    await breakAPI.delete(breakId); // You MUST implement this in api.js
    toast.success('Break deleted!');
    window.location.reload(); // Temporary refresh — better to use callback/state lift
  } catch {
    toast.error('Failed to delete break.');
  }
}

function BreakCard({ breakEntry: b, expenses, session, trip, members, onEdit, onDelete }) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [showExpense, setShowExpense]  = useState(false);
  const canEdit = session?.nickname === b.added_by_nickname || session?.isOrganizer;
  const typeInfo = BREAK_TYPES.find(t=>t.value===b.break_type) || BREAK_TYPES[8];
  const totalExp = expenses.reduce((s,e) => s+parseFloat(e.amount), 0);

  async function checkout() {
    setCheckingOut(true);
    try {
      await breakAPI.checkout(b.id);
      toast.success('Checked out!');
    } catch { toast.error('Failed'); }
    finally { setCheckingOut(false); }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0
          ${b.break_type==='food'?'bg-orange-100':b.break_type==='fuel'?'bg-red-100':b.break_type==='rest'?'bg-sky-100':'bg-indigo-100'}`}>
          {typeInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className="font-display font-bold text-slate-800 text-sm">{b.stop_name}</h4>
            {canEdit && (
              <div className="flex gap-2">
                {/* Edit Button */}
                <button onClick={onEdit} className="btn-icon bg-slate-100 w-8 h-8 flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>                </button>
                {/* DELETE BUTTON - BUG FIX #1 */}
                <button 
                  onClick={() => {
                    if (window.confirm('Delete this break?')) {
                      onDelete(b.id);
                    }
                  }} 
                  className="btn-icon bg-red-50 hover:bg-red-100 w-8 h-8 flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="badge badge-slate text-[10px]">{typeInfo.label}</span>
            <span className="text-[10px] text-slate-400">by {b.added_by_nickname}</span>
            {b.day_number > 0 && <span className="badge badge-indigo text-[10px]">Day {b.day_number}</span>}
          </div>
        </div>
      </div>

      {/* Times */}
      <div className="flex gap-3 bg-slate-50 rounded-xl p-2.5">
        <div className="flex-1 text-center">
          <div className="text-[10px] text-slate-400 font-bold">CHECK-IN</div>
          <div className="text-xs font-black text-slate-700 mt-0.5">{formatTime(b.checkin_time)||'—'}</div>
        </div>
        <div className="w-px bg-slate-200"/>
        <div className="flex-1 text-center">
          <div className="text-[10px] text-slate-400 font-bold">CHECK-OUT</div>
          <div className="text-xs font-black text-slate-700 mt-0.5">{b.checkout_time ? formatTime(b.checkout_time) : '—'}</div>
        </div>
        <div className="w-px bg-slate-200"/>
        <div className="flex-1 text-center">
          <div className="text-[10px] text-slate-400 font-bold">DURATION</div>
          <div className="text-xs font-black text-indigo-600 mt-0.5">{formatDuration(b.duration_minutes)||'Active'}</div>
        </div>
      </div>

      {b.description && <p className="text-xs text-slate-500 leading-relaxed">{b.description}</p>}

      {/* Checkout button */}
      {!b.checkout_time && canEdit && (
        <button onClick={checkout} disabled={checkingOut}
          className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold py-2.5 rounded-xl text-sm active:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
          {checkingOut ? <Spinner size="sm" color="indigo"/> : '✅'} Check Out Now        </button>
      )}

      {/* Expenses at this break */}
      {expenses.length > 0 && (
        <div>
          <button onClick={() => setShowExpense(!showExpense)}
            className="flex items-center justify-between w-full text-xs font-bold text-saffron-600">
            <span>💸 Expenses at this stop ({expenses.length})</span>
            <span className="font-black">{formatCurrency(totalExp)} {showExpense?'▲':'▼'}</span>
          </button>
          {showExpense && (
            <div className="mt-2 space-y-1">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-slate-600">{e.title} <span className="text-slate-400">(by {e.paid_by_nickname})</span></span>
                  <span className="text-xs font-black text-slate-700">{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BreakSheet({ isOpen, onClose, trip, members, session, editData, days = [] }) { // 👈 ACCEPT DAYS PROP
  const [form, setForm] = useState({ 
    stopName:'', 
    breakType:'rest', 
    customType:'', 
    description:'', 
    checkinTime:'', 
    checkoutTime:'', 
    dayNumber: days?.[0]?.day_number || 0 // 👈 DEFAULT TO FIRST DAY OF TRIP
  });
  const [saving, setSaving] = useState(false);

  const upd = (k,v) => setForm(p => ({...p,[k]:v}));

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setForm({ 
        stopName:'', 
        breakType:'rest', 
        customType:'', 
        description:'', 
        checkinTime:'',         checkoutTime:'', 
        dayNumber: days?.[0]?.day_number || 0 
      });
    } else if (editData) {
      setForm({
        stopName: editData.stop_name,
        breakType: editData.break_type,
        customType: editData.custom_type || '',
        description: editData.description || '',
        checkinTime: editData.checkin_time ? editData.checkin_time.slice(0,16) : '',
        checkoutTime: editData.checkout_time ? editData.checkout_time.slice(0,16) : '',
        dayNumber: editData.day_number
      });
    } else {
      setForm(p => ({...p, dayNumber: days?.[0]?.day_number || 0}));
    }
  }, [isOpen, editData, days]);

  async function save() {
    if (!form.stopName.trim()) return toast.error('Stop name required');
    setSaving(true);
    try {
      const payload = {
        tripId: trip.id, 
        dayNumber: form.dayNumber, 
        addedByNickname: session?.nickname,
        stopName: form.stopName.trim(), 
        breakType: form.breakType,
        customType: form.customType, 
        description: form.description,
        checkinTime: form.checkinTime || new Date().toISOString(),
        checkoutTime: form.checkoutTime || null,
      };
      if (editData) { 
        await breakAPI.update(editData.id, payload); 
        toast.success('Break updated!'); 
      } else { 
        await breakAPI.add(payload); 
        toast.success('Break logged! ☕'); 
      }
      onClose();
    } catch (err) { 
      toast.error(err.message); 
    } finally { 
      setSaving(false); 
    }
  }

  if (!isOpen) return null;
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editData ? 'Edit Break' : 'Log a Break'}>
      <div className="space-y-4 pb-4">
        <div>
          <label className="label">Stop Name *</label>
          <input className="input" placeholder="e.g. Dhaba near Krishnagiri" value={form.stopName} onChange={e=>upd('stopName',e.target.value)}/>
        </div>

        <div>
          <label className="label">Break Type</label>
          <div className="grid grid-cols-3 gap-2">
            {BREAK_TYPES.map(t => (
              <button key={t.value} onClick={() => upd('breakType',t.value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold border transition-all
                ${form.breakType===t.value?'bg-indigo-600 text-white border-indigo-600':'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <span className="text-lg">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {form.breakType==='other' && (
          <div>
            <label className="label">Custom Type</label>
            <input className="input" placeholder="Describe the stop type..." value={form.customType} onChange={e=>upd('customType',e.target.value)}/>
          </div>
        )}

        {/* DYNAMIC DAY SELECTION - BUG FIX #2 */}
        <div>
          <label className="label">Day</label>
          <select className="input" value={form.dayNumber} onChange={e=>upd('dayNumber',parseInt(e.target.value))}>
            <option value={0}>Day 0 (Pre-trip)</option>
            {(days || []).map(d => (
              <option key={d.day_number} value={d.day_number}>
                Day {d.day_number}: {d.title || `Day ${d.day_number}`}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Check-in Time</label>
            <input type="datetime-local" className="input text-sm" value={form.checkinTime} onChange={e=>upd('checkinTime',e.target.value)}/>
          </div>
          <div>
            <label className="label">Check-out Time</label>
            <input type="datetime-local" className="input text-sm" value={form.checkoutTime} onChange={e=>upd('checkoutTime',e.target.value)}/>
          </div>        </div>

        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input resize-none text-sm" rows={2} placeholder="Notes about this stop..." value={form.description} onChange={e=>upd('description',e.target.value)}/>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full py-4">
          {saving ? <Spinner size="sm" color="white"/> : '☕'} {saving?'Saving...':editData?'Update Break':'Log Break'}
        </button>
      </div>
    </BottomSheet>
  );
        }
