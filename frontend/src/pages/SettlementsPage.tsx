import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../config/api";
import { motion } from "framer-motion";
import { 
  Wallet, ArrowRight, ArrowLeft, 
  TrendingUp, Users, IndianRupee, 
  CheckCircle2, AlertCircle 
} from "lucide-react";

type Member = {
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
};

type Expense = {
  id: string;
  amount: number;
  paid_by_user_id: string;
};

type SettlementResult = {
  name: string;
  balance: number;
  userId: string;
};

export default function SettlementPage() {
  const { tripId } = useParams();

  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // 📥 Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, expensesRes] = await Promise.all([
          api.get(`/trips/${tripId}/members`), 
          api.get(`/expenses/${tripId}`),
        ]);

        setMembers(membersRes.data.data || []);
        setExpenses(expensesRes.data.data || []);
      } catch (err) {
        console.error("Settlement fetch error", err);      } finally {
        setLoading(false);
      }
    };

    if (tripId) fetchData();
  }, [tripId]);

  // 💰 Calculate settlement
  const calculate = (): SettlementResult[] => {
    if (!members.length) return [];

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const split = members.length > 0 ? total / members.length : 0;

    const balances: Record<string, number> = {};

    // Initialize balances (everyone owes their share)
    members.forEach((m) => {
      balances[m.user_id] = -split;
    });

    // Add payments (paid_by_user_id gets credit)
    expenses.forEach((e) => {
      if (balances[e.paid_by_user_id] !== undefined) {
        balances[e.paid_by_user_id] += e.amount;
      }
    });

    return members.map((m) => ({
      name: m.profiles?.full_name || m.profiles?.email?.split('@')[0] || "User", 
      balance: balances[m.user_id] || 0,
      userId: m.user_id
    }));
  };

  const result = calculate();
  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const perPerson = members.length ? (totalSpent / members.length).toFixed(2) : "0.00";

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-brand/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-[var(--muted)] font-medium animate-pulse">Calculating settlements...</p>
      </div>
    );  }

  if (!members.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <Users size={48} className="text-[var(--muted)] opacity-20 mb-4"/>
        <h2 className="text-xl font-bold text-[var(--text)]">No Members Found</h2>
        <p className="text-[var(--muted)]">Add members to start splitting costs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-[var(--text)] mb-2 flex items-center gap-3">
          <Wallet className="text-brand"/> Settlements
        </h1>
        <p className="text-[var(--muted)]">Fairly split expenses among {members.length} members.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="card p-5 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20">
          <p className="text-indigo-100 text-sm font-medium mb-1">Total Spent</p>
          <div className="flex items-baseline gap-1">
            <IndianRupee size={24} className="opacity-80"/>
            <span className="text-4xl font-black tracking-tight">
              {totalSpent.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        
        <div className="card p-5 bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-[var(--muted)] text-sm font-medium mb-1">Equal Share Per Person</p>
          <div className="flex items-baseline gap-1">
            <IndianRupee size={24} className="text-[var(--muted)]"/>
            <span className="text-4xl font-bold text-[var(--text)]">
              {parseFloat(perPerson).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Settlement List */}
      <div className="space-y-4">
        <h2 className="font-bold text-[var(--text)] text-lg flex items-center gap-2">
          <TrendingUp size={20} className="text-brand"/> Who Owes What?        </h2>

        {result.length === 0 ? (
          <div className="card p-8 text-center border-dashed">
            <p className="text-[var(--muted)]">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.sort((a, b) => b.balance - a.balance).map((r, i) => {
              const isPositive = r.balance >= 0;
              const absBalance = Math.abs(r.balance).toFixed(2);
              
              return (
                <motion.div
                  key={r.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`card p-5 border-l-4 ${isPositive ? 'border-l-emerald-500' : 'border-l-rose-500'} hover:shadow-md transition-all`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text)]">{r.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {isPositive ? 'To Receive' : 'To Pay'}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-lg text-sm font-bold ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {isPositive ? 'Gets' : 'Owes'} ₹{absBalance}
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full bg-[var(--bg)] rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min((Math.abs(r.balance) / (totalSpent || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}      </div>

      {/* Simplified Instructions */}
      <div className="mt-8 card p-4 bg-blue-50 border border-blue-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-500 mt-0.5" size={20}/>
          <div>
            <h3 className="font-bold text-blue-800 text-sm">How it works</h3>
            <p className="text-blue-600 text-xs mt-1 leading-relaxed">
              Everyone's expenses are pooled together and split equally. 
              Those who paid more than their share will <strong>receive</strong> money, 
              and those who paid less will <strong>owe</strong> money.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}