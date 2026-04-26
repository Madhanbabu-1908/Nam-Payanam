import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// POST /api/checkins
export const checkIn = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { tripId, locationName, latitude, longitude, status } = req.body;

    if (!tripId || !locationName?.trim()) {
      return res.status(400).json({ success: false, error: 'tripId and locationName are required' });
    }

    // Verify user is a trip member or organiser
    const { data: trip } = await supabase.from('trips').select('organizer_id').eq('id', tripId).single();
    const { data: member } = await supabase.from('trip_members').select('id').eq('trip_id', tripId).eq('user_id', userId).single();
    if (!trip || (!member && trip.organizer_id !== userId)) {
      return res.status(403).json({ success: false, error: 'You are not a member of this trip' });
    }

    // Upsert: one active check-in per user per trip
    const { data, error } = await supabase
      .from('checkins')
      .upsert({
        trip_id:       tripId,
        user_id:       userId,
        location_name: locationName.trim(),
        latitude:      latitude  || null,
        longitude:     longitude || null,
        status:        status    || 'PRESENT',
        is_active:     true,
        checked_in_at: new Date().toISOString(),
      }, { onConflict: 'trip_id,user_id' })
      .select('*, user:profiles(full_name, email)')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/checkins/trip/:tripId — all active check-ins for a trip
export const getTripCheckins = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { data, error } = await supabase
      .from('checkins')
      .select('*, user:profiles(full_name, email)')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .order('checked_in_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/checkins/:checkinId — cancel your own check-in
export const cancelCheckin = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { checkinId } = req.params;
    const { error } = await supabase
      .from('checkins')
      .update({ is_active: false })
      .eq('id', checkinId)
      .eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
