import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { generateItinerary } from '../services/itineraryAiService';

// GET /api/itinerary/trips/:tripId
export const getItinerary = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { data, error } = await supabase
      .from('itinerary_stops')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number').order('time_of_day');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/itinerary/trips/:tripId  — add single stop
export const addStop = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user?.id;
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', tripId).single();
    if (!trip || trip.organizer_id !== userId) return res.status(403).json({ success: false, error: 'Only organiser can edit itinerary' });

    const { name, stop_type, day_number, time_of_day, duration_minutes, cost_estimate, notes, latitude, longitude } = req.body;
    const { data, error } = await supabase.from('itinerary_stops').insert({
      trip_id: tripId, name, stop_type: stop_type || 'STOP',
      day_number: day_number || 1, time_of_day: time_of_day || '09:00',
      duration_minutes: duration_minutes || 60,
      cost_estimate: parseFloat(cost_estimate) || 0,
      notes: notes || null, latitude: latitude || null, longitude: longitude || null,
    }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/itinerary/:stopId
export const updateStop = async (req: Request, res: Response) => {
  try {
    const { stopId } = req.params;
    const userId = (req as any).user?.id;
    // Verify organiser via join
    const { data: stop } = await supabase.from('itinerary_stops').select('trip_id').eq('id', stopId).single();
    if (!stop) return res.status(404).json({ success: false, error: 'Stop not found' });
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', stop.trip_id).single();
    if (!trip || trip.organizer_id !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const { name, stop_type, day_number, time_of_day, duration_minutes, cost_estimate, notes, latitude, longitude } = req.body;
    const { data, error } = await supabase.from('itinerary_stops').update({
      name, stop_type, day_number, time_of_day,
      duration_minutes: duration_minutes || 60,
      cost_estimate: parseFloat(cost_estimate) || 0,
      notes: notes || null, latitude: latitude || null, longitude: longitude || null,
      updated_at: new Date().toISOString(),
    }).eq('id', stopId).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/itinerary/:stopId
export const deleteStop = async (req: Request, res: Response) => {
  try {
    const { stopId } = req.params;
    const userId = (req as any).user?.id;
    const { data: stop } = await supabase.from('itinerary_stops').select('trip_id').eq('id', stopId).single();
    if (!stop) return res.status(404).json({ success: false, error: 'Stop not found' });
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', stop.trip_id).single();
    if (!trip || trip.organizer_id !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const { error } = await supabase.from('itinerary_stops').delete().eq('id', stopId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/itinerary/trips/:tripId/generate-ai
export const generateAI = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user?.id;
    const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).single();
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    if (trip.organizer_id !== userId) return res.status(403).json({ success: false, error: 'Only organiser can generate itinerary' });

    const { startLocation, destination, stops, startDate, endDate, budget, interests } = req.body;

    // Generate via AI
    const aiStops = await generateItinerary({
      startLocation: startLocation || trip.start_location,
      destination:   destination   || trip.destination,
      stops:         stops         || trip.stops || [],
      startDate:     startDate     || trip.start_date,
      endDate:       endDate       || trip.end_date,
      budget:        budget        || trip.budget,
      interests:     interests     || trip.interests || [],
    });

    // Delete existing stops
    await supabase.from('itinerary_stops').delete().eq('trip_id', tripId);

    // Insert all new stops
    const rows = aiStops.map(s => ({ ...s, trip_id: tripId }));
    const { data, error } = await supabase.from('itinerary_stops').insert(rows).select();
    if (error) throw error;

    res.json({ success: true, data, count: data?.length });
  } catch (err: any) {
    console.error('AI itinerary error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
