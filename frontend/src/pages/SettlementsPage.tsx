import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../config/api";
import { motion } from "framer-motion";

type Member = {
  user_id: string; // ✅ Match backend response field
  profiles?: {
    full_name: string;
    email: string;
  };
};

type Expense = {
  id: string;
  amount: number;
  paid_by_user_id: string; // ✅ Match backend response field
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
          // ✅ FIX: Changed /trip/ to /trips/
          api.get(`/trips/${tripId}/members`), 
          api.get(`/expenses/${tripId}`),
        ]);

        setMembers(membersRes.data.data || []);
        setExpenses(expensesRes.data.data || []);
      } catch (err) {
        console.error("Settlement fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    if (tripId) fetchData();
  }, [tripId]);

  // 💰 Calculate settlement
  const calculate = () => {
    if (!members.length) return [];

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const split = total / members.length;

    const balances: any = {};

    // Initialize balances
    members.forEach((m) => {
      balances[m.user_id] = -split;
    });

    // Add payments
    expenses.forEach((e) => {
      if (balances[e.paid_by_user_id] !== undefined) {
        balances[e.paid_by_user_id] += e.amount;
      }
    });

    return members.map((m) => ({
      // ✅ Use profiles.full_name from backend response
      name: m.profiles?.full_name || m.profiles?.email?.split('@')[0] || "User", 
      balance: balances[m.user_id] || 0,
    }));
  };

  const result = calculate();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading settlements...
      </div>
    );
  }

  if (!members.length) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        No members found
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Settlement</h2>

      {result.map((r, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between bg-white p-3 rounded shadow"
        >
          <p>{r.name}</p>

          <p
            className={`font-bold ${
              r.balance >= 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {r.balance >= 0
              ? `Gets ₹${r.balance.toFixed(2)}`
              : `Owes ₹${Math.abs(r.balance).toFixed(2)}`}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
