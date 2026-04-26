import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// ── Min-transaction settlement algorithm ─────────────────────
function minimizeCashFlow(balances: Record<string, number>) {
  const creditors: { id: string; amt: number }[] = [];
  const debtors:   { id: string; amt: number }[] = [];

  Object.entries(balances).forEach(([id, b]) => {
    const r = Math.round(b * 100) / 100;
    if (r >  0.01) creditors.push({ id, amt: r });
    if (r < -0.01) debtors.push({ id, amt: Math.abs(r) });
  });

  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort(  (a, b) => b.amt - a.amt);

  const txs: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amt = Math.min(creditors[i].amt, debtors[j].amt);
    txs.push({ from: debtors[j].id, to: creditors[i].id, amount: Math.round(amt * 100) / 100 });
    creditors[i].amt -= amt;
    debtors[j].amt   -= amt;
    if (creditors[i].amt < 0.01) i++;
    if (debtors[j].amt   < 0.01) j++;
  }
  return txs;
}

// POST /api/expenses/:tripId — add expense with equal or manual split
export const addExpense = async (req: Request, res: Response) => {
  try {
    const { tripId }   = req.params;
    const userId       = (req as any).user?.id;
    const { amount, description, category, date, splitMode, customSplits } = req.body;

    // 1. Insert expense row
    const { data: exp, error: eErr } = await supabase
      .from('expenses')
      .insert({
        trip_id:         tripId,
        paid_by_user_id: userId,
        amount:          parseFloat(amount),
        description:     description?.trim(),
        category:        category || 'OTHER',
        date:            date || new Date().toISOString(),
        split_mode:      splitMode || 'equal',
      })
      .select()
      .single();
    if (eErr) throw eErr;

    // 2. Build splits
    let splitRows: { trip_id: string; expense_id: string; user_id: string; amount_owed: number }[] = [];

    if (splitMode === 'manual' && Array.isArray(customSplits) && customSplits.length > 0) {
      splitRows = customSplits.map((s: any) => ({
        trip_id:     tripId,
        expense_id:  exp.id,
        user_id:     s.user_id,
        amount_owed: parseFloat(s.amount) || 0,
      }));
    } else {
      // Equal split among all trip members
      const { data: members } = await supabase
        .from('trip_members').select('user_id').eq('trip_id', tripId);
      const count = members?.length || 1;
      const pp    = parseFloat(amount) / count;
      splitRows   = (members || []).map(m => ({
        trip_id:     tripId,
        expense_id:  exp.id,
        user_id:     m.user_id,
        amount_owed: Math.round(pp * 100) / 100,
      }));
    }

    if (splitRows.length > 0) {
      const { error: sErr } = await supabase.from('expense_splits').insert(splitRows);
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

// GET /api/expenses/:tripId/settlements
export const getSettlements = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const [{ data: expenses }, { data: members }] = await Promise.all([
      supabase.from('expenses').select('*, expense_splits(*)').eq('trip_id', tripId),
      supabase.from('trip_members').select('user_id').eq('trip_id', tripId),
    ]);

    // Build net balance per user
    const balances: Record<string, number> = {};
    (members || []).forEach(m => { balances[m.user_id] = 0; });

    (expenses || []).forEach(exp => {
      // Payer gets credited the full amount
      balances[exp.paid_by_user_id] = (balances[exp.paid_by_user_id] || 0) + exp.amount;
      // Each split person is debited their unsettled share
      (exp.expense_splits || []).forEach((split: any) => {
        if (!split.is_settled) {
          const share = parseFloat(split.amount_owed) || 0;
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

// POST /api/expenses/:tripId/settle — record that a payment was made
export const recordSettlement = async (req: Request, res: Response) => {
  try {
    const { tripId }  = req.params;
    const userId      = (req as any).user?.id;
    const { fromUserId, toUserId, amount } = req.body;

    // Only the payer or the receiver can mark a settlement
    if (userId !== fromUserId && userId !== toUserId) {
      return res.status(403).json({ success: false, error: 'Only the payer or receiver can record this payment' });
    }

    // Mark splits as settled in order: oldest first
    // Find expenses paid BY toUserId where fromUserId has unsettled splits
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, paid_by_user_id, expense_splits(*)')
      .eq('trip_id', tripId)
      .eq('paid_by_user_id', toUserId);

    let remaining = parseFloat(amount);

    for (const exp of expenses || []) {
      for (const split of (exp.expense_splits || []) as any[]) {
        if (split.user_id === fromUserId && !split.is_settled && remaining > 0.01) {
          const owed    = parseFloat(split.amount_owed);
          const settling = Math.min(remaining, owed);
          remaining -= settling;

          if (owed - settling < 0.01) {
            // Fully settled
            await supabase.from('expense_splits').update({
              is_settled:  true,
              settled_at:  new Date().toISOString(),
              settled_by:  userId,
              amount_owed: 0,
            }).eq('id', split.id);
          } else {
            // Partially settled — reduce amount
            await supabase.from('expense_splits').update({
              amount_owed: Math.round((owed - settling) * 100) / 100,
            }).eq('id', split.id);
          }
        }
      }
      if (remaining <= 0.01) break;
    }

    // Log the settlement transaction for audit
    await supabase.from('settlement_transactions').insert({
      trip_id:      tripId,
      from_user_id: fromUserId,
      to_user_id:   toUserId,
      amount:       parseFloat(amount),
      recorded_by:  userId,
      settled_at:   new Date().toISOString(),
    });

    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
