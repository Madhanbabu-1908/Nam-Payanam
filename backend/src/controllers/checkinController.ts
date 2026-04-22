import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';

export const checkinController = {
  createCheckin: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId, locationName, status = 'PRESENT' } = req.body;
      const userId = req.user!.id;

      if (!tripId || !locationName) {
        return res.status(400).json({ success: false, error: 'Trip ID and Location required' });
      }

      const { data, error } = await supabaseAdmin.from('checkins').insert({
        trip_id: tripId,
        user_id: userId,
        location_name: locationName,
        status,
        checked_in_at: new Date().toISOString()
      }).select().single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      next(error);
    }
  },

  getCheckins: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      // Get latest checkin per user, joining user email/name
      const { data, error } = await supabaseAdmin
        .from('checkins')
        .select(`
          *,
          user:user_id (email, full_name)
        `)
        .eq('trip_id', tripId)
        .order('checked_in_at', { ascending: false });

      if (error) throw error;

      // Deduplicate to get only the latest status per user
      const latestCheckins: any[] = [];
      const seenUsers = new Set();
      
      data?.forEach((item: any) => {
        if (!seenUsers.has(item.user_id)) {
          latestCheckins.push(item);
          seenUsers.add(item.user_id);
        }
      });

      res.json({ success: true, data: latestCheckins });
    } catch (error: any) {
      next(error);
    }
  }
};