import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';

export const checkinController = {
  createCheckin: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId, locationName, latitude, longitude, icon = 'PIN', note } = req.body;
      const userId = req.user!.id;
      if (!tripId || !locationName) return res.status(400).json({ success: false, error: 'tripId and locationName required' });

      const { data, error } = await supabaseAdmin.from('checkins').insert({
        trip_id: tripId, user_id: userId, location_name: locationName,
        latitude: latitude || null, longitude: longitude || null,
        icon, note: note || null, status: 'WAITING',
      }).select('*, profile:user_id(full_name, email)').single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) { next(err); }
  },

  getCheckins: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const { data, error } = await supabaseAdmin.from('checkins')
        .select('*, profile:user_id(full_name, email)')
        .eq('trip_id', tripId).order('checked_in_at', { ascending: false });
      if (error) throw error;

      // Latest per user
      const seen = new Set();
      const latest = (data || []).filter((c: any) => {
        if (seen.has(c.user_id)) return false;
        seen.add(c.user_id); return true;
      });
      res.json({ success: true, data: latest });
    } catch (err: any) { next(err); }
  },

  updateStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { checkinId } = req.params;
      const { status } = req.body;
      const { data, error } = await supabaseAdmin.from('checkins')
        .update({ status }).eq('id', checkinId).select().single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) { next(err); }
  },
};
