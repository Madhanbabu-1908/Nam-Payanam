import { useState } from 'react';
import { tripAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, EmptyState, BottomSheet, Spinner } from '../ui/index.jsx';

const STOP_ICONS  = { start:'🟢', stop:'📍', stay:'🏨', attraction:'🎯', food:'🍽️', fuel:'⛽', rest:'☕', end:'🔴', default:'📍' };
const STOP_TYPES  = ['start','stop','stay','attraction','food','fuel','rest','end'];

export default function ItineraryTab({ trip, days, members, progress, session, activeDay, setActiveDay, onStatusChange, onRefresh, onDeleteTrip, lang='en' }) {
  const [updating, setUpdating]       = useState(false);
  const [editStop, setEditStop]       = useState(null);  // { dayIdx, stopIdx, stop }
  const [addStop, setAddStop]         = useState(null);  // { dayIdx }
  const [savingEdit, setSavingEdit]   = useState(false);

  const isOrg     = session?.isOrganizer;
  const currentDay = days?.find(d => d.day_number === activeDay) || days?.[0];

  const T = {
    start:      lang==='ta' ? '🚀 பயணம் தொடங்கு'            : '🚀 Start Trip',
    end:        lang==='ta' ? 'பயணம் முடிவடைந்தது'           : 'End Trip',
    live:       lang==='ta' ? 'பயணம் நடைபெறுகிறது'           : 'Trip is Live',
    completed:  lang==='ta' ? '✅ பயணம் முடிந்தது!'           : '✅ Trip Completed!',
    mark:       lang==='ta' ? 'இந்த நாளை அடைந்தோம் ✅'        : 'Mark Day as Reached ✅',
    addStop:    lang==='ta' ? '+ நிறுத்தம் சேர்'              : '+ Add Stop',
    editStop:   lang==='ta' ? 'நிறுத்தம் திருத்து'            : 'Edit Stop',
    saveStop:   lang==='ta' ? 'சேமி'                          : 'Save',
    deleteStop: lang==='ta' ? 'நிறுத்தம் நீக்கு'              : 'Delete Stop',
  };

  async function markReached(dayNum) {
    if (!isOrg) return toast.error('Only organiser can update progress');
    setUpdating(true);
    try {
      await tripAPI.updateProgress(trip.id, { currentStopIndex: (progress?.current_stop_index||0)+1, dayReached: dayNum });
      toast.success('✅ Progress updated!');
      onRefresh();
    } catch { toast.error('Failed to update'); }
    finally { setUpdating(false); }
  }

  async function saveStopEdit() {
    if (!editStop) return;
    setSavingEdit(true);
    try {
      const updatedDays = days.map(d => {
        if (d.day_number !== editStop.dayNum) return d;
        const stops = [...(d.stops||[])];
        if (editStop.stopIdx === -1) {
          stops.push(editStop.stop);
        } else {
          stops[editStop.stopIdx] = editStop.stop;
        }
        return { ...d, stops };
      });
      const day = updatedDays.find(d => d.day_number === editStop.dayNum);
      await tripAPI.updateProgress(trip.id, { updatedDay: { id: day.id, stops: day.stops } });
      toast.success(editStop.stopIdx===-1 ? 'Stop added! 📍' : 'Stop updated! ✅');
      setEditStop(null);
      onRefresh();
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setSavingEdit(false); }
  }

  async function deleteStopFromDay(dayNum, stopIdx) {
    try {
      const day = days.find(d => d.day_number === dayNum);
      const stops = day.stops.filter((_,i) => i !== stopIdx);
      await tripAPI.updateProgress(trip.id, { updatedDay: { id: day.id, stops } });
      toast.success('Stop removed');
      setEditStop(null);
      onRefresh();
    } catch (err) { toast.error('Failed: ' + err.message); }
  }

  if (!days?.length) return <EmptyState icon="📅" title="No itinerary" description="Trip plan is loading"/>;

  return (
    <div className="flex flex-col pb-32 animate-fade-in">

      {/* Organiser status controls */}
      {isOrg && trip?.status === 'planning' && (
        <div className="mx-4 mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
          <p className="text-sm font-bold text-indigo-800">{lang==='ta'?'பயணம் தொடங்க தயாரா?':'Ready to start the trip?'}</p>
          <button onClick={() => onStatusChange('active')} className="btn-indigo w-full">{T.start}</button>
        </div>
      )}
      {isOrg && trip?.status === 'active' && (
        <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="live-dot"/><span className="text-sm font-bold text-emerald-700">{T.live}</span></div>
          <button onClick={() => onStatusChange('completed')} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold active:scale-95">{T.end}</button>
        </div>
      )}
      {trip?.status === 'completed' && (
        <div className="mx-4 mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-center">
          <span className="text-sm font-bold text-indigo-700">{T.completed}</span>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {days.map(day => (
          <button key={day.day_number} onClick={() => setActiveDay(day.day_number)}
            className={`day-chip ${day.is_reached?'day-chip-done':day.day_number===activeDay?'day-chip-active':'day-chip-idle'}`}>
            {day.is_reached ? '✅' : `${lang==='ta'?'நாள்':'Day'} ${day.day_number}`}
          </button>
        ))}
      </div>

      {currentDay && (
        <div className="px-4 space-y-3">
          {/* Day header */}
          <div className="card p-4 border-l-4 border-l-indigo-500">
            <div className="flex items-start justify-between">
              <div>
                <div className="badge badge-indigo mb-1.5">{lang==='ta'?'நாள்':'Day'} {currentDay.day_number}</div>
                <h2 className="font-display font-bold text-slate-900 text-lg">{currentDay.title}</h2>
                {currentDay.date && <p className="text-xs text-slate-400 mt-1">{formatDate(currentDay.date)}</p>}
              </div>
              {currentDay.is_reached && <span className="text-3xl">✅</span>}
            </div>
            {currentDay.weather_data && (
              <div className="mt-3 flex items-center gap-3 bg-sky-50 rounded-xl p-2.5">
                <span className="text-2xl">{currentDay.weather_data.icon}</span>
                <div>
                  <p className="text-xs font-bold text-sky-700">{currentDay.weather_data.description}</p>
                  <p className="text-xs text-sky-600">{currentDay.weather_data.minTemp}° – {currentDay.weather_data.maxTemp}°C</p>
                </div>
              </div>
            )}
            {currentDay.notes && <p className="text-sm text-slate-500 mt-3 border-t border-slate-100 pt-3">{currentDay.notes}</p>}
          </div>

          {/* Stops timeline — editable */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-display font-bold text-slate-700 text-sm">
                {lang==='ta'?'இன்றைய நிறுத்தங்கள்':"Today's Stops"}
              </h3>
              {isOrg && (
                <button onClick={() => setEditStop({ dayNum: currentDay.day_number, stopIdx: -1, stop: { name:'', type:'stop', duration:'1 hour', description:'', estimatedCost:0 } })}
                  className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg active:scale-95">
                  {T.addStop}
                </button>
              )}
            </div>
            <div className="space-y-0">
              {(currentDay.stops||[]).map((stop, i) => (
                <StopCard key={i} stop={stop} isLast={i===(currentDay.stops||[]).length-1}
                  isOrg={isOrg}
                  onEdit={() => setEditStop({ dayNum: currentDay.day_number, stopIdx: i, stop: { ...stop } })}
                />
              ))}
              {(!currentDay.stops||currentDay.stops.length===0) && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  {lang==='ta'?'நிறுத்தங்கள் இல்லை':'No stops added yet'}
                  {isOrg && <span className="block text-xs mt-1 text-indigo-400">Tap + to add stops</span>}
                </div>
              )}
            </div>
          </div>

          {/* Day budget */}
          {trip?.ai_plan?.days?.find(d=>d.dayNumber===currentDay.day_number) && (
            <DayBudgetCard aiDay={trip.ai_plan.days.find(d=>d.dayNumber===currentDay.day_number)}/>
          )}

          {/* Mark reached */}
          {isOrg && trip?.status==='active' && !currentDay.is_reached && (
            <button onClick={() => markReached(currentDay.day_number)} disabled={updating} className="btn-indigo w-full">
              {updating ? <Spinner size="sm" color="white"/> : '📍'} {T.mark}
            </button>
          )}
        </div>
      )}

      {/* Trip overview + fuel card */}
      <div className="px-4 mt-4 space-y-3">
        {trip?.ai_plan && <TripOverviewCard plan={trip.ai_plan} lang={lang}/>}
        {trip?.fuel_data && trip?.travel_mode !== 'public' && (
          <FuelCard data={trip.fuel_data} groupSize={trip.group_size} lang={lang}/>
        )}
      </div>

      {/* Edit/Add stop sheet */}
      <BottomSheet isOpen={!!editStop} onClose={() => setEditStop(null)}
        title={editStop?.stopIdx===-1 ? T.addStop : T.editStop}>
        {editStop && (
          <div className="space-y-4 pb-4">
            <div>
              <label className="label">{lang==='ta'?'இடம்':'Stop Name'}</label>
              <input className="input" placeholder="e.g. Mettupalayam"
                value={editStop.stop.name}
                onChange={e => setEditStop(p => ({...p, stop:{...p.stop, name:e.target.value}}))}/>
            </div>
            <div>
              <label className="label">{lang==='ta'?'வகை':'Type'}</label>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {STOP_TYPES.map(t => (
                  <button key={t} onClick={() => setEditStop(p=>({...p,stop:{...p.stop,type:t}}))}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all
                      ${editStop.stop.type===t?'border-indigo-500 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-500'}`}>
                    {STOP_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{lang==='ta'?'நேரம்':'Duration'}</label>
                <input className="input" placeholder="e.g. 1 hour"
                  value={editStop.stop.duration||''}
                  onChange={e => setEditStop(p=>({...p,stop:{...p.stop,duration:e.target.value}}))}/>
              </div>
              <div>
                <label className="label">{lang==='ta'?'செலவு (₹)':'Est. Cost (₹)'}</label>
                <input type="number" className="input"
                  value={editStop.stop.estimatedCost||0}
                  onChange={e => setEditStop(p=>({...p,stop:{...p.stop,estimatedCost:parseFloat(e.target.value)||0}}))}/>
              </div>
            </div>
            <div>
              <label className="label">{lang==='ta'?'விளக்கம்':'Description'}</label>
              <textarea className="input resize-none" rows={2}
                value={editStop.stop.description||''}
                onChange={e => setEditStop(p=>({...p,stop:{...p.stop,description:e.target.value}}))}/>
            </div>
            <div className="flex gap-3">
              {editStop.stopIdx !== -1 && (
                <button onClick={() => deleteStopFromDay(editStop.dayNum, editStop.stopIdx)}
                  className="btn-danger px-4">{T.deleteStop}</button>
              )}
              <button onClick={saveStopEdit} disabled={savingEdit} className="btn-indigo flex-1">
                {savingEdit ? <Spinner size="sm" color="white"/> : null} {T.saveStop}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function StopCard({ stop, isLast, isOrg, onEdit }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center w-9 flex-shrink-0 pt-1">
        <div className="w-9 h-9 rounded-xl bg-white border-2 border-indigo-200 flex items-center justify-center text-base shadow-sm z-10">
          {STOP_ICONS[stop.type]||STOP_ICONS.default}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-indigo-100 mt-1 min-h-6"/>}
      </div>
      <div className="flex-1 card p-3 mb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-display font-bold text-slate-800 text-sm">{stop.name}</h4>
            {stop.duration && <span className="text-xs text-slate-400">⏱ {stop.duration}</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {stop.estimatedCost > 0 && <span className="text-xs font-black text-saffron-600">{formatCurrency(stop.estimatedCost)}</span>}
            {isOrg && (
              <button onClick={onEdit} className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center active:bg-slate-200">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        {stop.description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{stop.description}</p>}
        {stop.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {stop.amenities.slice(0,3).map((a,i) => <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{a}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function DayBudgetCard({ aiDay }) {
  return (
    <div className="card p-4 border-l-4 border-l-saffron-400">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 text-sm">Day Budget</span>
        <span className="font-display font-black text-saffron-600 text-lg">{formatCurrency(aiDay.dailyBudgetPerPerson||aiDay.dailyBudget)}<span className="text-xs font-normal text-slate-400">/person</span></span>
      </div>
      {aiDay.drivingDistanceKm && <p className="text-xs text-slate-400 mt-1">🚗 {aiDay.drivingDistanceKm}km · {aiDay.drivingDuration}</p>}
      {aiDay.notes && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{aiDay.notes}</p>}
    </div>
  );
}

function FuelCard({ data, groupSize, lang='en' }) {
  return (
    <div className="card p-4 border-l-4 border-l-amber-400">
      <h3 className="font-display font-bold text-slate-700 mb-3 flex items-center gap-2">
        ⛽ {lang==='ta'?'எரிபொருள் மதிப்பீடு':'Fuel Estimate'}
      </h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-amber-50 rounded-xl p-2.5"><div className="font-black text-amber-700">{data.litres?.toFixed(1)}L</div><div className="text-[10px] text-slate-400">{lang==='ta'?'தேவை':'Needed'}</div></div>
        <div className="bg-amber-50 rounded-xl p-2.5"><div className="font-black text-amber-700">{formatCurrency(data.cost)}</div><div className="text-[10px] text-slate-400">{lang==='ta'?'மொத்தம்':'Total'}</div></div>
        <div className="bg-amber-50 rounded-xl p-2.5"><div className="font-black text-amber-700">{formatCurrency(data.perPerson||Math.round(data.cost/groupSize))}</div><div className="text-[10px] text-slate-400">{lang==='ta'?'ஒவ்வொருவர்':'Per Person'}</div></div>
      </div>
    </div>
  );
}

function TripOverviewCard({ plan, lang='en' }) {
  const [open, setOpen] = useState(false);
  if (!plan) return null;
  return (
    <div className="card p-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <h3 className="font-display font-bold text-slate-700">📋 {lang==='ta'?'முழு பயண கண்ணோட்டம்':'Full Trip Overview'}</h3>
        <span className="text-slate-400 text-sm">{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {plan.tips?.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">💡 Tips</h4>
              <ul className="space-y-1.5">{plan.tips.map((t,i)=><li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-saffron-500">•</span>{t}</li>)}</ul>
            </div>
          )}
          {plan.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">⚠️ Warnings</h4>
              {plan.warnings.map((w,i)=><p key={i} className="text-sm text-amber-700">{w}</p>)}
            </div>
          )}
          {plan.prerequisites?.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">✅ {lang==='ta'?'தயாரிப்புகள்':'Prerequisites'}</h4>
              <ul className="space-y-1.5">{plan.prerequisites.map((p,i)=><li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-emerald-500">✓</span>{p}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
