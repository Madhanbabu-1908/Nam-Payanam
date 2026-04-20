import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';

export const tripController = {
  createTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, destination, start_date, end_date, budget, mode, interests, start_location } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }
      
      const userId = req.user.id;

      const newTrip = await tripService.createTrip({
        organizer_id: userId,
        name,
        destination,
        start_date,
        end_date,
        budget,
        mode,
        status: 'PLANNING',
      });

      await supabaseAdmin.from('trip_members').insert({
        trip_id: newTrip.id,
        user_id: userId,
        role: 'ORGANIZER'
      });

      if (mode === 'AI' && interests && start_location) {
        const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const aiItems = await aiService.generateItinerary({
          destination,
          days,
          budget,
          interests,
          startLocation: start_location
        });

        const itemsToInsert = aiItems.map((item: any) => ({ ...item, trip_id: newTrip.id }));
        
        if (itemsToInsert.length > 0) {
          await supabaseAdmin.from('itinerary_items').insert(itemsToInsert);
        }
      }

      res.status(201).json({ success: true, data: newTrip });
    } catch (error: any) {
      next(error);
    }
  },

  updateTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    res.json({ 
      success: true, 
      message: "Update functionality is under construction",
      data: null 
    });
  },

  deleteTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      await tripService.deleteTrip(tripId);
      res.json({ success: true, message: 'Trip deleted successfully.' });
    } catch (error: any) {
      next(error);
    }
  },
  
  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
          const { tripId } = req.params;
          const trip = await tripService.getTripById(tripId);
          res.json({ success: true, data: trip });
      } catch (error: any) {
          next(error);
      }
  }
};