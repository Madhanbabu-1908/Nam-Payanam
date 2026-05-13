import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../config/api"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, Plus, Trash2, Receipt, 
  TrendingUp, Calendar, User, IndianRupee 
} from "lucide-react";
import toast from "react-hot-toast";

type Expense = {
  id: string;
  amount: number;
  description: string;
  paid_by_user_id?: string;
  created_at?: string;
  profiles?: {
    full_name: string;
  };
};

export default function ExpensesPage() {
  const { tripId } = useParams();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // 📥 Fetch expenses
  const fetchExpenses = async () => {
    if (!tripId) return;
    try {
      const res = await api.get(`/expenses/${tripId}`);
      setExpenses(res.data.data || []);
    } catch (err) {
      console.error("Fetch expenses failed", err);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) fetchExpenses();
  }, [tripId]);

  // ➕ Add expense
  const handleAddExpense = async (e: React.FormEvent) => {    e.preventDefault();
    if (!tripId) return toast.error("Trip ID missing");
    if (!amount || Number(amount) <= 0) {
      return toast.error("Please enter a valid amount");
    }
    if (!description.trim()) {
      return toast.error("Please add a description");
    }

    setAdding(true);
    try {
      // ✅ FIXED: Send tripId in URL to match backend route POST /expenses/:tripId
      await api.post(`/expenses/${tripId}`, {
        amount: Number(amount),
        description,
      });

      toast.success("Expense added!");
      await fetchExpenses();
      setAmount("");
      setDescription("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to add expense");
    } finally {
      setAdding(false);
    }
  };

  // 🗑️ Delete expense
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await api.delete(`/expenses/${tripId}/${id}`);
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      toast.success("Expense deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  // 💰 Calculate Total
  const totalSpent = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      
      {/* Header & Stats */}
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-[var(--text)] mb-6 flex items-center gap-3">          <Wallet className="text-brand"/> Trip Expenses
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5 bg-gradient-to-br from-brand to-brand/80 text-white shadow-lg shadow-brand/20">
            <p className="text-brand-100 text-sm font-medium mb-1">Total Spent</p>
            <div className="flex items-baseline gap-1">
              <IndianRupee size={24} className="opacity-80"/>
              <span className="text-4xl font-black tracking-tight">
                {totalSpent.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-[var(--muted)] text-sm font-medium mb-1">Transactions</p>
              <p className="text-3xl font-bold text-[var(--text)]">{expenses.length}</p>
            </div>
            <div className="w-12 h-12 bg-[var(--bg)] rounded-full flex items-center justify-center border border-[var(--border)]">
              <Receipt className="text-[var(--muted)]"/>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Add Form */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-24">
            <h2 className="font-bold text-[var(--text)] mb-4 flex items-center gap-2">
              <Plus size={18} className="text-brand"/> Add New
            </h2>
            
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="label">Amount (₹)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input pl-8 font-mono text-lg"
                    disabled={adding}
                  />
                  <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"/>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch at Hotel Surya"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  disabled={adding}
                />
              </div>

              <button
                type="submit"
                disabled={adding || !amount || !description}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adding ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                ) : (
                  <>
                    <Plus size={18}/> Add Expense
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="lg:col-span-2">
          <h2 className="font-bold text-[var(--text)] mb-4 text-lg">Recent Transactions</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl"/>)}
            </div>
          ) : expenses.length === 0 ? (
            <div className="card p-10 text-center flex flex-col items-center justify-center border-dashed">
              <div className="w-16 h-16 bg-[var(--bg)] rounded-full flex items-center justify-center mb-4">
                <Receipt size={32} className="text-[var(--muted)] opacity-50"/>
              </div>
              <p className="text-[var(--text)] font-medium mb-1">No expenses yet</p>
              <p className="text-[var(--muted)] text-sm">Start by adding your first transaction.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {expenses.map((exp) => (                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="card p-4 flex items-center justify-between group hover:border-brand/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <Receipt size={18}/>
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text)] line-clamp-1">{exp.description}</p>
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5">
                          <Calendar size={10}/>
                          <span>{exp.created_at ? new Date(exp.created_at).toLocaleDateString() : 'Just now'}</span>
                          {exp.profiles?.full_name && (
                            <>
                              <span>•</span>
                              <User size={10}/>
                              <span>{exp.profiles.full_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="font-bold text-[var(--text)] font-mono text-lg">
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </p>
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        className="text-[var(--muted)] hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}