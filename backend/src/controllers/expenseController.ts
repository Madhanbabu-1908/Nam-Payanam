import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { expenseService } from '../services/expenseService';
import { supabaseAdmin } from '../config/db';

export const expenseController = {
  addExpense: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const expenseData = { ...req.body, paid_by_user_id: req.user!.id };
      const result = await expenseService.addExpense(expenseData);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      next(error);
    }
  },

  getExpensesByTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .select('*, expense_splits(*)')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      next(error);
    }
  },

  getSettlementSummary: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const summary = await expenseService.getSettlementSummary(tripId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      next(error);
    }
  }
};