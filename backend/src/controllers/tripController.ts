import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';

export const tripController = {
  /**
   * POST /api/trips
   */
  createTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { 
        name, 
        destination, 
        start_location, 
        start_date, 
        end_date, 
        budget, 
        mode, 
        interests,
        destination_lat,
        destination_lng,
        start_lat,
        start_lng
      } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const userId = req.user.id;

      console.log("📝 Creating Trip:", { name, destination, mode, userId });

      // 1. Create the Trip with Coordinates
      const newTrip = await tripService.createTrip({
        organizer_id: userId,
        name,
        destination,
        start_location,
        destination_lat: destination_lat ? parseFloat(destination_lat) : null,
        destination_lng: destination_lng ? parseFloat(destination_lng) : null,
        start_lat: start_lat ? parseFloat(start_lat) : null,
        start_lng: start_lng ? parseFloat(start_lng) : null,
        start_date,
        end_date,
        budget: parseFloat(budget),
        mode,
        status: 'PLANNING',      });

      console.log("✅ Trip Created in DB:", newTrip.id);

      // 2. Add User as ORGANIZER
      const { error: memberError } = await supabaseAdmin.from('trip_members').insert({
        trip_id: newTrip.id,
        user_id: userId,
        role: 'ORGANIZER'
      });

      if (memberError) {
        console.error("❌ Failed to add organizer:", memberError);
        await supabaseAdmin.from('trips').delete().eq('id', newTrip.id);
        throw memberError;
      }

      // 3. AI Generation Logic
      if (mode === 'AI' && interests && start_location) {
        try {
          const days = Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;

          const aiItems = await aiService.generateItinerary({
            destination,
            days,
            budget: parseFloat(budget),
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
              console.error('⚠️ Failed to insert AI items:', insertError);
            } else {
              console.log("✅ AI Itinerary Generated");
            }
          }
        } catch (aiError: any) {
          console.error('⚠️ AI Generation failed but trip created:', aiError.message);
        }
      }

      res.status(201).json({ success: true,  newTrip });
    } catch (error: any) {      console.error("❌ CRITICAL ERROR in createTrip:", error);
      next(error);
    }
  },

  getMyTrips: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data: membersData, error: memberError } = await supabaseAdmin
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;
      const memberTripIds = membersData?.map((m: any) => m.trip_id) || [];

      const { data: ownedData, error: ownerError } = await supabaseAdmin
        .from('trips')
        .select('id')
        .eq('organizer_id', userId);

      if (ownerError) throw ownerError;
      const ownedTripIds = ownedData?.map((t: any) => t.id) || [];

      const allTripIds = [...new Set([...memberTripIds, ...ownedTripIds])];

      if (allTripIds.length === 0) {
        return res.json({ success: true,  [] });
      }

      const { data: trips, error: tripsError } = await supabaseAdmin
        .from('trips')
        .select('*')
        .in('id', allTripIds)
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      res.json({ success: true,  trips });
    } catch (error: any) {
      next(error);
    }
  },

  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      const { data: trip, error } = await supabaseAdmin        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error || !trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      res.json({ success: true,  trip });
    } catch (error: any) {
      next(error);
    }
  },

  joinTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      if (!tripId) {
        return res.status(400).json({ success: false, error: 'Trip ID is required' });
      }

      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('id, name')
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      const { data: existingMember } = await supabaseAdmin
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        return res.status(400).json({ success: false, error: 'You are already a member of this trip' });
      }

      const { data: newMember, error: memberError } = await supabaseAdmin
        .from('trip_members')
        .insert({
          trip_id: tripId,
          user_id: userId,          role: 'PARTICIPANT'
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // ✅ FIX: Added 'data:' key here
      res.json({
        success: true,
        message: `Successfully joined ${trip.name}!`,
         newMember
      });

    } catch (error: any) {
      next(error);
    }
  },

  updateTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

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

      res.json({ success: true,  updatedTrip });
    } catch (error: any) {
      next(error);
    }
  },
  deleteTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      if (!tripId) {
        return res.status(400).json({ success: false, error: 'Trip ID is required' });
      }

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

      const { error: deleteError } = await supabaseAdmin
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (deleteError) throw deleteError;

      res.json({
        success: true,
        message: 'Trip and all associated data deleted successfully.'
      });

    } catch (error: any) {
      next(error);
    }
  }
};