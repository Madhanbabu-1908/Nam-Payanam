import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';

export const authController = {
  // Get current user profile
  getProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // User info is already attached to req.user by middleware
      res.json({
        success: true,
        data: {
          id: req.user?.id,
          email: req.user?.email,
          created_at: req.user?.created_at
        }
      });
    } catch (error: any) {
      next(error);
    }
  },

  // ✅ NEW: Delete User Account Permanently
  deleteAccount: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID not found' });
      }

      // 1. Delete the user from Supabase Auth using Admin API
      // This requires the SERVICE_ROLE_KEY which bypasses RLS
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        console.error('Supabase Delete Error:', error);
        throw new Error(error.message || 'Failed to delete user');
      }

      // NOTE: Due to ON DELETE CASCADE in your database migrations:
      // - Rows in 'trip_members' where user_id = userId are deleted automatically.
      // - Rows in 'expenses' where paid_by_user_id = userId are deleted automatically.
      // - Rows in 'expense_splits' where user_id = userId are deleted automatically.
      // - If the user was the 'organizer_id' of a trip, the ENTIRE trip (and its itinerary) is deleted automatically.

      res.json({ 
        success: true, 
        message: 'Account and all associated data have been permanently deleted.' 
      });

    } catch (error: any) {
      next(error);
    }
  }
};