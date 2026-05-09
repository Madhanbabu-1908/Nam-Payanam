import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { tripService } from '../services/tripService';
import { aiService } from '../services/aiService';
import { supabaseAdmin } from '../config/db';
import { getRealRoute } from '../utils/routeUtils';

export const tripController = {

  // ✅ CREATE TRIP
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

      // 1. Validate Required Fields
      if (!name || !destination || !start_date || !end_date) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: name, destination, start_date, end_date' 
        });
      }

      const userId = req.user.id;
      console.log(`🚀 Creating trip for user: ${userId}`);

      let routeCoords: [number, number][] = [];

      if (start_lat && start_lng && destination_lat && destination_lng) {
        try {
          routeCoords = await getRealRoute(
            [Number(start_lat), Number(start_lng)],
            [Number(destination_lat), Number(destination_lng)]
          );
        } catch (routeErr) {
          console.warn("⚠️ Route fetch failed, continuing without route:", routeErr);
        }
      }

      const tripCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 2. Prepare Data with Safe Defaults
      const tripData = {
        organizer_id: userId,
        name,
        destination,
        start_location,
        destination_lat: destination_lat ? Number(destination_lat) : undefined,
        destination_lng: destination_lng ? Number(destination_lng) : undefined,
        start_lat: start_lat ? Number(start_lat) : undefined,
        start_lng: start_lng ? Number(start_lng) : undefined,
        
        route: routeCoords.length > 0
          ? { type: "LineString" as const, coordinates: routeCoords } 
          : undefined, 
        
        start_date,
        end_date,
        budget: budget ? Number(budget) : 0,
        mode: mode || 'MANUAL',
        status: 'PLANNING' as const,
        trip_code: tripCode,
      };

      // 3. Create Trip
      const newTrip = await tripService.createTrip(tripData);

      if (!newTrip || !newTrip.id) {
        throw new Error("Trip creation returned no ID");
      }

      // 4. Add Organizer as Member
      const { error: memberError } = await supabaseAdmin.from('trip_members').insert({
        trip_id: newTrip.id,
        user_id: userId,
        role: 'ORGANIZER'
      });

      if (memberError) {
        console.error("❌ Failed to add organizer as member:", memberError);
        await supabaseAdmin.from('trips').delete().eq('id', newTrip.id);
        throw new Error("Failed to assign organizer role");
      }

      // 5. AI Itinerary Generation (Non-blocking)
      if (mode === 'AI' && interests && start_location) {
        aiService.generateItinerary(
          `${Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} day trip from ${start_location} to ${destination} with budget ${budget}. Interests: ${interests}`
        ).then(async (aiResponse) => {
          if (aiResponse?.days) {
             const items = aiResponse.days.flatMap((day: any) =>
              (day.activities || []).map((act: any) => ({
                trip_id: newTrip.id,
                day: day.day,
                title: act.place,
                time: act.time,
                notes: act.notes
              }))
            );
            if (items.length) {
              await supabaseAdmin.from('itinerary_items').insert(items);
              console.log("✅ AI Itinerary generated");
            }
          }
        }).catch(err => console.error("❌ AI Background Job Failed:", err));
      }

      res.status(201).json({ success: true, data: newTrip });

    } catch (error: any) {
      console.error("❌ createTrip CRITICAL ERROR:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to create trip',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  },

  // ✅ GET MY TRIPS
  getMyTrips: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data: members } = await supabaseAdmin
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', userId);

      const ids = members?.map((m: any) => m.trip_id) || [];

      if (!ids.length) return res.json({ success: true, data: [] });

      const { data: trips } = await supabaseAdmin
        .from('trips')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });

      res.json({ success: true, data: trips || [] });

    } catch (err: any) {
      next(err);
    }
  },

  // ✅ GET TRIP
  getTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      res.json({ success: true, data: trip });

    } catch (err: any) {
      next(err);
    }
  },

  // ✅ JOIN TRIP
  joinTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const userId = req.user!.id;

      const { data: existing } = await supabaseAdmin
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        return res.json({ success: true, message: 'Already joined' });
      }

      await supabaseAdmin.from('trip_members').insert({
        trip_id: tripId,
        user_id: userId,
        role: 'PARTICIPANT'
      });

      res.json({ success: true, message: 'Joined successfully' });

    } catch (err: any) {
      next(err);
    }
  },

  // ✅ JOIN BY CODE
  joinByCode: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body;
      const userId = req.user!.id;

      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('trip_code', code)
        .single();

      if (!trip) {
        return res.status(404).json({ success: false, error: 'Invalid code' });
      }

      await supabaseAdmin.from('trip_members').insert({
        trip_id: trip.id,
        user_id: userId,
        role: 'PARTICIPANT'
      });

      res.json({ success: true, data: trip });

    } catch (err: any) {
      next(err);
    }
  },

  // ✅ UPDATE TRIP
  updateTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      const updates = req.body;

      const { data, error } = await supabaseAdmin
        .from('trips')
        .update({
          ...updates,
          destination_lat: updates.destination_lat ?? undefined,
          destination_lng: updates.destination_lng ?? undefined,
          start_lat: updates.start_lat ?? undefined,
          start_lng: updates.start_lng ?? undefined,
        })
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, data });

    } catch (err: any) {
      next(err);
    }
  },

  // ✅ DELETE TRIP
  deleteTrip: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      const { error } = await supabaseAdmin
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      res.json({ success: true, message: 'Trip deleted' });

    } catch (err: any) {
      next(err);
    }
  },

  // ✅ MEMBERS (FIXED: Manual Join to avoid Schema Relationship Error)
  getMembers: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;

      // 1. Fetch member IDs and roles from trip_members
      const { data: members, error: membersError } = await supabaseAdmin
        .from('trip_members')
        .select('user_id, role')
        .eq('trip_id', tripId);

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // 2. Extract user IDs
      const userIds = members.map(m => m.user_id);

      // 3. Fetch profile details for these users
      // Ensure your profiles table has an 'id' column that matches auth.users.id
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // 4. Combine the data manually
      const enrichedMembers = members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          user_id: member.user_id,
          role: member.role,
          profiles: profile ? {
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url
          } : null
        };
      });

      res.json({ success: true, data: enrichedMembers });

    } catch (err: any) {
      console.error("❌ Get Members Crash:", err);
      next(err);
    }
  }
};
