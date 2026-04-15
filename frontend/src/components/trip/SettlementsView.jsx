import { useState, useEffect } from 'react';
import { expenseAPI } from '../../utils/api';
import { formatCurrency, MemberAvatar, Spinner } from '../ui/index.jsx';

export default function SettlementsView({ tripId, members }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    expenseAPI.settlements(tripId)
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Spinner size="lg" />
    </div>
  );

  if (!data) return null;

  const { settlements, summary, totalExpenses } = data;

  return (
    <div className="px-4 py-4 space-y-4 pb-12 animate-fade-in">
      {/* Total */}
      <div className="card p-4 text-center bg-gradient-to-br from-ocean-50 to-blue-50 border-ocean-200">
        <p className="text-xs font-bold text-ocean-600 uppercase tracking-wider mb-1">Total Group Expenses</p>
        <p className="font-display font-extrabold text-3xl text-ocean-800">{formatCurrency(totalExpenses)}</p>
        <p className="text-xs text-slate-500 mt-1">{members.length} members · {formatCurrency(totalExpenses / members.length)} avg/person</p>
      </div>

      {/* Member summary */}
      <div>
        <h3 className="font-display font-bold text-slate-700 mb-3">Per Person Summary</h3>
        <div className="space-y-2">
          {summary?.map((m, i) => (
            <div key={i} className="card p-3 flex items-center gap-3">
              <MemberAvatar nickname={m.nickname} size="md" />
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">{m.nickname}</div>
                <div className="text-xs text-slate-400">Paid {formatCurrency(m.totalPaid)} · Share {formatCurrency(m.totalOwed)}</div>
              </div>
              <div className={`text-right font-display font-bold text-sm ${m.netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {m.netBalance >= 0 ? '+' : ''}{formatCurrency(m.netBalance)}
                <div className="text-[10px] font-body font-normal text-slate-400">{m.netBalance >= 0 ? 'gets back' : 'owes'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settlements */}
      <div>
        <h3 className="font-display font-bold text-slate-700 mb-1">Settlements</h3>
        <p className="text-xs text-slate-400 mb-3">Minimum transactions to settle all dues</p>
        {settlements?.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-slate-700">All settled up!</p>
            <p className="text-xs text-slate-400 mt-1">Everyone's expenses are balanced</p>
          </div>
        ) : (
          <div className="space-y-2">
            {settlements?.map((s, i) => (
              <div key={i} className="card p-3">
                <div className="flex items-center gap-3">
                  <MemberAvatar nickname={s.from} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{s.from}</span>
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span className="font-semibold text-slate-800 text-sm">{s.to}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {s.from} pays {s.to}
                    </div>
                  </div>
                  <MemberAvatar nickname={s.to} size="sm" />
                  <div className="font-display font-bold text-saffron-600 text-base ml-2">
                    {formatCurrency(s.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <p className="text-xs text-slate-500 text-center">
          💡 Settlements are calculated using minimum transaction algorithm.<br/>
          Actual payment happens outside the app.
        </p>
      </div>
    </div>
  );
}
