import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../config/api"; ✅
import { motion } from "framer-motion";

type Expense = {
  _id: string;
  amount: number;
  description: string;
  paidBy: string;
};

export default function ExpensesPage() {
  const { tripId } = useParams();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  // 📥 Fetch expenses
  const fetchExpenses = async () => {
    try {
      const res = await api.get(`/expenses/${tripId}`);
      setExpenses(res.data.data || []);
    } catch (err) {
      console.error("Fetch expenses failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) fetchExpenses();
  }, [tripId]);

  // ➕ Add expense
  const handleAddExpense = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Enter valid amount");
      return;
    }

    try {
      await api.post(`/expenses/${tripId}`, {
        amount: Number(amount), // 🔥 FIX: convert properly
        description,
      });

      // 🔄 Refresh list
      await fetchExpenses();

      // 🧹 Reset
      setAmount("");
      setDescription("");
    } catch (err) {
      console.error("Add expense failed", err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* ➕ Add Expense */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white p-4 rounded-2xl shadow"
      >
        <h2 className="text-lg font-bold mb-3">Add Expense</h2>

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)} // 🔥 FIX
            className="border p-2 rounded w-1/3"
          />

          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border p-2 rounded flex-1"
          />

          <button
            onClick={handleAddExpense}
            className="bg-blue-600 text-white px-4 rounded"
          >
            Add
          </button>
        </div>
      </motion.div>

      {/* 📋 Expense List */}
      <div className="space-y-3">
        {loading ? (
          <p>Loading...</p>
        ) : expenses.length === 0 ? (
          <p className="text-gray-500">No expenses yet</p>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp._id}
              className="bg-gray-100 p-3 rounded flex justify-between"
            >
              <div>
                <p className="font-semibold">{exp.description}</p>
                <p className="text-sm text-gray-500">
                  Paid by: {exp.paidBy || "You"}
                </p>
              </div>

              <p className="font-bold">₹{exp.amount}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}