import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';

export const expenseController = {
  // Add expense with equal OR manual split
  addExpense: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { amount, description, category, date, split_type = 'EQUAL', notes, manual_splits } = req.body;
      const userId = req.user!.id;

      const { data: member } = await supabaseAdmin.from('trip_members')
        .select('id').eq('trip_id', tripId).eq('user_id', userId).single();
      if (!member) return res.status(403).json({ success: false, error: 'Not a trip member' });

      const { data: members } = await supabaseAdmin.from('trip_members')
        .select('user_id').eq('trip_id', tripId);
      if (!members?.length) throw new Error('No members found');

      const { data: expense, error: expErr } = await supabaseAdmin.from('expenses').insert({
        trip_id: tripId, amount: Number(amount), description,
        category: category || 'OTHER', paid_by_user_id: userId,
        date: date || new Date().toISOString(),
        split_type, notes: notes || null
      }).select().single();
      if (expErr) throw expErr;

      // Build splits
      let splits;
      if (split_type === 'EQUAL') {
        const share = Number(amount) / members.length;
        splits = members.map((m: any) => ({
          expense_id: expense.id, user_id: m.user_id,
          amount_owed: Math.round(share * 100) / 100,
          is_settled: m.user_id === userId,
        }));
      } else {
        // Manual: manual_splits = [{user_id, amount_owed}]
        if (!manual_splits?.length) throw new Error('Manual splits required');
        splits = manual_splits.map((s: any) => ({
          expense_id: expense.id, user_id: s.user_id,
          amount_owed: Number(s.amount_owed),
          is_settled: s.user_id === userId,
        }));
      }

      const { error: splitErr } = await supabaseAdmin.from('expense_splits').insert(splits);
      if (splitErr) throw splitErr;

      res.status(201).json({ success: true, data: expense });
    } catch (err: any) { next(err); }
  },

  getExpenses: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { data, error } = await supabaseAdmin.from('expenses')
        .select('*, expense_splits(*), paid_by:paid_by_user_id (email)')
        .eq('trip_id', tripId).order('date', { ascending: false });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) { next(err); }
  },

  deleteExpense: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { expenseId } = req.params;
      const { error } = await supabaseAdmin.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) { next(err); }
  },

  // Mark a split as settled (owed person confirms payment received)
  settleSplit: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { splitId } = req.params;
      const { settled_amount } = req.body;
      const userId = req.user!.id;

      // Get split + expense to verify the owed person is settling
      const { data: split } = await supabaseAdmin.from('expense_splits')
        .select('*, expense:expense_id(paid_by_user_id, amount)').eq('id', splitId).single();
      if (!split) return res.status(404).json({ success: false, error: 'Split not found' });

      const { error } = await supabaseAdmin.from('expense_splits').update({
        is_settled: true,
        settled_amount: settled_amount || split.amount_owed,
        settled_at: new Date().toISOString()
      }).eq('id', splitId);
      if (error) throw error;

      res.json({ success: true });
    } catch (err: any) { next(err); }
  },

  // Settlements calculation using real split data
  getSettlements: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      const [{ data: expenses }, { data: members }, { data: profiles }] = await Promise.all([
        supabaseAdmin.from('expenses').select('*, expense_splits(*)').eq('trip_id', tripId),
        supabaseAdmin.from('trip_members').select('user_id, role').eq('trip_id', tripId),
        supabaseAdmin.from('profiles').select('id, full_name').in(
          'id', (await supabaseAdmin.from('trip_members').select('user_id').eq('trip_id', tripId)).data?.map((m:any)=>m.user_id)||[]
        ),
      ]);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name || p.id.substring(0,8)+'…'; });

      // Calculate net balances
      const balances: Record<string, number> = {};
      members?.forEach((m: any) => { balances[m.user_id] = 0; });

      expenses?.forEach((exp: any) => {
        const payerId = exp.paid_by_user_id;
        if (!balances[payerId]) balances[payerId] = 0;
        // Payer gets credit for what others owe (unsettled splits of others)
        exp.expense_splits?.forEach((split: any) => {
          if (split.user_id !== payerId && !split.is_settled) {
            balances[payerId] = (balances[payerId] || 0) + split.amount_owed;
            balances[split.user_id] = (balances[split.user_id] || 0) - split.amount_owed;
          }
        });
      });

      // Minimise transactions
      const creditors = Object.entries(balances).filter(([,v]) => v > 0.01).sort(([,a],[,b]) => b-a);
      const debtors   = Object.entries(balances).filter(([,v]) => v < -0.01).sort(([,a],[,b]) => a-b);
      const transactions: any[] = [];
      const cr = creditors.map(([n,v]) => ({ id:n, name: nameMap[n]||n.substring(0,8), bal:v }));
      const db = debtors.map(([n,v])   => ({ id:n, name: nameMap[n]||n.substring(0,8), bal:-v }));
      let i=0, j=0;
      while (i<cr.length && j<db.length) {
        const amt = Math.min(cr[i].bal, db[j].bal);
        if (amt > 0.01) transactions.push({
          from: db[j].id, fromName: db[j].name,
          to: cr[i].id, toName: cr[i].name,
          amount: Math.round(amt * 100) / 100
        });
        cr[i].bal -= amt; db[j].bal -= amt;
        if (cr[i].bal < 0.01) i++;
        if (db[j].bal < 0.01) j++;
      }

      res.json({ success: true, data: { transactions, balances, nameMap } });
    } catch (err: any) { next(err); }
  },
};
