import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { tripService } from '../services/tripService';

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
    const isOrganizer = await tripService.verifyOrganizer(tripId, userId);

    if (!isOrganizer) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access Denied: Only the Organizer can perform this action.' 
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error checking permissions' });
  }
};