import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { generateItinerary } from '../services/itineraryAiService';

// GET /api/itinerary/trip/:tripId
export const getItinerary = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { data, error } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number')
      .order('time_slot');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/itinerary/:tripId — add single stop
export const addStop = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId     = (req as any).user?.id;
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', tripId).single();
    if (!trip || trip.organizer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the organiser can edit the itinerary' });
    }
    const { day_number, time_slot, location_name, description, estimated_cost, category } = req.body;
    const { data, error } = await supabase.from('itinerary_items').insert({
      trip_id:        tripId,
      day_number:     parseInt(day_number) || 1,
      time_slot:      time_slot      || 'Morning',
      location_name:  location_name?.trim(),
      description:    description?.trim() || null,
      estimated_cost: parseFloat(estimated_cost) || 0,
      category:       category || 'SIGHTSEEING',
    }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/itinerary/:itemId
export const updateStop = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId     = (req as any).user?.id;
    const { data: item } = await supabase.from('itinerary_items').select('trip_id').eq('id', itemId).single();
    if (!item) return res.status(404).json({ success: false, error: 'Stop not found' });
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', item.trip_id).single();
    if (!trip || trip.organizer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the organiser can edit the itinerary' });
    }
    const { day_number, time_slot, location_name, description, estimated_cost, category } = req.body;
    const { data, error } = await supabase.from('itinerary_items').update({
      day_number:     parseInt(day_number) || 1,
      time_slot:      time_slot || 'Morning',
      location_name:  location_name?.trim(),
      description:    description?.trim() || null,
      estimated_cost: parseFloat(estimated_cost) || 0,
      category:       category || 'SIGHTSEEING',
      updated_at:     new Date().toISOString(),
    }).eq('id', itemId).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/itinerary/:itemId
export const deleteStop = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId     = (req as any).user?.id;
    const { data: item } = await supabase.from('itinerary_items').select('trip_id').eq('id', itemId).single();
    if (!item) return res.status(404).json({ success: false, error: 'Stop not found' });
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', item.trip_id).single();
    if (!trip || trip.organizer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the organiser can delete itinerary stops' });
    }
    const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/ai/trips/:tripId/regenerate — generate full AI plan
export const regenerateAI = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId     = (req as any).user?.id;
    const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).single();
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    if (trip.organizer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the organiser can generate the itinerary' });
    }

    const stops = await generateItinerary({
      startLocation: trip.start_location,
      destination:   trip.destination,
      stops:         trip.stops || [],
      startDate:     trip.start_date,
      endDate:       trip.end_date,
      budget:        trip.budget,
      interests:     trip.interests || [],
    });

    // Replace existing itinerary
    await supabase.from('itinerary_items').delete().eq('trip_id', tripId);
    const { data, error } = await supabase
      .from('itinerary_items')
      .insert(stops.map(s => ({ ...s, trip_id: tripId })))
      .select();
    if (error) throw error;

    res.json({ success: true, data, count: data?.length });
  } catch (err: any) {
    console.error('AI regenerate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
