const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { generateTripPlans } = require('../services/groqService');

function generateTripCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getAIPlans(req, res) {
  try {
    const { startLocation, endLocation, stops, startDate, endDate, groupSize, budget, preferences, routeDistances } = req.body;
    if (!startLocation || !endLocation || !startDate || !endDate || !groupSize) {
      return res.status(400).json({ error: 'Missing required trip fields' });
    }
    const plans = await generateTripPlans({ startLocation, endLocation, stops, startDate, endDate, groupSize, budget, preferences, routeDistances });
    res.json({ plans });
  } catch (err) {
    console.error('AI Plans error:', err);
    res.status(500).json({ error: 'Failed to generate AI plans', details: err.message });
  }
}

async function createTrip(req, res) {
  try {
    const { title, organizerName, startLocation, endLocation, stops, startDate, endDate, groupSize, selectedPlan, planIndex, sessionId, routeDistances } = req.body;
    if (!title || !organizerName || !startLocation || !endLocation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    let tripCode;
    let exists = true;
    while (exists) {
      tripCode = generateTripCode();
      const { data } = await supabase.from('trips').select('id').eq('trip_code', tripCode).single();
      exists = !!data;
    }
    const organizerId = uuidv4();
    const { data: trip, error: tripError } = await supabase.from('trips').insert({
      trip_code: tripCode, title, organizer_id: organizerId, organizer_name: organizerName,
      start_location: startLocation, end_location: endLocation, stops: stops || [],
      start_date: startDate, end_date: endDate, group_size: groupSize,
      ai_plan: selectedPlan, selected_plan_index: planIndex || 0, status: 'planning'
    }).select().single();
    if (tripError) throw tripError;
    const { data: member, error: memberError } = await supabase.from('trip_members').insert({
      trip_id: trip.id, member_id: organizerId, nickname: organizerName, is_organizer: true
    }).select().single();
    if (memberError) throw memberError;
    if (routeDistances?.length > 0) {
      await supabase.from('route_distances').insert(routeDistances.map(d => ({
        trip_id: trip.id, from_location: d.from, to_location: d.to,
        distance_km: d.distance_km, duration_minutes: d.duration_minutes
      })));
    }
    if (selectedPlan?.days?.length > 0) {
      const dayInserts = selectedPlan.days.map(day => ({
        trip_id: trip.id, day_number: day.dayNumber, date: day.date,
        title: day.title, stops: day.stops, notes: day.notes, is_reached: false
      }));
      await supabase.from('trip_days').insert(dayInserts);
    }
    await supabase.from('trip_progress').insert({ trip_id: trip.id, current_stop_index: 0 });
    if (sessionId) {
      await supabase.from('member_sessions').upsert({
        session_id: sessionId, trip_id: trip.id, member_id: organizerId,
        member_row_id: member.id, nickname: organizerName, is_organizer: true,
        trip_code: tripCode, last_seen: new Date().toISOString()
      }, { onConflict: 'session_id,trip_code' });
    }
    res.json({ tripId: trip.id, tripCode, organizerId, memberId: member.id, trip });
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ error: 'Failed to create trip', details: err.message });
  }
}

async function getTripByCode(req, res) {
  try {
    const { code } = req.params;
    const { data: trip, error } = await supabase.from('trips').select('*').eq('trip_code', code.toUpperCase()).single();
    if (error || !trip) return res.status(404).json({ error: 'Trip not found' });
    const [{ data: members }, { data: days }, { data: progress }, { data: breakStops }, { data: routeDistances }] = await Promise.all([
      supabase.from('trip_members').select('*').eq('trip_id', trip.id).order('joined_at'),
      supabase.from('trip_days').select('*').eq('trip_id', trip.id).order('day_number'),
      supabase.from('trip_progress').select('*').eq('trip_id', trip.id).single(),
      supabase.from('break_stops').select('*').eq('trip_id', trip.id).order('created_at'),
      supabase.from('route_distances').select('*').eq('trip_id', trip.id)
    ]);
    res.json({ trip, members: members || [], days: days || [], progress, breakStops: breakStops || [], routeDistances: routeDistances || [] });
  } catch (err) {
    console.error('Get trip error:', err);
    res.status(500).json({ error: 'Failed to get trip' });
  }
}

async function joinTrip(req, res) {
  try {
    const { code } = req.params;
    const { nickname, sessionId } = req.body;
    if (!nickname?.trim()) return res.status(400).json({ error: 'Nickname required' });
    const { data: trip, error: tripError } = await supabase.from('trips').select('id, group_size, status').eq('trip_code', code.toUpperCase()).single();
    if (tripError || !trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status === 'completed') return res.status(400).json({ error: 'This trip has ended' });
    const { count } = await supabase.from('trip_members').select('*', { count: 'exact', head: true }).eq('trip_id', trip.id);
    if (count >= trip.group_size) return res.status(400).json({ error: 'Group is full' });
    const { data: existing } = await supabase.from('trip_members').select('id').eq('trip_id', trip.id).eq('nickname', nickname.trim()).single();
    if (existing) return res.status(400).json({ error: 'Nickname already taken' });
    const { data: member, error: memberError } = await supabase.from('trip_members').insert({ trip_id: trip.id, nickname: nickname.trim(), is_organizer: false }).select().single();
    if (memberError) throw memberError;
    if (sessionId) {
      await supabase.from('member_sessions').upsert({
        session_id: sessionId, trip_id: trip.id, member_id: uuidv4(),
        member_row_id: member.id, nickname: nickname.trim(), is_organizer: false,
        trip_code: code.toUpperCase(), last_seen: new Date().toISOString()
      }, { onConflict: 'session_id,trip_code' });
    }
    res.json({ memberId: member.id, member, tripId: trip.id });
  } catch (err) {
    console.error('Join trip error:', err);
    res.status(500).json({ error: 'Failed to join trip' });
  }
}

async function getSessionTrips(req, res) {
  try {
    const { sessionId } = req.params;
    const { data: sessions } = await supabase.from('member_sessions').select('*').eq('session_id', sessionId).order('last_seen', { ascending: false });
    if (!sessions?.length) return res.json({ trips: [] });
    const tripCodes = sessions.map(s => s.trip_code);
    const { data: trips } = await supabase.from('trips').select('id, trip_code, title, start_location, end_location, start_date, end_date, status, group_size').in('trip_code', tripCodes);
    const enriched = sessions.map(s => { const trip = trips?.find(t => t.trip_code === s.trip_code); return trip ? { ...s, trip } : null; }).filter(Boolean);
    res.json({ trips: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get session trips' });
  }
}

async function touchSession(req, res) {
  try {
    const { sessionId, tripCode } = req.body;
    await supabase.from('member_sessions').update({ last_seen: new Date().toISOString() }).eq('session_id', sessionId).eq('trip_code', tripCode);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
}

async function removeMember(req, res) {
  try {
    const { tripId, memberId } = req.params;
    const { organizerId } = req.body;
    const { data: organizer } = await supabase.from('trip_members').select('is_organizer').eq('trip_id', tripId).eq('member_id', organizerId).single();
    if (!organizer?.is_organizer) return res.status(403).json({ error: 'Only organizer can remove members' });
    const { error } = await supabase.from('trip_members').delete().eq('id', memberId).eq('trip_id', tripId).eq('is_organizer', false);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to remove member' }); }
}

async function deleteTrip(req, res) {
  try {
    const { tripId } = req.params;
    const { organizerId } = req.body;
    if (!organizerId) return res.status(400).json({ error: 'Organizer ID required' });
    const { data: trip } = await supabase.from('trips').select('organizer_id, trip_code').eq('id', tripId).single();
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.organizer_id !== organizerId) return res.status(403).json({ error: 'Only the trip organizer can delete this group' });
    await supabase.from('member_sessions').delete().eq('trip_id', tripId);
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) throw error;
    res.json({ success: true, message: 'Trip and all data deleted' });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ error: 'Failed to delete trip', details: err.message });
  }
}

async function updateTripStatus(req, res) {
  try {
    const { tripId } = req.params;
    const { status, organizerId } = req.body;
    const { data: organizer } = await supabase.from('trip_members').select('is_organizer').eq('trip_id', tripId).eq('member_id', organizerId).single();
    if (!organizer?.is_organizer) return res.status(403).json({ error: 'Only organizer can update trip status' });
    const { data: trip, error } = await supabase.from('trips').update({ status, updated_at: new Date().toISOString() }).eq('id', tripId).select().single();
    if (error) throw error;
    if (status === 'active') await supabase.from('trip_progress').update({ started_at: new Date().toISOString() }).eq('trip_id', tripId);
    else if (status === 'completed') await supabase.from('trip_progress').update({ completed_at: new Date().toISOString() }).eq('trip_id', tripId);
    res.json({ trip });
  } catch (err) { res.status(500).json({ error: 'Failed to update status' }); }
}

async function updateProgress(req, res) {
  try {
    const { tripId } = req.params;
    const { currentStopIndex, dayReached } = req.body;
    await supabase.from('trip_progress').update({ current_stop_index: currentStopIndex, updated_at: new Date().toISOString() }).eq('trip_id', tripId);
    if (dayReached !== undefined) await supabase.from('trip_days').update({ is_reached: true }).eq('trip_id', tripId).eq('day_number', dayReached);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to update progress' }); }
}

async function addBreakStop(req, res) {
  try {
    const { tripId, dayNumber, addedByNickname, reason, location, activities, durationMinutes } = req.body;
    if (!tripId || !reason || !addedByNickname) return res.status(400).json({ error: 'tripId, reason, addedByNickname required' });
    const { data: breakStop, error } = await supabase.from('break_stops').insert({
      trip_id: tripId, day_number: dayNumber || 1, added_by_nickname: addedByNickname,
      reason: reason.trim(), location: location?.trim() || null,
      activities: activities?.trim() || null, duration_minutes: durationMinutes || null
    }).select().single();
    if (error) throw error;
    res.json({ breakStop });
  } catch (err) { res.status(500).json({ error: 'Failed to add break stop' }); }
}

async function getBreakStops(req, res) {
  try {
    const { tripId } = req.params;
    const { data: breakStops, error } = await supabase.from('break_stops').select('*').eq('trip_id', tripId).order('created_at');
    if (error) throw error;
    res.json({ breakStops: breakStops || [] });
  } catch (err) { res.status(500).json({ error: 'Failed to get break stops' }); }
}

module.exports = { getAIPlans, createTrip, getTripByCode, joinTrip, removeMember, deleteTrip, updateTripStatus, updateProgress, addBreakStop, getBreakStops, getSessionTrips, touchSession };
