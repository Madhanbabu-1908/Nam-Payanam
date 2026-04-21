import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';

export const tripController = {
  getMyTrips: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { data: membersData, error: memberError } = await supabaseAdmin
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId);
      if (memberError) throw memberError;
      const memberTripIds = membersData?.map(m => m.trip_id) || [];

      const { data: ownedData, error: ownerError } = await supabaseAdmin
        .from('trips')
        .select('id')
        .eq('organizer_id', userId);
      if (ownerError) throw ownerError;
      const ownedTripIds = ownedData?.map(t => t.id) || [];

      const allTripIds = [...new Set([...memberTripIds, ...ownedTripIds])];
      if (allTripIds.length === 0) return res.json({ success: true, data: [] });

      const { data: trips, error: tripsError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .in('id', allTripIds)
        .order('created_at', { ascending: false });
      if (tripsError) throw tripsError;

      res.json({ success: true, data: trips });
    } catch (error: any) { next(error); }
  },

  createTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, destination, start_date, end_date, budget, mode, interests, start_location } = req.body;
      if (!req.user) return res.status(401).json({ success: false, error: 'User not authenticated' });
      
      const userId = req.user.id;
      const newTrip = await tripService.createTrip({
        organizer_id: userId, name, destination, start_date, end_date, budget, mode, status: 'PLANNING',
      });

      await supabaseAdmin.from('trip_members').insert({
        trip_id: newTrip.id, user_id: userId, role: 'ORGANIZER'      });

      if (mode === 'AI' && interests && start_location) {
        const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const aiItems = await aiService.generateItinerary({ destination, days, budget, interests, startLocation: start_location });
        const itemsToInsert = aiItems.map((item: any) => ({ ...item, trip_id: newTrip.id }));
        if (itemsToInsert.length > 0) await supabaseAdmin.from('itinerary_items').insert(itemsToInsert);
      }

      res.status(201).json({ success: true, data: newTrip });
    } catch (error: any) { next(error); }
  },

  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const trip = await tripService.getTripById(tripId);
      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
      res.json({ success: true, data: trip });
    } catch (error: any) { next(error); }
  },

  // ✅ NEW: Join a Trip
  joinTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      if (!tripId) return res.status(400).json({ success: false, error: 'Trip ID required' });

      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips').select('id, name').eq('id', tripId).single();
      if (tripError || !trip) return res.status(404).json({ success: false, error: 'Trip not found' });

      const { data: existing } = await supabaseAdmin
        .from('trip_members').select('id').eq('trip_id', tripId).eq('user_id', userId).single();
      if (existing) return res.status(400).json({ success: false, error: 'Already a member' });

      const { data: newMember, error: memberError } = await supabaseAdmin
        .from('trip_members').insert({ trip_id: tripId, user_id: userId, role: 'PARTICIPANT' }).select().single();
      if (memberError) throw memberError;

      res.json({ success: true, message: `Joined ${trip.name}!`, data: newMember });
    } catch (error: any) { next(error); }
  },

  deleteTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;      const { data: trip } = await supabaseAdmin.from('trips').select('organizer_id').eq('id', tripId).single();
      if (!trip || trip.organizer_id !== userId) return res.status(403).json({ success: false, error: 'Unauthorized' });
      
      await supabaseAdmin.from('trips').delete().eq('id', tripId);
      res.json({ success: true, message: 'Trip deleted' });
    } catch (error: any) { next(error); }
  }
};