import { useState, useEffect } from 'react';
import { expenseAPI, tripAPI } from '../../utils/api';
import { formatCurrency, formatDate, Spinner, MemberAvatar } from '../ui/index.jsx';

export default function TripReport({ tripId, trip }) {
  const [report, setReport] = useState(null);
  const [breakStops, setBreakStops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      expenseAPI.report(tripId),
      tripAPI.getBreaks(tripId),
    ]).then(([r, b]) => {
      setReport(r);
      setBreakStops(b.breakStops || []);
    }).finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return (
    <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  );
  if (!report) return <div className="p-4 text-center text-slate-400">No report data</div>;

  const CAT_ICONS = { food:'🍽️', transport:'🚗', stay:'🏨', activity:'🎯', shopping:'🛍️', other:'📌' };
  const CAT_COLORS = { food:'bg-amber-100 text-amber-700', transport:'bg-blue-100 text-blue-700', stay:'bg-purple-100 text-purple-700', activity:'bg-emerald-100 text-emerald-700', shopping:'bg-pink-100 text-pink-700', other:'bg-slate-100 text-slate-600' };

  return (
    <div className="pb-12 space-y-4 px-4 pt-4 animate-fade-in">
      {/* Hero summary */}
      <div className="bg-gradient-to-br from-[#FF6B35] to-[#cc2900] rounded-2xl p-5 text-white">
        <div className="text-white/70 text-xs font-bold mb-1">TRIP REPORT</div>
        <h2 className="font-display font-extrabold text-xl mb-1">{report.trip?.title}</h2>
        <p className="text-white/70 text-xs mb-4">
          {report.trip?.start_location?.split(',')[0]} → {report.trip?.end_location?.split(',')[0]} · {formatDate(report.trip?.start_date)}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="font-extrabold text-2xl">{formatCurrency(report.totalAmount)}</div>
            <div className="text-white/70 text-[11px] font-semibold">Total Spent</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="font-extrabold text-2xl">{formatCurrency(report.perPersonAverage)}</div>
            <div className="text-white/70 text-[11px] font-semibold">Per Person</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <div className="font-extrabold text-2xl">{report.members?.length}</div>
            <div className="text-white/70 text-[11px] font-semibold">Travellers</div>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(report.categoryBreakdown || {}).length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="font-display font-bold text-slate-800 mb-3">💸 Spending by Category</h3>
          <div className="space-y-2.5">
            {Object.entries(report.categoryBreakdown).sort(([,a],[,b]) => b - a).map(([cat, amount]) => {
              const pct = Math.round((amount / report.totalAmount) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <span>{CAT_ICONS[cat] || '📌'}</span> {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </span>
                    <span className="font-bold text-slate-800">{formatCurrency(amount)} <span className="text-slate-400 font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FF4500] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member breakdown */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <h3 className="font-display font-bold text-slate-800 mb-3">👥 Per-Person Summary</h3>
        <div className="space-y-3">
          {report.memberBreakdown?.map((m) => (
            <div key={m.nickname} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <MemberAvatar nickname={m.nickname} isOrganizer={m.isOrganizer} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 text-sm">{m.nickname}</span>
                  {m.isOrganizer && <span className="text-[10px] bg-orange-100 text-[#FF6B35] font-bold px-1.5 py-0.5 rounded">Org</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Paid: <span className="font-bold text-[#FF6B35]">{formatCurrency(m.totalPaid)}</span>
                  <span className="mx-2">·</span>
                  Share: <span className="font-semibold">{formatCurrency(m.totalShare)}</span>
                </div>
              </div>
              <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                m.totalPaid > m.totalShare ? 'bg-emerald-100 text-emerald-700' :
                m.totalPaid < m.totalShare ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
              }`}>
                {m.totalPaid > m.totalShare ? `+${formatCurrency(m.totalPaid - m.totalShare)}` :
                 m.totalPaid < m.totalShare ? `-${formatCurrency(m.totalShare - m.totalPaid)}` : 'Even'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day-wise breakdown */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <h3 className="font-display font-bold text-slate-800 mb-3">📅 Day-wise Expenses</h3>
        <div className="space-y-3">
          {report.dayExpenses?.map(day => (
            <div key={day.dayNumber} className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white text-xs font-bold rounded-lg flex items-center justify-center">D{day.dayNumber}</span>
                  <span className="font-semibold text-slate-800 text-sm truncate">{day.title}</span>
                </div>
                <span className="font-bold text-[#FF6B35] text-sm flex-shrink-0">{formatCurrency(day.dayTotal)}</span>
              </div>
              {day.expenses.length > 0 && (
                <div className="px-3 py-2 space-y-1.5">
                  {day.expenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span>{CAT_ICONS[e.category] || '📌'}</span>
                        {e.title}
                        {e.note?.includes('[break]') && <span className="bg-amber-100 text-amber-700 px-1 rounded text-[10px] font-bold">break</span>}
                      </span>
                      <span className="font-bold text-slate-700 ml-2">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Break stops section */}
      {breakStops.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="font-display font-bold text-slate-800 mb-3">☕ Break Stops ({breakStops.length})</h3>
          <div className="space-y-2">
            {breakStops.map(b => (
              <div key={b.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-lg">☕</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm">{b.reason}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex gap-3 flex-wrap">
                    <span>Day {b.day_number}</span>
                    {b.location && <span>📍 {b.location}</span>}
                    {b.duration_minutes && <span>⏱️ {b.duration_minutes}m</span>}
                    <span>by {b.added_by_nickname}</span>
                  </div>
                  {b.activities && <div className="text-xs text-amber-700 mt-1">🎯 {b.activities}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
        <p className="text-xs text-slate-400">Report generated at {new Date(report.generatedAt).toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}
