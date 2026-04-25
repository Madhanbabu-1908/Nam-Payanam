import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// ── Settlement calculation (min transactions) ────────────────
function minimizeCashFlow(balances: Record<string, number>) {
  const creditors: { id: string; amount: number }[] = [];
  const debtors:   { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, bal]) => {
    const r = Math.round(bal * 100) / 100;
    if (r >  0.01) creditors.push({ id, amount: r });
    if (r < -0.01) debtors.push({ id, amount: Math.abs(r) });
  });

  creditors.sort((a,b) => b.amount - a.amount);
  debtors.sort(  (a,b) => b.amount - a.amount);

  const txs: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amt = Math.min(creditors[i].amount, debtors[j].amount);
    txs.push({ from: debtors[j].id, to: creditors[i].id, amount: Math.round(amt * 100) / 100 });
    creditors[i].amount -= amt;
    debtors[j].amount   -= amt;
    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount   < 0.01) j++;
  }
  return txs;
}

// GET /api/expenses/:tripId/settlements
export const getSettlements = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { data: expenses } = await supabase
      .from('expenses').select('*, expense_splits(*)').eq('trip_id', tripId);
    const { data: members  } = await supabase
      .from('trip_members').select('user_id').eq('trip_id', tripId);

    const balances: Record<string, number> = {};
    (members || []).forEach(m => { balances[m.user_id] = 0; });

    (expenses || []).forEach(exp => {
      // payer gets credited
      balances[exp.paid_by_user_id] = (balances[exp.paid_by_user_id] || 0) + exp.amount;
      // each split person gets debited their share
      (exp.expense_splits || []).forEach((split: any) => {
        if (!split.is_settled) {
          const share = parseFloat(split.amount_owed || 0);
          balances[split.user_id] = (balances[split.user_id] || 0) - share;
        }
      });
    });

    const transactions = minimizeCashFlow(balances);
    res.json({ success: true, data: { transactions, balances } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/expenses/:tripId/settle  — mark payment as done
export const recordSettlement = async (req: Request, res: Response) => {
  try {
    const { tripId }  = req.params;
    const userId      = (req as any).user?.id;
    const { fromUserId, toUserId, amount } = req.body;

    // Only the payer OR receiver can mark it
    if (userId !== fromUserId && userId !== toUserId) {
      return res.status(403).json({ success: false, error: 'Only the payer or receiver can record this' });
    }

    // Find all unsettled splits where fromUser owes toUser
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, paid_by_user_id, expense_splits(*)')
      .eq('trip_id', tripId)
      .eq('paid_by_user_id', toUserId);

    let remaining = parseFloat(amount);

    for (const exp of expenses || []) {
      for (const split of (exp.expense_splits || []) as any[]) {
        if (split.user_id === fromUserId && !split.is_settled && remaining > 0) {
          const toSettle = Math.min(remaining, parseFloat(split.amount_owed));
          remaining -= toSettle;

          if (toSettle >= parseFloat(split.amount_owed) - 0.01) {
            // fully settled
            await supabase.from('expense_splits')
              .update({ is_settled: true, settled_at: new Date().toISOString(), settled_by: userId })
              .eq('id', split.id);
          } else {
            // partially settled — update remaining owed
            await supabase.from('expense_splits')
              .update({ amount_owed: parseFloat(split.amount_owed) - toSettle })
              .eq('id', split.id);
          }
        }
      }
      if (remaining <= 0) break;
    }

    // Log the settlement transaction
    await supabase.from('settlement_transactions').insert({
      trip_id:       tripId,
      from_user_id:  fromUserId,
      to_user_id:    toUserId,
      amount:        parseFloat(amount),
      recorded_by:   userId,
      settled_at:    new Date().toISOString(),
    });

    res.json({ success: true, message: 'Payment recorded' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/expenses/:tripId   — add expense with equal/manual split
export const addExpense = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user?.id;
    const { amount, description, category, date, splitMode, customSplits } = req.body;

    // Insert expense
    const { data: exp, error: eErr } = await supabase.from('expenses').insert({
      trip_id: tripId, paid_by_user_id: userId,
      amount: parseFloat(amount), description, category,
      date: date || new Date().toISOString(), split_mode: splitMode || 'equal',
    }).select().single();
    if (eErr) throw eErr;

    // Create splits
    let splits: { trip_id:string; expense_id:string; user_id:string; amount_owed:number }[] = [];

    if (splitMode === 'manual' && customSplits?.length) {
      splits = customSplits.map((s: any) => ({
        trip_id: tripId, expense_id: exp.id,
        user_id: s.user_id, amount_owed: parseFloat(s.amount),
      }));
    } else {
      // Equal split among all members
      const { data: members } = await supabase
        .from('trip_members').select('user_id').eq('trip_id', tripId);
      const pp = parseFloat(amount) / (members?.length || 1);
      splits = (members || []).map(m => ({
        trip_id: tripId, expense_id: exp.id,
        user_id: m.user_id, amount_owed: Math.round(pp * 100) / 100,
      }));
    }

    if (splits.length) {
      const { error: sErr } = await supabase.from('expense_splits').insert(splits);
      if (sErr) throw sErr;
    }

    res.json({ success: true, data: exp });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/expenses/:tripId
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { data, error } = await supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('trip_id', tripId)
      .order('date', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
