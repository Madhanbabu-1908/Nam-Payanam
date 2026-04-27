import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../config/api";
import { motion } from "framer-motion";

type Member = {
  _id: string;
  name: string;
  nickname?: string;
};

type Expense = {
  amount: number;
  paidBy: string;
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
          api.get(`/trip/${tripId}/members`),
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

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const split = total / members.length;

    const balances: any = {};

    members.forEach((m) => {
      balances[m._id] = -split;
    });

    expenses.forEach((e) => {
      balances[e.paidBy] += e.amount;
    });

    return members.map((m) => ({
      name: m.nickname || m.name || "User", // 🔥 FIX nickname
      balance: balances[m._id] || 0,
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