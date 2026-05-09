import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db'; // Ensure this uses SERVICE_ROLE_KEY

export const authController = {
  // Get current user profile
  getProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: {
          id: req.user?.id,
          email: req.user?.email
        }
      });
    } catch (error: any) {
      next(error);
    }
  },

  // ✅ UPDATED: Delete User Account Permanently with Manual Cleanup
  deleteAccount: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID not found' });
      }

      console.log(`🗑️ Starting account deletion for user: ${userId}`);

      // --- STEP 1: Manually Delete Related Data (Safety Net) ---
      // Even if you have ON DELETE CASCADE, doing this explicitly prevents 
      // "Foreign Key Constraint" errors if a cascade is missing or broken.

      // 1. Delete Trips where user is organizer
      // Note: If you have ON DELETE CASCADE for trips -> trip_members/expenses, 
      // deleting the trip here will clean up those too.
      const { error: tripsError } = await supabaseAdmin
        .from('trips')
        .delete()
        .eq('organizer_id', userId); // Adjust column name if it's 'user_id'

      if (tripsError) {
        console.error('⚠️ Error deleting trips:', tripsError);
        // We continue anyway, but log it.
      }

      // 2. Delete Trip Memberships (if not handled by cascade above)
      const { error: membersError } = await supabaseAdmin
        .from('trip_members')
        .delete()
        .eq('user_id', userId);
      
      if (membersError) console.error('⚠️ Error deleting trip members:', membersError);

      // 3. Delete Expenses (if not handled by cascade)
      const { error: expensesError } = await supabaseAdmin
        .from('expenses')
        .delete()
        .eq('paid_by_user_id', userId); // Adjust column name if needed
        
      if (expensesError) console.error('⚠️ Error deleting expenses:', expensesError);

      // 4. Delete Profile (Common issue: profiles table often lacks cascade)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (profileError) console.error('⚠️ Error deleting profile:', profileError);


      // --- STEP 2: Delete the Auth User ---
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('❌ Supabase Auth Delete Error:', authError);
        
        // Specific check for Foreign Key issues
        if (authError.message.toLowerCase().includes('foreign key')) {
           return res.status(400).json({ 
             success: false, 
             error: 'Cannot delete account: Some related data could not be removed automatically. Please contact support.' 
           });
        }

        throw new Error(authError.message || 'Failed to delete user');
      }

      console.log(`✅ Account deleted successfully for user: ${userId}`);

      res.json({ 
        success: true, 
        message: 'Account and all associated data have been permanently deleted.' 
      });

    } catch (error: any) {
      console.error('❌ Global Error in deleteAccount:', error);
      next(error);
    }
  }
};
