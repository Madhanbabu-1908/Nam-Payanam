import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { supabaseAdmin } from '../config/db';

export const requireOrganizer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const tripId = req.params.tripId || req.body.tripId;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'User not authenticated' });
  }

  if (!tripId) {
    return res.status(400).json({ success: false, error: 'Trip ID missing' });
  }

  try {
    // Directly check the database for organizer status
    const { data: trip, error } = await supabaseAdmin
      .from('trips')
      .select('organizer_id')
      .eq('id', tripId)
      .single();

    if (error || !trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (trip.organizer_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access Denied: Only the Organizer can perform this action.' 
      });
    }

    next();
  } catch (error) {
    console.error("Role Middleware Error:", error);
    return res.status(500).json({ success: false, error: 'Error checking permissions' });
  }
};