import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';

export const expenseController = {
  addExpense: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { amount, description, category, date } = req.body;
      const userId = req.user!.id;

      // 1. Verify Membership
      const { data: member, error: memberError } = await supabaseAdmin
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

      if (memberError || !member) {
        return res.status(403).json({ success: false, error: 'Not a member of this trip' });
      }

      // 2. Get All Members for Equal Split
      const { data: members, error: membersError } = await supabaseAdmin
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', tripId);

      if (membersError || !members || members.length === 0) {
        throw new Error('No members found in trip');
      }

      const splitAmount = amount / members.length;

      // 3. Insert Expense
      const { data: expense, error: expError } = await supabaseAdmin
        .from('expenses')
        .insert({
          trip_id: tripId,
          amount,
          description,
          category: category || 'OTHER',
          paid_by_user_id: userId,
          date: date || new Date().toISOString()
        })
        .select()
        .single();

      if (expError) throw expError;
      // 4. Insert Splits (Who owes what)
      const splits = members.map(m => ({
        expense_id: expense.id,
        user_id: m.user_id,
        amount_owed: splitAmount,
        is_settled: m.user_id === userId // Paid by themselves is settled
      }));

      const { error: splitError } = await supabaseAdmin.from('expense_splits').insert(splits);
      if (splitError) throw splitError;

      res.status(201).json({ success: true, data: expense });
    } catch (error: any) {
      next(error);
    }
  },

  getExpenses: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      next(error);
    }
  },

  // ✅ NEW: Smart Settlements Calculator
  getSettlements: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      // Fetch all expenses
      const { data: expenses, error: expError } = await supabaseAdmin
        .from('expenses')
        .select('id, amount, paid_by_user_id')
        .eq('trip_id', tripId);

      if (expError) throw expError;
      if (!expenses || expenses.length === 0) {
        return res.json({ success: true, data: { balances: {}, transactions: [] } });
      }
      // Fetch all splits
      const expenseIds = expenses.map(e => e.id);
      const { data: allSplits, error: splitError } = await supabaseAdmin
        .from('expense_splits')
        .select('expense_id, user_id, amount_owed')
        .in('expense_id', expenseIds);

      if (splitError) throw splitError;

      // Calculate Net Balance per User
      // Logic: Balance = (Total Paid by User) - (Total Owed by User)
      const balances: Record<string, number> = {};
      const userIds = new Set<string>();

      expenses.forEach(e => userIds.add(e.paid_by_user_id));
      allSplits?.forEach(s => userIds.add(s.user_id));

      // Initialize balances to 0
      userIds.forEach(id => balances[id] = 0);

      // Process Expenses
      expenses.forEach(exp => {
        const payer = exp.paid_by_user_id;
        balances[payer] += exp.amount; // They paid this much (Credit)

        // Subtract what everyone owes for this expense (Debit)
        const relatedSplits = allSplits?.filter(s => s.expense_id === exp.id) || [];
        relatedSplits.forEach(split => {
          balances[split.user_id] -= split.amount_owed;
        });
      });

      // Generate Minimal Transactions (Greedy Algorithm)
      const debtors: { id: string; amount: number }[] = [];
      const creditors: { id: string; amount: number }[] = [];

      Object.entries(balances).forEach(([id, amount]) => {
        if (amount < -0.01) debtors.push({ id, amount }); // Negative balance = owes money
        if (amount > 0.01) creditors.push({ id, amount }); // Positive balance = owed money
      });

      // Sort to optimize matching
      debtors.sort((a, b) => a.amount - b.amount); // Most negative first
      creditors.sort((a, b) => b.amount - a.amount); // Most positive first

      const transactions: any[] = [];
      let i = 0, j = 0;

      while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];        const creditor = creditors[j];

        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        transactions.push({
          from: debtor.id,
          to: creditor.id,
          amount: parseFloat(amount.toFixed(2))
        });

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
      }

      res.json({ success: true, data: { balances, transactions } });
    } catch (error: any) {
      next(error);
    }
  }
};