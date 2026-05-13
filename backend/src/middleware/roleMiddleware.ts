import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { supabaseAdmin } from '../config/db';

export const requireOrganizer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  
  // 1. Try to get tripId from params or body first
  let tripId = req.params.tripId || req.body.tripId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'User not authenticated' });
  }

  // 2. If tripId is missing (e.g., DELETE /itinerary/:itemId), fetch it from the item
  if (!tripId && req.params.id) {
    const { data: item } = await supabaseAdmin
      .from('itinerary_items')
      .select('trip_id')
      .eq('id', req.params.id)
      .single();

    if (item) {
      tripId = item.trip_id;
    }
  }

  // 3. Final check if we still don't have a tripId
  if (!tripId) {
    return res.status(400).json({ success: false, error: 'Trip ID missing' });
  }

  try {
    // 4. Check if user is the organizer of this trip
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