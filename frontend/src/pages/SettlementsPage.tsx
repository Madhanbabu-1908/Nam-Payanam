import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';

export default function SettlementsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { data: { user } } = await import('../config/supabaseClient'); // Simplified access

  useEffect(() => {
    if (!tripId) return;
    api.get(`/expenses/${tripId}/settlements`).then(res => {
      if (res.data.success) {
        setTransactions(res.data.data.transactions || []);
        setBalances(res.data.data.balances || {});
      }
      setLoading(false);
    }).catch(console.error);
  }, [tripId]);

  // Helper to get current user ID (mocked for snippet, use real auth context)
  const currentUserId = 'me'; 

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
      <header className="glass sticky top-0 z-20 px-6 py-4 flex items-center gap-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><ArrowLeft className="text-slate-600 dark:text-slate-300"/></button>
        <h1 className="font-bold text-lg text-slate-800 dark:text-white">Settlements</h1>
      </header>

      <main className="p-6 space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">You Are Owed</p>
            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
              ₹{Math.max(0, balances['me'] || 0).toFixed(0)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-400 font-bold uppercase tracking-wider">You Owe</p>
            <p className="text-2xl font-bold text-red-800 dark:text-red-300 mt-1">
              ₹{Math.abs(Math.min(0, balances['me'] || 0)).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Action List */}
        <div>
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600"/> Recommended Payments
          </h3>
          
          {loading ? (
            <div className="text-center py-10 text-slate-400">Calculating settlements...</div>
          ) : transactions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">All settled up! 🎉</p>
              <p className="text-sm text-slate-400 mt-1">No one owes anyone anything.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition hover:shadow-md">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm">
                      {t.from.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Pays</span>
                      <span className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[100px]">{t.from}</span>
                    </div>
                  </div>
                  
                  <ArrowRight className="text-slate-300 dark:text-slate-600 mx-2" size={16} />
                  
                  <div className="flex flex-col items-end flex-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">To</span>
                    <span className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[100px]">{t.to}</span>
                  </div>
                  
                  <div className="ml-4 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-sm">
                    ₹{t.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}