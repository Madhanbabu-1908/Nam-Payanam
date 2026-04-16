import { useState } from 'react';
import { tripAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, EmptyState, Spinner } from '../ui/index.jsx';

const STOP_ICONS = { start:'🏠', stop:'📍', stay:'🏨', attraction:'🎯', food:'🍽️', end:'🏁', default:'📌' };

export default function ItineraryTab({ trip, days, members, progress, session, activeDay, setActiveDay, onStatusChange, onRefresh }) {
  const [updating, setUpdating] = useState(false);
  const isOrganizer = session?.isOrganizer;
  const isActive = trip?.status === 'active';
  const isPlanning = trip?.status === 'planning';

  async function markDayReached(dayNumber) {
    if (!isOrganizer) return toast.error('Only organiser can mark progress');
    setUpdating(true);
    try {
      const newIdx = (progress?.current_stop_index || 0) + 1;
      await tripAPI.updateProgress(trip.id, newIdx, dayNumber);
      toast.success('Day marked as reached ✅');
      onRefresh();
    } catch { toast.error('Failed to update'); }
    finally { setUpdating(false); }
  }

  if (!days?.length) {
    return (
      <EmptyState icon="📅" title="No itinerary yet"
        description="Trip plan is being prepared" />
    );
  }

  const currentDay = days.find(d => d.day_number === (activeDay || days[0]?.day_number)) || days[0];

  return (
    <div className="flex flex-col pb-32 animate-fade-in">

      {/* Organiser controls */}
      {isOrganizer && isPlanning && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-sm">Ready to hit the road?</p>
            <p className="text-blue-200 text-xs mt-0.5">Tap to start the trip for everyone</p>
          </div>
          <button onClick={() => onStatusChange('active')}
            className="bg-white text-blue-700 font-extrabold text-sm px-5 py-2.5 rounded-xl active:scale-95 flex items-center gap-2">
            🚀 Start
          </button>
        </div>
      )}

      {isOrganizer && isActive && (
        <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse-soft" />
            <span className="text-sm font-bold text-emerald-700">Trip is Live!</span>
          </div>
          <button onClick={() => onStatusChange('completed')}
            className="text-xs bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg active:scale-95">
            End Trip ✅
          </button>
        </div>
      )}

      {/* Day tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto scrollbar-hide">
        {days.map(day => {
          const isCurrent = day.day_number === (activeDay || days[0]?.day_number);
          const reached = day.is_reached;
          return (
            <button key={day.day_number} onClick={() => setActiveDay(day.day_number)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border-2
                ${reached ? 'bg-emerald-500 text-white border-emerald-500' :
                  isCurrent ? 'bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white border-transparent shadow-md' :
                  'bg-white border-slate-200 text-slate-500'}`}>
              {reached ? `✅ D${day.day_number}` : `Day ${day.day_number}`}
            </button>
          );
        })}
      </div>

      {/* Day card */}
      {currentDay && (
        <div className="px-4 space-y-3">
          {/* Day header */}
          <div className="bg-gradient-to-br from-[#FF6B35]/10 to-orange-50 border border-orange-100 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#FF6B35] text-white text-xs font-extrabold px-2.5 py-1 rounded-lg">Day {currentDay.day_number}</span>
                  {currentDay.is_reached && <span className="text-sm">✅</span>}
                </div>
                <h2 className="font-display font-extrabold text-slate-900 text-lg">{currentDay.title}</h2>
                {currentDay.date && <p className="text-xs text-slate-500 mt-0.5">{formatDate(currentDay.date)}</p>}
              </div>
            </div>
            {currentDay.notes && (
              <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-orange-100 leading-relaxed">{currentDay.notes}</p>
            )}
          </div>

          {/* Route info from AI plan */}
          {(() => {
            const aiDay = trip?.ai_plan?.days?.find(d => d.dayNumber === currentDay.day_number);
            if (aiDay?.route) return (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <span className="text-lg">🛣️</span>
                <div>
                  <div className="font-bold text-blue-800 text-sm">{aiDay.route}</div>
                  {aiDay.dailyBudget && <div className="text-xs text-blue-600 mt-0.5">Est. {formatCurrency(aiDay.dailyBudget)}/person today</div>}
                </div>
              </div>
            );
          })()}

          {/* Stops timeline */}
          {currentDay.stops?.length > 0 && (
            <div className="space-y-1">
              <h3 className="font-display font-bold text-slate-700 text-sm px-1 mb-2">📍 Today's Stops</h3>
              {currentDay.stops.map((stop, i) => (
                <StopCard key={i} stop={stop} index={i} isLast={i === currentDay.stops.length - 1} />
              ))}
            </div>
          )}

          {/* Mark day reached */}
          {isOrganizer && isActive && !currentDay.is_reached && (
            <button onClick={() => markDayReached(currentDay.day_number)} disabled={updating}
              className="btn-ocean w-full flex items-center justify-center gap-2 py-3.5">
              {updating ? <Spinner size="sm" color="white" /> : '📍'}
              {updating ? 'Updating...' : `Mark Day ${currentDay.day_number} as Reached`}
            </button>
          )}
        </div>
      )}

      {/* Full trip overview */}
      <div className="px-4 mt-4">
        <TripOverviewCard trip={trip} />
      </div>
    </div>
  );
}

function StopCard({ stop, index, isLast }) {
  const [exp, setExp] = useState(false);
  return (
    <div className="flex gap-3 items-start">
      {/* Timeline */}
      <div className="flex flex-col items-center w-9 flex-shrink-0 mt-1">
        <div className="w-9 h-9 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center text-base shadow-sm">
          {STOP_ICONS[stop.type] || STOP_ICONS.default}
        </div>
        {!isLast && <div className="w-0.5 h-6 bg-slate-100 mt-1" />}
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-3 mb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800 text-sm truncate">{stop.name}</h4>
            {stop.duration && <span className="text-xs text-slate-400 font-medium">⏱️ {stop.duration}</span>}
          </div>
          {stop.estimatedCost > 0 && (
            <span className="text-xs font-extrabold text-[#FF6B35] flex-shrink-0">{formatCurrency(stop.estimatedCost)}</span>
          )}
        </div>
        {stop.description && (
          <>
            <button onClick={() => setExp(!exp)} className="text-xs text-blue-500 font-semibold mt-1">{exp ? '▲ Less' : '▼ More'}</button>
            {exp && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{stop.description}</p>}
          </>
        )}
        {stop.amenities?.length > 0 && exp && (
          <div className="flex flex-wrap gap-1 mt-2">
            {stop.amenities.slice(0, 3).map((a, i) => (
              <span key={i} className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{a}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TripOverviewCard({ trip }) {
  const [open, setOpen] = useState(false);
  if (!trip?.ai_plan) return null;
  const plan = trip.ai_plan;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="font-display font-bold text-slate-800">Full Trip Overview</span>
        </div>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 animate-fade-in pt-3">
          {/* Highlights */}
          {plan.highlights?.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">✨ Highlights</div>
              <div className="flex flex-wrap gap-1.5">
                {plan.highlights.map((h, i) => (
                  <span key={i} className="text-xs bg-orange-50 border border-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-lg">{h}</span>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {plan.prerequisites?.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">✅ Prerequisites</div>
              <ul className="space-y-1">
                {plan.prerequisites.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 font-bold mt-0.5">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {plan.tips?.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">💡 Pro Tips</div>
              <ul className="space-y-1.5">
                {plan.tips.map((t, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                    <span>→</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {plan.warnings?.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">⚠️ Important</div>
              {plan.warnings.map((w, i) => (
                <p key={i} className="text-sm text-red-700">{w}</p>
              ))}
            </div>
          )}

          {/* Emergency contacts */}
          {plan.emergencyContacts?.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📞 Emergency</div>
              <div className="flex flex-wrap gap-2">
                {plan.emergencyContacts.map((c, i) => (
                  <span key={i} className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
