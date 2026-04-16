import { useState, useEffect } from 'react';
import { expenseAPI } from '../../utils/api';
import { formatCurrency, MemberAvatar, Spinner } from '../ui/index.jsx';

export default function SettlementsView({ tripId, members }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState({});

  useEffect(() => {
    if (!tripId) return;
    expenseAPI.settlements(tripId).then(res => setData(res)).finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return (
    <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  );

  if (!data?.transactions?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">✅</div>
        <h3 className="font-display font-extrabold text-slate-800 text-lg mb-1">All Settled!</h3>
        <p className="text-sm text-slate-400">No outstanding balances in this trip</p>
      </div>
    );
  }

  const allSettled = data.transactions.every(t => paid[`${t.from}-${t.to}`]);

  return (
    <div className="px-4 py-4 space-y-4 animate-fade-in pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0066CC] to-[#003d99] rounded-2xl p-4 text-white">
        <h3 className="font-display font-extrabold text-lg">💳 Settle Up</h3>
        <p className="text-white/70 text-xs mt-1">{data.transactions.length} payment{data.transactions.length !== 1 ? 's' : ''} to make</p>
        {allSettled && (
          <div className="mt-2 bg-white/20 rounded-xl px-3 py-1.5 inline-block">
            <span className="text-white text-xs font-bold">🎉 All marked as settled!</span>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        {data.transactions.map((t, i) => {
          const key = `${t.from}-${t.to}`;
          const isMarked = !!paid[key];
          return (
            <div key={i} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${isMarked ? 'opacity-60 border-emerald-200' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <MemberAvatar nickname={t.from} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{t.from}</span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span className="font-bold text-slate-800 text-sm">{t.to}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Transfer</div>
                </div>
                <span className="font-display font-extrabold text-[#FF6B35] text-xl">{formatCurrency(t.amount)}</span>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setPaid(p => ({ ...p, [key]: !p[key] }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-all active:scale-95
                    ${isMarked ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white shadow-md'}`}>
                  {isMarked ? '✅ Marked Paid' : '💰 Mark as Paid'}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${t.from} owes ${t.to} ₹${t.amount} for ${data.trip?.title || 'trip'}`); }}
                  className="w-12 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 active:bg-slate-200 flex-shrink-0"
                  title="Copy reminder">
                  📋
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Balance table */}
      {data.memberBalances && Object.keys(data.memberBalances).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="font-display font-bold text-slate-800 text-sm">Balance Summary</h4>
          </div>
          <div className="divide-y divide-slate-50">
            {Object.entries(data.memberBalances).map(([name, balance]) => (
              <div key={name} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <MemberAvatar nickname={name} size="sm" />
                  <span className="font-semibold text-slate-700 text-sm">{name}</span>
                </div>
                <span className={`font-extrabold text-sm px-2.5 py-1 rounded-lg ${
                  balance > 0 ? 'text-emerald-700 bg-emerald-50' :
                  balance < 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100'
                }`}>
                  {balance > 0 ? `+${formatCurrency(balance)}` : balance < 0 ? formatCurrency(balance) : 'Even'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
