import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';

export const expenseController = {
  addExpense: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { amount, description, category, date } = req.body;
      const userId = req.user!.id;

      // 1. Verify user is a member of this trip
      const {  memberCheck } = await supabaseAdmin
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

      if (!memberCheck) {
        return res.status(403).json({ success: false, error: 'Not a member of this trip' });
      }

      // 2. Get all members to split equally
      const {  members } = await supabaseAdmin
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', tripId);

      if (!members || members.length === 0) throw new Error('No members found');

      const splitAmount = amount / members.length;

      // 3. Insert Expense
      const {  expense, error: expError } = await supabaseAdmin
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

      // 4. Insert Splits (Who owes what)      const splits = members.map(m => ({
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
        .select(`
          *,
          paid_by:user_id (email, full_name),
          splits (user_id, amount_owed, is_settled)
        `)
        .eq('trip_id', tripId)
        .order('date', { ascending: false });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      next(error);
    }
  },

  getSettlements: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      // Complex query to calculate net balance per user could go here.
      // For MVP, we return raw splits data for frontend calculation or a simplified summary.
      
      const { data, error } = await supabaseAdmin
        .from('expense_splits')
        .select(`
          user_id,
          amount_owed,
          is_settled,
          expense:paid_by_user_id (id) 
        `)        .eq('expense.trip_id', tripId); // Note: Requires joining through expense table

      // Simplified fallback: Just return all splits for this trip's expenses
      const {  expenses } = await supabaseAdmin
        .from('expenses')
        .select('id, paid_by_user_id')
        .eq('trip_id', tripId);
      
      if (!expenses) return res.json({ success: true, data: [] });

      const expenseIds = expenses.map(e => e.id);
      const {  splits } = await supabaseAdmin
        .from('expense_splits')
        .select('*')
        .in('expense_id', expenseIds);

      // Calculate Net Balance Logic (Simplified)
      // Map: UserId -> { paid: 0, owes: 0 }
      const balances: Record<string, { paid: number; owes: number }> = {};
      
      expenses.forEach(exp => {
        const pid = exp.paid_by_user_id;
        if (!balances[pid]) balances[pid] = { paid: 0, owes: 0 };
        // Find total amount of this expense (need to fetch amount too, skipping for brevity in this snippet)
        // In production, do this calculation in one SQL query or robust JS loop
      });

      res.json({ success: true, data: splits, message: "Raw splits returned. Frontend can calculate net." });
    } catch (error: any) {
      next(error);
    }
  }
};