import { useState } from 'react';
import { tripAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, EmptyState } from '../ui/index.jsx';

const STOP_ICONS = { start:'🟢', stop:'📍', stay:'🏨', attraction:'🎯', food:'🍽️', fuel:'⛽', rest:'☕', end:'🔴', default:'📍' };

export default function ItineraryTab({ trip, days, members, progress, session, activeDay, setActiveDay, onStatusChange, onRefresh, onDeleteTrip }) {
  const [updating, setUpdating] = useState(false);
  const isOrg = session?.isOrganizer;
  const currentDay = days?.find(d => d.day_number === activeDay) || days?.[0];

  async function markReached(dayNum) {
    if (!isOrg) return toast.error('Only organiser can update progress');
    setUpdating(true);
    try {
      const newIdx = (progress?.current_stop_index || 0) + 1;
      await tripAPI.updateProgress(trip.id, { currentStopIndex: newIdx, dayReached: dayNum });
      toast.success('✅ Progress updated!');
      onRefresh();
    } catch { toast.error('Failed to update'); }
    finally { setUpdating(false); }
  }

  if (!days?.length) return <EmptyState icon="📅" title="No itinerary" description="Trip plan is loading"/>;

  return (
    <div className="flex flex-col pb-32 animate-fade-in">

      {/* Organiser controls */}
      {isOrg && trip?.status === 'planning' && (
        <div className="mx-4 mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-3">
          <p className="text-sm font-bold text-indigo-800">Ready to start the trip?</p>
          <button onClick={() => onStatusChange('active')} className="btn-indigo w-full">🚀 Start Trip</button>
        </div>
      )}
      {isOrg && trip?.status === 'active' && (
        <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="live-dot"/><span className="text-sm font-bold text-emerald-700">Trip is Live</span></div>
          <button onClick={() => onStatusChange('completed')} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold">End Trip</button>
        </div>
      )}
      {trip?.status === 'completed' && (
        <div className="mx-4 mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-center">
          <span className="text-sm font-bold text-indigo-700">✅ Trip Completed — Check the Report!</span>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {days.map(day => (
          <button key={day.day_number} onClick={() => setActiveDay(day.day_number)}
            className={`day-chip ${day.is_reached?'day-chip-done':day.day_number===activeDay?'day-chip-active':'day-chip-idle'}`}>
            {day.is_reached ? `✅` : `Day ${day.day_number}`}
          </button>
        ))}
      </div>

      {currentDay && (
        <div className="px-4 space-y-3">
          {/* Day header */}
          <div className="card p-4 border-l-4 border-l-indigo-500">
            <div className="flex items-start justify-between">
              <div>
                <div className="badge badge-indigo mb-1.5">Day {currentDay.day_number}</div>
                <h2 className="font-display font-bold text-slate-900 text-lg">{currentDay.title}</h2>
                {currentDay.date && <p className="text-xs text-slate-400 mt-1">{formatDate(currentDay.date)}</p>}
              </div>
              {currentDay.is_reached && <span className="text-3xl">✅</span>}
            </div>
            {/* Weather */}
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

          {/* Stops timeline */}
          {currentDay.stops?.length > 0 && (
            <div>
              <h3 className="font-display font-bold text-slate-700 text-sm mb-2 px-1">Today's Stops</h3>
              <div className="space-y-0">
                {currentDay.stops.map((stop, i) => (
                  <StopCard key={i} stop={stop} isLast={i===currentDay.stops.length-1}/>
                ))}
              </div>
            </div>
          )}

          {/* AI plan day details */}
          {trip?.ai_plan?.days?.find(d=>d.dayNumber===currentDay.day_number) && (
            <DayBudgetCard aiDay={trip.ai_plan.days.find(d=>d.dayNumber===currentDay.day_number)}/>
          )}

          {/* Mark reached */}
          {isOrg && trip?.status==='active' && !currentDay.is_reached && (
            <button onClick={() => markReached(currentDay.day_number)} disabled={updating}
              className="btn-indigo w-full">
              {updating ? '...' : '📍'} Mark Day {currentDay.day_number} as Reached
            </button>
          )}
        </div>
      )}

      {/* Trip overview card */}
      <div className="px-4 mt-4 space-y-3">
        {trip?.ai_plan && <TripOverviewCard plan={trip.ai_plan}/>}
        {trip?.fuel_data && <FuelCard data={trip.fuel_data} groupSize={trip.group_size}/>}

        {/* Delete trip (organiser) */}
        {isOrg && (
          <button onClick={onDeleteTrip}
            className="w-full border border-red-200 bg-red-50 text-red-600 font-bold py-3 rounded-xl text-sm active:bg-red-100 transition-colors flex items-center justify-center gap-2">
            🗑️ Delete This Trip
          </button>
        )}
      </div>
    </div>
  );
}

function StopCard({ stop, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center w-9 flex-shrink-0 pt-1">
        <div className="w-9 h-9 rounded-xl bg-white border-2 border-indigo-200 flex items-center justify-center text-base shadow-sm z-10">
          {STOP_ICONS[stop.type] || STOP_ICONS.default}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-indigo-100 mt-1 mb-0 min-h-6"/>}
      </div>
      <div className="flex-1 card p-3 mb-2">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-display font-bold text-slate-800 text-sm">{stop.name}</h4>
            {stop.duration && <span className="text-xs text-slate-400">⏱ {stop.duration}</span>}
          </div>
          {stop.estimatedCost>0 && <span className="text-xs font-black text-saffron-600 flex-shrink-0 ml-2">{formatCurrency(stop.estimatedCost)}</span>}
        </div>
        {stop.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{stop.description}</p>}
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
        <span className="font-display font-black text-saffron-600 text-lg">{formatCurrency(aiDay.dailyBudgetPerPerson||aiDay.dailyBudget)}<span className="text-xs font-body font-normal text-slate-400">/person</span></span>
      </div>
      {aiDay.drivingDistanceKm && (
        <p className="text-xs text-slate-400 mt-1">🚗 {aiDay.drivingDistanceKm}km · {aiDay.drivingDuration}</p>
      )}
      {aiDay.notes && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{aiDay.notes}</p>}
    </div>
  );
}

function FuelCard({ data, groupSize }) {
  return (
    <div className="card p-4 border-l-4 border-l-amber-400">
      <h3 className="font-display font-bold text-slate-700 mb-3 flex items-center gap-2">⛽ Fuel Estimate</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-amber-50 rounded-xl p-2.5"><div className="font-black text-amber-700">{data.litres?.toFixed(1)}L</div><div className="text-[10px] text-slate-400">Needed</div></div>
        <div className="bg-amber-50 rounded-xl p-2.5"><div className="font-black text-amber-700">{formatCurrency(data.cost)}</div><div className="text-[10px] text-slate-400">Total</div></div>
        <div className="bg-amber-50 rounded-xl p-2.5"><div className="font-black text-amber-700">{formatCurrency(data.perPerson||Math.round(data.cost/groupSize))}</div><div className="text-[10px] text-slate-400">Per Person</div></div>
      </div>
    </div>
  );
}

function TripOverviewCard({ plan }) {
  const [open, setOpen] = useState(false);
  if (!plan) return null;
  return (
    <div className="card p-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <h3 className="font-display font-bold text-slate-700">📋 Full Trip Overview</h3>
        <span className="text-slate-400 text-sm">{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {plan.tips?.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">💡 Tips</h4>
              <ul className="space-y-1.5">
                {plan.tips.map((t,i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-saffron-500">•</span>{t}</li>)}
              </ul>
            </div>
          )}
          {plan.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">⚠️ Warnings</h4>
              {plan.warnings.map((w,i) => <p key={i} className="text-sm text-amber-700">{w}</p>)}
            </div>
          )}
          {plan.prerequisites?.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">✅ Prerequisites</h4>
              <ul className="space-y-1.5">
                {plan.prerequisites.map((p,i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-emerald-500">✓</span>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
