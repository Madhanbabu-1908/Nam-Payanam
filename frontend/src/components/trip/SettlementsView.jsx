import { useState, useEffect } from 'react';
import { expenseAPI } from '../../utils/api';
import { formatCurrency, MemberAvatar, Spinner } from '../ui/index.jsx';

export default function SettlementsView({ tripId, members }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tripId) return;
    expenseAPI.settlements(tripId).then(setData).catch(console.error).finally(()=>setLoading(false));
  }, [tripId]);

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner size="lg" color="indigo"/></div>;
  if (!data) return null;
  const { settlements, summary, totalExpenses } = data;

  return (
    <div className="px-4 py-4 space-y-4 pb-12 animate-fade-in">
      {/* Header */}
      <div className="card-indigo rounded-2xl p-4 text-center">
        <p className="text-white/60 text-xs font-bold uppercase mb-1">Total Group Expenses</p>
        <p className="font-display font-black text-4xl text-white">{formatCurrency(totalExpenses)}</p>
        <p className="text-white/60 text-xs mt-1">{members.length} members · {formatCurrency(totalExpenses/(members.length||1))} avg/person</p>
      </div>
      {/* Member summary */}
      <div>
        <h3 className="font-display font-bold text-slate-700 mb-3">Per Person</h3>
        <div className="space-y-2">
          {summary?.map((m,i)=>(
            <div key={i} className="card p-3 flex items-center gap-3">
              <MemberAvatar nickname={m.nickname}/>
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-sm">{m.nickname}</div>
                <div className="text-xs text-slate-400">Paid {formatCurrency(m.totalPaid)} · Share {formatCurrency(m.totalOwed)}</div>
              </div>
              <div className={`text-right font-display font-black text-sm ${m.netBalance>=0?'text-emerald-600':'text-red-500'}`}>
                {m.netBalance>=0?'+':''}{formatCurrency(m.netBalance)}
                <div className="text-[10px] font-body font-normal text-slate-400">{m.netBalance>=0?'gets back':'owes'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Settlements */}
      <div>
        <h3 className="font-display font-bold text-slate-700 mb-1">Who Pays Whom</h3>
        <p className="text-xs text-slate-400 mb-3">Minimum transactions to settle all dues</p>
        {settlements?.length===0 ? (
          <div className="card p-6 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-display font-bold text-slate-700">All settled up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {settlements?.map((s,i)=>(
              <div key={i} className="card p-4">
                <div className="flex items-center gap-2">
                  <MemberAvatar nickname={s.from} size="sm"/>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 text-sm">{s.from}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-bold text-slate-800 text-sm">{s.to}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Pay this amount to settle</div>
                  </div>
                  <MemberAvatar nickname={s.to} size="sm"/>
                  <div className="font-display font-black text-saffron-600 text-lg ml-2">{formatCurrency(s.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 text-center py-2">💡 Payments happen outside the app — settle via UPI, cash, etc.</p>
    </div>
  );
}
