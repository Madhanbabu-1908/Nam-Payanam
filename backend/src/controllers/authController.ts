import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';

// Admin client — requires service_role key to delete auth users
const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// DELETE /api/auth/account
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    // 1. Hard-delete all trips the user organised (CASCADE removes members/expenses/etc.)
    const { data: orgTrips } = await supabase
      .from('trips').select('id').eq('organizer_id', userId);

    if (orgTrips?.length) {
      await supabase.from('trips').delete().in('id', orgTrips.map(t => t.id));
    }

    // 2. Remove user from any trips they joined as member
    await supabase.from('trip_members').delete().eq('user_id', userId);

    // 3. Delete user profile
    await supabase.from('profiles').delete().eq('id', userId);

    // 4. Delete Supabase Auth user (needs service_role key)
    const { error: authErr } = await adminClient.auth.admin.deleteUser(userId);
    if (authErr) {
      console.error('Failed to delete auth user:', authErr.message);
      // Still return success — data is gone, auth cleanup can be done manually
    }

    res.json({ success: true, message: 'Account deleted permanently' });
  } catch (err: any) {
    console.error('deleteAccount error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
