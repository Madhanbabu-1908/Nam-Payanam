import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';
import crypto from 'crypto';

export const trackingController = {
  // Generate a secure token for the driver
  createToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      // Verify Organizer
      const { data: trip } = await supabaseAdmin.from('trips').select('organizer_id').eq('id', tripId).single();
      if (!trip || trip.organizer_id !== userId) {
        return res.status(403).json({ success: false, error: 'Only organizer can generate tracking link' });
      }

      const token = crypto.randomBytes(8).toString('hex'); // Secure random token

      const { data, error } = await supabaseAdmin.from('tracking_tokens').insert({
        trip_id: tripId,
        token,
        is_active: true
      }).select().single();

      if (error) throw error;

      // Construct public tracking URL
      const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${token}`;

      res.json({ success: true, data: { token, url: trackingUrl } });
    } catch (error: any) { next(error); }
  },

  // Driver sends location update
  pushLocation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const { latitude, longitude, speed } = req.body;

      // Verify Token
      const { data: tokenData } = await supabaseAdmin.from('tracking_tokens')
        .select('trip_id')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (!tokenData) {
        return res.status(401).json({ success: false, error: 'Invalid or expired tracking token' });
      }

      // Log Location
      const { error } = await supabaseAdmin.from('location_logs').insert({
        trip_id: tokenData.trip_id,
        latitude,
        longitude,
        speed: speed || 0
      });

      if (error) throw error;

      res.json({ success: true, message: 'Location updated' });
    } catch (error: any) { next(error); }
  },

  // Get latest location for a trip
  getLiveLocation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      
      const { data, error } = await supabaseAdmin
        .from('location_logs')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = No rows found

      res.json({ success: true, data });
    } catch (error: any) { next(error); }
  }
};