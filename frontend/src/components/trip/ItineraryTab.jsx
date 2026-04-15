import { useState } from 'react';
import { tripAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, EmptyState } from '../ui/index.jsx';

const STOP_TYPE_ICONS = {
  start: '🏠', stop: '📍', stay: '🏨',
  attraction: '🎯', food: '🍽️', end: '🏁', default: '📌'
};

export default function ItineraryTab({ trip, days, members, progress, session, activeDay, setActiveDay, onStatusChange, onRefresh }) {
  const [updating, setUpdating] = useState(false);

  const isOrganizer = session?.isOrganizer;

  async function markStopReached(dayNumber) {
    if (!isOrganizer) return toast.error('Only organizer can update progress');
    setUpdating(true);
    try {
      const currentIdx = (progress?.current_stop_index || 0) + 1;
      await tripAPI.updateProgress(trip.id, currentIdx, dayNumber);
      toast.success('Progress updated! ✅');
      onRefresh();
    } catch (err) {
      toast.error('Failed to update progress');
    } finally {
      setUpdating(false);
    }
  }

  if (!days?.length) {
    return <EmptyState icon="📅" title="No itinerary yet" description="Trip plan is being prepared" />;
  }

  const currentDayData = days.find(d => d.day_number === activeDay) || days[0];

  return (
    <div className="flex flex-col pb-28 animate-fade-in">
      {/* Organizer controls */}
      {isOrganizer && trip?.status === 'planning' && (
        <div className="mx-4 mt-4 p-4 bg-ocean-50 border border-ocean-200 rounded-2xl">
          <p className="text-sm font-semibold text-ocean-800 mb-3">Ready to start the trip?</p>
          <button
            onClick={() => onStatusChange('active')}
            className="btn-ocean w-full flex items-center justify-center gap-2"
          >
            🚀 Start Trip
          </button>
        </div>
      )}

      {isOrganizer && trip?.status === 'active' && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between">
          <span className="text-sm font-semibold text-green-700">Trip is Live! 🟢</span>
          <button onClick={() => onStatusChange('completed')} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold">
            End Trip
          </button>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {days.map(day => {
          const isActive = day.day_number === activeDay;
          const isReached = day.is_reached;
          return (
            <button
              key={day.day_number}
              onClick={() => setActiveDay(day.day_number)}
              className={`day-tab flex-shrink-0 ${isReached ? 'day-tab-reached' : isActive ? 'day-tab-active' : 'day-tab-inactive'}`}
            >
              {isReached ? '✅' : `Day ${day.day_number}`}
            </button>
          );
        })}
      </div>

      {/* Current day plan */}
      {currentDayData && (
        <div className="px-4 space-y-3">
          {/* Day header */}
          <div className="card p-4 bg-gradient-to-r from-saffron-50 to-orange-50 border-saffron-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="badge badge-saffron mb-1">Day {currentDayData.day_number}</div>
                <h2 className="font-display font-bold text-slate-800 text-lg">{currentDayData.title}</h2>
                {currentDayData.date && (
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(currentDayData.date)}</p>
                )}
              </div>
              {currentDayData.is_reached && (
                <span className="text-2xl">✅</span>
              )}
            </div>
            {currentDayData.notes && (
              <p className="text-sm text-slate-600 mt-2 border-t border-saffron-200 pt-2">{currentDayData.notes}</p>
            )}
          </div>

          {/* Stops */}
          {currentDayData.stops?.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-slate-700 text-sm px-1">Today's Stops</h3>
              {currentDayData.stops.map((stop, i) => (
                <StopCard key={i} stop={stop} index={i} isLast={i === currentDayData.stops.length - 1} />
              ))}
            </div>
          )}

          {/* AI Plan details from trip */}
          {trip?.ai_plan?.days?.find(d => d.dayNumber === currentDayData.day_number) && (
            <DayBudgetCard
              aiDay={trip.ai_plan.days.find(d => d.dayNumber === currentDayData.day_number)}
            />
          )}

          {/* Organizer: mark day complete */}
          {isOrganizer && trip?.status === 'active' && !currentDayData.is_reached && (
            <button
              onClick={() => markStopReached(currentDayData.day_number)}
              disabled={updating}
              className="btn-ocean w-full flex items-center justify-center gap-2"
            >
              {updating ? '...' : '📍 Mark Day as Reached'}
            </button>
          )}
        </div>
      )}

      {/* Full trip overview */}
      <div className="px-4 mt-4">
        <TripOverviewCard trip={trip} days={days} />
      </div>
    </div>
  );
}

function StopCard({ stop, index, isLast }) {
  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-white border-2 border-saffron-200 flex items-center justify-center text-sm shadow-sm">
          {STOP_TYPE_ICONS[stop.type] || STOP_TYPE_ICONS.default}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-saffron-100 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 card p-3 mb-2">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">{stop.name}</h4>
            {stop.duration && <span className="text-xs text-slate-400">⏱ {stop.duration}</span>}
          </div>
          {stop.estimatedCost > 0 && (
            <span className="text-xs font-bold text-saffron-600">{formatCurrency(stop.estimatedCost)}</span>
          )}
        </div>
        {stop.description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{stop.description}</p>
        )}
      </div>
    </div>
  );
}

function DayBudgetCard({ aiDay }) {
  return (
    <div className="card p-4 border-l-4 border-ocean-400">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-slate-700 text-sm">Day Budget</h4>
        <span className="font-display font-bold text-ocean-600 text-base">{formatCurrency(aiDay.dailyBudget)}/person</span>
      </div>
      {aiDay.notes && <p className="text-xs text-slate-500 leading-relaxed">{aiDay.notes}</p>}
    </div>
  );
}

function TripOverviewCard({ trip, days }) {
  const [open, setOpen] = useState(false);
  if (!trip?.ai_plan) return null;

  return (
    <div className="card p-4 mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full">
        <h3 className="font-display font-bold text-slate-700">Full Trip Overview</h3>
        <span className="text-slate-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {trip.ai_plan.tips?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">💡 Travel Tips</h4>
              <ul className="space-y-1">
                {trip.ai_plan.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-saffron-500">•</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {trip.ai_plan.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">⚠️ Important Notes</h4>
              {trip.ai_plan.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-700">{w}</p>
              ))}
            </div>
          )}

          {trip.ai_plan.prerequisites?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">✅ Prerequisites</h4>
              <ul className="space-y-1">
                {trip.ai_plan.prerequisites.map((p, i) => (
                  <li key={i} className="text-sm text-slate-600 flex gap-2">
                    <span className="text-green-500">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
