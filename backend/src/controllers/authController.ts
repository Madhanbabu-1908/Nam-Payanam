import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/db';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role key needed to delete auth users
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// DELETE /api/auth/account  — permanently delete user + all their data
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    // 1. Get all trips where user is organizer → delete them (cascade handles members/expenses)
    const { data: orgTrips } = await supabase
      .from('trips').select('id').eq('organizer_id', userId);
    if (orgTrips?.length) {
      await supabase.from('trips').delete().in('id', orgTrips.map(t => t.id));
    }

    // 2. Remove user from all trips they joined
    await supabase.from('trip_members').delete().eq('user_id', userId);

    // 3. Delete user profile
    await supabase.from('profiles').delete().eq('id', userId);

    // 4. Delete Supabase Auth user (requires service role)
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    res.json({ success: true, message: 'Account deleted' });
  } catch (err: any) {
    console.error('deleteAccount error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
