import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';

export const tripController = {
  /**
   * GET /api/trips/my
   * Fetches all trips where the user is either an Organizer or a Member.
   */
  getMyTrips: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      // 1. Get all trip IDs where user is a member
      const { data: membersData, error: memberError } = await supabaseAdmin
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;
      const memberTripIds = membersData?.map((m: any) => m.trip_id) || [];

      // 2. Get all trip IDs where user is the organizer
      const { data: ownedData, error: ownerError } = await supabaseAdmin
        .from('trips')
        .select('id')
        .eq('organizer_id', userId);

      if (ownerError) throw ownerError;
      const ownedTripIds = ownedData?.map((t: any) => t.id) || [];

      // 3. Combine and remove duplicates
      const allTripIds = [...new Set([...memberTripIds, ...ownedTripIds])];

      if (allTripIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // 4. Fetch full trip details
      const { data: trips, error: tripsError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .in('id', allTripIds)
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      res.json({ success: true, data: trips });    } catch (error: any) {
      next(error);
    }
  },

  /**
   * POST /api/trips
   * Creates a new trip, adds the user as ORGANIZER, and optionally generates AI itinerary.
   */
  createTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, destination, start_date, end_date, budget, mode, interests, start_location } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const userId = req.user.id;

      // 1. Create the Trip
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

      // 2. Add User as ORGANIZER to trip_members
      const { error: memberError } = await supabaseAdmin.from('trip_members').insert({
        trip_id: newTrip.id,
        user_id: userId,
        role: 'ORGANIZER'
      });

      if (memberError) {
        // Rollback trip creation if member insertion fails
        await supabaseAdmin.from('trips').delete().eq('id', newTrip.id);
        throw memberError;
      }

      // 3. AI Generation Logic (if mode is AI)
      if (mode === 'AI' && interests && start_location) {
        try {
          const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;

          const aiItems = await aiService.generateItinerary({            destination,
            days,
            budget,
            interests: Array.isArray(interests) ? interests : interests.split(',').map((s: string) => s.trim()),
            startLocation: start_location
          });

          const itemsToInsert = aiItems.map((item: any) => ({
            ...item,
            trip_id: newTrip.id
          }));

          if (itemsToInsert.length > 0) {
            const { error: insertError } = await supabaseAdmin.from('itinerary_items').insert(itemsToInsert);
            if (insertError) {
              console.error('Failed to insert AI items:', insertError);
              // We don't throw here to avoid failing the whole trip creation, just log it
            }
          }
        } catch (aiError: any) {
          console.error('AI Generation failed but trip created:', aiError.message);
          // Continue without failing the request
        }
      }

      res.status(201).json({ success: true, data: newTrip });
    } catch (error: any) {
      next(error);
    }
  },

  /**
   * GET /api/trips/:tripId
   * Fetches details of a single trip.
   */
  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      
      const { data: trip, error } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error || !trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      res.json({ success: true, data: trip });    } catch (error: any) {
      next(error);
    }
  },

  /**
   * POST /api/trips/:tripId/join
   * Allows an authenticated user to join an existing trip as a PARTICIPANT.
   */
  joinTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      if (!tripId) {
        return res.status(400).json({ success: false, error: 'Trip ID is required' });
      }

      // 1. Verify Trip Exists
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('id, name')
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      // 2. Check if User is Already a Member
      const { data: existingMember } = await supabaseAdmin
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        return res.status(400).json({ success: false, error: 'You are already a member of this trip' });
      }

      // 3. Add User as PARTICIPANT
      const { data: newMember, error: memberError } = await supabaseAdmin
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: userId,
          role: 'PARTICIPANT'
        })
        .select()        .single();

      if (memberError) throw memberError;

      res.json({
        success: true,
        message: `Successfully joined ${trip.name}!`,
        data: newMember
      });

    } catch (error: any) {
      next(error);
    }
  },

  /**
   * PUT/PATCH /api/trips/:tripId
   * Updates trip details (Organizer only).
   */
  updateTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

      // Verify Ownership
      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('organizer_id')
        .eq('id', tripId)
        .single();

      if (!trip || trip.organizer_id !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Only organizer can update' });
      }

      const { data: updatedTrip, error } = await supabaseAdmin
        .from('trips')
        .update(updates)
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, data: updatedTrip });
    } catch (error: any) {
      next(error);
    }
  },
  /**
   * DELETE /api/trips/:tripId
   * Deletes a trip and all associated data (Organizer only).
   */
  deleteTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      if (!tripId) {
        return res.status(400).json({ success: false, error: 'Trip ID is required' });
      }

      // 1. Verify Ownership
      const { data: trip, error: fetchError } = await supabaseAdmin
        .from('trips')
        .select('organizer_id')
        .eq('id', tripId)
        .single();

      if (fetchError || !trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      if (trip.organizer_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Only the trip organizer can delete this trip.'
        });
      }

      // 2. Delete Trip
      // Due to ON DELETE CASCADE in DB, this removes:
      // - itinerary_items
      // - expenses (and splits)
      // - trip_members
      const { error: deleteError } = await supabaseAdmin
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (deleteError) throw deleteError;

      res.json({
        success: true,
        message: 'Trip and all associated data deleted successfully.'
      });

    } catch (error: any) {      next(error);
    }
  }
};