import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, Plus, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function ExpensesPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Food');

  useEffect(() => {
    if (!tripId) return;
    api.get(`/expenses/${tripId}`).then(res => {
      if (res.data.success) setExpenses(res.data.data);
      setLoading(false);
    }).catch(console.error);
  }, [tripId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/expenses/${tripId}`, {
        amount: parseFloat(amount),
        description: desc,
        category,
        date: new Date().toISOString()
      });
      setShowAddModal(false);
      setAmount(''); setDesc('');
      // Refresh list
      const res = await api.get(`/expenses/${tripId}`);
      setExpenses(res.data.data);
    } catch (err) { alert('Failed to add expense'); }
  };

  const totalSpent = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/80">
        <div className="flex items-center gap-3">          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft /></button>
          <h1 className="font-bold text-lg text-slate-800">Expenses</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total Spent</p>
          <p className="font-bold text-emerald-600">₹{totalSpent.toLocaleString()}</p>
        </div>
      </header>

      {/* List */}
      <main className="p-4 space-y-3">
        {loading ? <p className="text-center text-slate-400 mt-10">Loading...</p> : 
         expenses.length === 0 ? (
           <div className="text-center mt-20 text-slate-400">
             <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
             <p>No expenses yet. Start tracking!</p>
           </div>
         ) : (
           expenses.map((exp) => (
             <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center animate-fade-in">
               <div className="flex items-center gap-3">
                 <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                   exp.category === 'Food' ? 'bg-orange-100 text-orange-600' :
                   exp.category === 'Travel' ? 'bg-blue-100 text-blue-600' :
                   'bg-slate-100 text-slate-600'
                 }`}>
                   <DollarSign size={18} />
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-800">{exp.description}</h4>
                   <p className="text-xs text-slate-500">{exp.category} • Paid by You</p>
                 </div>
               </div>
               <span className="font-bold text-slate-700">₹{exp.amount}</span>
             </div>
           ))
        )}
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 hover:scale-110 transition transform"
      >
        <Plus size={24} />
      </button>

      {/* Simple Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">Add Expense</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <input type="number" placeholder="Amount (₹)" required value={amount} onChange={e=>setAmount(e.target.value)} className="w-full p-3 bg-slate-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="text" placeholder="Description (e.g., Dinner)" required value={desc} onChange={e=>setDesc(e.target.value)} className="w-full p-3 bg-slate-50 rounded-lg border-none outline-none" />
              <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full p-3 bg-slate-50 rounded-lg outline-none">
                <option>Food</option><option>Travel</option><option>Stay</option><option>Other</option>
              </select>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={()=>setShowAddModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Add</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}