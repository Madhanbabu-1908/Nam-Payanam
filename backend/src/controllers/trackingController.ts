import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/db';
import crypto from 'crypto';

// Extend Express Request to include params and body types for TypeScript safety
interface TrackingRequest extends Request {
  params: { token: string; tripId: string };
  body: { latitude: number; longitude: number; speed?: number };
}

export const trackingController = {
  /**
   * Generate a secure token for the driver (Organizer only)
   * POST /api/tracking/tokens/:tripId
   */
  createToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      // Verify Organizer
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('organizer_id')
        .eq('id', tripId)
        .single();

      if (tripError || !trip || trip.organizer_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Only organizer can generate tracking link' 
        });
      }

      const token = crypto.randomBytes(8).toString('hex');

      const { data, error } = await supabaseAdmin
        .from('tracking_tokens')
        .insert({
          trip_id: tripId,
          token,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';      const trackingUrl = `${frontendUrl}/track/${token}`;

      res.json({ 
        success: true, 
        data: { token, url: trackingUrl } 
      });
    } catch (error: any) {
      next(error);
    }
  },

  /**
   * Driver sends location update (Public endpoint with token)
   * POST /api/tracking/push/:token
   */
  pushLocation: async (req: TrackingRequest, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const { latitude, longitude, speed } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ 
          success: false, 
          error: 'Latitude and Longitude are required' 
        });
      }

      // Verify Token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('tracking_tokens')
        .select('trip_id')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or expired tracking token' 
        });
      }

      // Log Location
      const { error: logError } = await supabaseAdmin
        .from('location_logs')
        .insert({
          trip_id: tokenData.trip_id,
          latitude,
          longitude,
          speed: speed || 0        });

      if (logError) throw logError;

      res.json({ 
        success: true, 
        message: 'Location updated successfully' 
      });
    } catch (error: any) {
      next(error);
    }
  },

  /**
   * Get latest location for a trip (Protected - for Dashboard Map)
   * GET /api/tracking/live/:tripId
   */
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

      // PGRST116 means no rows found, which is fine (return null)
      if (error && error.code !== 'PGRST116') throw error;

      res.json({ 
        success: true, 
        data: data || null 
      });
    } catch (error: any) {
      next(error);
    }
  },

  /**
   * Get latest location publicly (No Auth Required - for Public Track Page)
   * GET /api/tracking/public/:token
   */
  getPublicLocation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      // Find Trip ID from Token      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('tracking_tokens')
        .select('trip_id')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        return res.status(404).json({ 
          success: false, 
          error: 'Invalid or inactive tracking link' 
        });
      }

      // Get Latest Location for that Trip
      const { data, error } = await supabaseAdmin
        .from('location_logs')
        .select('*')
        .eq('trip_id', tokenData.trip_id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      res.json({ 
        success: true, 
        data: data || null 
      });
    } catch (error: any) {
      next(error);
    }
  }
};