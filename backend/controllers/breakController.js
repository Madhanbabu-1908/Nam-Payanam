const supabase = require('../db/supabase');

const BREAK_TYPES = ['food','fuel','rest','attraction','hotel','medical','viewpoint','shopping','other'];

// Helper: Get max day number for a trip from itinerary table
async function getMaxDayForTrip(tripId) {
  try {
    const { data } = await supabase
      .from('trip_itineraries') // Adjust table name as per your schema
      .select('day_number')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: false })
      .limit(1);
    
    return data?.[0]?.day_number || 0;
  } catch (err) {
    console.warn('Could not fetch max day for trip:', err);
    return 0; // Fallback
  }
}

async function addBreak(req, res) {
  try {
    const {
      tripId, dayNumber, addedByNickname, stopName, breakType, customType,
      description, locationName, locationLat, locationLng,
      checkinTime, checkoutTime, photoUrl
    } = req.body;

    if (!tripId || !stopName || !addedByNickname)
      return res.status(400).json({ error: 'tripId, stopName and addedByNickname required' });

    const type = BREAK_TYPES.includes(breakType) ? breakType : 'other';

    let duration = null;
    if (checkinTime && checkoutTime) {
      duration = Math.round((new Date(checkoutTime) - new Date(checkinTime)) / 60000);
    }

    // 👇 VALIDATION: Prevent invalid day numbers
    const maxDay = await getMaxDayForTrip(tripId);
    if (dayNumber > maxDay && dayNumber !== 0) {
      return res.status(400).json({ error: `Invalid day number. Max allowed: ${maxDay}` });
    }

    const { data: breakEntry, error } = await supabase.from('trip_breaks').insert({
      trip_id: tripId,
      day_number: dayNumber || 0,
      added_by_nickname: addedByNickname,
      stop_name: stopName,      break_type: type,
      custom_type: type === 'other' ? customType : null,
      description: description || null,
      location_name: locationName || null,
      location_lat: locationLat || null,
      location_lng: locationLng || null,
      checkin_time: checkinTime || new Date().toISOString(),
      checkout_time: checkoutTime || null,
      duration_minutes: duration,
      photo_url: photoUrl || null,
    }).select().single();

    if (error) throw error;
    res.json({ breakEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateBreak(req, res) {
  try {
    const { breakId } = req.params;
    const updates = { ...req.body };

    if (updates.checkinTime && updates.checkoutTime) {
      updates.duration_minutes = Math.round(
        (new Date(updates.checkoutTime) - new Date(updates.checkinTime)) / 60000);
    }

    // 👇 VALIDATION: Also validate on update
    if (updates.dayNumber !== undefined) {
      const { data: existing } = await supabase.from('trip_breaks').select('trip_id').eq('id', breakId).single();
      if (existing) {
        const maxDay = await getMaxDayForTrip(existing.trip_id);
        if (updates.dayNumber > maxDay && updates.dayNumber !== 0) {
          return res.status(400).json({ error: `Invalid day number. Max allowed: ${maxDay}` });
        }
      }
    }

    const { data, error } = await supabase.from('trip_breaks')
      .update(updates).eq('id', breakId).select().single();

    if (error) throw error;
    res.json({ breakEntry: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function deleteBreak(req, res) {
  try {
    const { breakId } = req.params;
    await supabase.from('trip_breaks').delete().eq('id', breakId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTripBreaks(req, res) {
  try {
    const { tripId } = req.params;
    const { data } = await supabase.from('trip_breaks').select('*')
      .eq('trip_id', tripId).order('checkin_time', { ascending: false });
    res.json({ breaks: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function checkoutBreak(req, res) {
  try {
    const { breakId } = req.params;
    const checkoutTime = new Date().toISOString();
    const { data: br } = await supabase.from('trip_breaks').select('checkin_time').eq('id', breakId).single();
    const duration = br?.checkin_time
      ? Math.round((new Date(checkoutTime) - new Date(br.checkin_time)) / 60000)
      : null;

    const { data, error } = await supabase.from('trip_breaks')
      .update({ checkout_time: checkoutTime, duration_minutes: duration })
      .eq('id', breakId).select().single();

    if (error) throw error;
    res.json({ breakEntry: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { addBreak, updateBreak, deleteBreak, getTripBreaks, checkoutBreak };
