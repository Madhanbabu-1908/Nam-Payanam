const { v4: uuidv4 } = require('uuid');
const supabase = require('../db/supabase');
const { generateTripPlans, generateFollowUpQuestions } = require('../services/groqService');
const { calculateRoute, searchSuggestions } = require('../services/routeService');
const { getWeatherForLocation } = require('../services/weatherService');

function generateTripCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET /api/trips/search-location?q=Chennai
async function searchLocation(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ results: [] });
    const results = await searchSuggestions(q);
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.json({ results: [] });
  }
}

// POST /api/trips/calculate-route
async function calcRoute(req, res) {
  try {
    const { waypoints } = req.body;
    if (!waypoints || waypoints.length < 2)
      return res.status(400).json({ error: 'At least 2 waypoints required' });
    const routeData = await calculateRoute(waypoints);
    res.json({ routeData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/trips/ai-questions
async function getAIQuestions(req, res) {
  try {
    const questions = await generateFollowUpQuestions(req.body);
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/trips/ai-plans
async function getAIPlans(req, res) {
  try {
    const { startLocation, endLocation, stops, startDate, endDate,
      groupSize, budget, preferences, travelMode, accommodation,
      foodPref, departureTime, waypoints } = req.body;
      
    if (!startLocation || !endLocation || !startDate || !endDate || !groupSize)
      return res.status(400).json({ error: 'Missing required trip fields' });

    let routeData = null;
    if (waypoints?.length >= 2) {
      try { routeData = await calculateRoute(waypoints); } catch (e) {
        console.warn('Route calc failed:', e.message);
      }
    }

    const plans = await generateTripPlans({
      startLocation, endLocation, stops, startDate, endDate,
      groupSize, budget, preferences, travelMode, accommodation,
      foodPref, departureTime, routeData
    });

    res.json({ plans, routeData });
  } catch (err) {
    console.error('AI Plans error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/trips
async function createTrip(req, res) {
  try {
    const {
      title, organizerName, startLocation, startLat, startLng,
      endLocation, endLat, endLng, stops, startDate, endDate,
      groupSize, selectedPlan, planIndex, planMode, manualDays,
      routeData, sessionId, fuelData, preferences,
      stopsData, organiserAccountId
    } = req.body;

    if (!title || !organizerName || !startLocation || !endLocation)
      return res.status(400).json({ error: 'Missing required fields' });

    let tripCode;
    let exists = true;
    while (exists) {
      tripCode = generateTripCode();
      const { data } = await supabase.from('trips').select('id').eq('trip_code', tripCode).single();
      exists = !!data;
    }
    const organizerId = uuidv4();

    const {  trip, error: tripError } = await supabase.from('trips').insert({
      trip_code: tripCode, 
      title, 
      organizer_id: organizerId,
      organizer_name: organizerName,
      start_location: startLocation, 
      start_lat: startLat, 
      start_lng: startLng,
      end_location: endLocation, 
      end_lat: endLat, 
      end_lng: endLng,
      stops: stops || [], 
      stops_data: stopsData || [], 
      route_data: routeData || null,
      start_date: startDate, 
      end_date: endDate, 
      group_size: groupSize,
      ai_plan: selectedPlan || null, 
      selected_plan_index: planIndex || 0,
      plan_mode: planMode || 'ai', 
      fuel_data: fuelData || null,
      preferences: preferences || {}, 
      status: 'planning',
      organiser_account_id: organiserAccountId || null,
    }).select().single(); 

    if (tripError) throw tripError;

    const { data: member, error: memErr } = await supabase.from('trip_members').insert({
      trip_id: trip.id, 
      member_id: organizerId,
      nickname: organizerName, 
      is_organizer: true
    }).select().single();
    
    if (memErr) throw memErr;

    if (sessionId) {
      await supabase.from('user_sessions').upsert({ session_id: sessionId, last_seen: new Date().toISOString() }, { onConflict: 'session_id' });
      await supabase.from('session_trips').upsert({
        session_id: sessionId, 
        trip_id: trip.id, 
        member_id: organizerId,
        nickname: organizerName, 
        is_organizer: true
      }, { onConflict: 'session_id,trip_id' });
    }
    const days = planMode === 'manual' ? manualDays : selectedPlan?.days;
    if (days?.length > 0) {
      let weatherData = null;
      if (startLat && startLng) {
        weatherData = await getWeatherForLocation(startLat, startLng);
      }

      const dayInserts = days.map(day => ({
        trip_id: trip.id,
        day_number: day.dayNumber || day.day_number,
        date: day.date || null,
        title: day.title,
        stops: day.stops || [],
        notes: day.notes || null,
        is_reached: false,
        weather_data: weatherData?.find(w => w.date === day.date) || null,
      }));
      await supabase.from('trip_days').insert(dayInserts);
    }

    await supabase.from('trip_progress').insert({ trip_id: trip.id, current_stop_index: 0 });

    res.json({ tripId: trip.id, tripCode, organizerId, memberId: member.id, trip });
  } catch (err) {
    console.error('Create trip error:', err.message);
    res.status(500).json({ error: err.message });
  }
} // <-- Ensure this brace closes createTrip

// GET /api/trips/:code
async function getTripByCode(req, res) {
  try {
    const { code } = req.params;
    const {  trip, error } = await supabase.from('trips').select('*')
      .eq('trip_code', code.toUpperCase()).neq('status','deleted').single();
    if (error || !trip) return res.status(404).json({ error: 'Trip not found or deleted' });
    
    const [{ data: members }, {  days }, {  progress }] = await Promise.all([
      supabase.from('trip_members').select('*').eq('trip_id', trip.id).order('joined_at'),
      supabase.from('trip_days').select('*').eq('trip_id', trip.id).order('day_number'),
      supabase.from('trip_progress').select('*').eq('trip_id', trip.id).single(),
    ]);

    res.json({ trip, members: members||[], days: days||[], progress });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get trip' });
  }
}
// GET /api/trips/my/:sessionId
async function getMyTrips(req, res) {
  try {
    const { sessionId } = req.params;
    const {  sessionTrips } = await supabase.from('session_trips')
      .select('*, trips(*)').eq('session_id', sessionId).order('joined_at', { ascending: false });
    
    const trips = (sessionTrips || [])
      .filter(st => st.trips && st.trips.status !== 'deleted')
      .map(st => ({ ...st.trips, my_nickname: st.nickname, is_organizer: st.is_organizer, member_id: st.member_id }));

    res.json({ trips });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get trips' });
  }
}

// POST /api/trips/:code/join
async function joinTrip(req, res) {
  try {
    const { code } = req.params;
    const { nickname, sessionId } = req.body;
    if (!nickname?.trim()) return res.status(400).json({ error: 'Nickname required' });
    
    const {  trip } = await supabase.from('trips').select('id,group_size,status')
      .eq('trip_code', code.toUpperCase()).single();
      
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.status === 'completed') return res.status(400).json({ error: 'Trip has ended' });
    if (trip.status === 'deleted') return res.status(404).json({ error: 'Trip not found or deleted' });

    const { count } = await supabase.from('trip_members').select('*', { count: 'exact', head: true }).eq('trip_id', trip.id);
    if (count >= trip.group_size) return res.status(400).json({ error: 'Group is full' });

    const {  existing } = await supabase.from('trip_members').select('id,member_id')
      .eq('trip_id', trip.id).eq('nickname', nickname.trim()).single();
    if (existing) return res.status(400).json({ error: 'Nickname already taken in this trip' });

    const { data: member, error } = await supabase.from('trip_members').insert({
      trip_id: trip.id, nickname: nickname.trim(), is_organizer: false
    }).select().single();
    if (error) throw error;

    if (sessionId) {
      await supabase.from('user_sessions').upsert({ session_id: sessionId, last_seen: new Date().toISOString() }, { onConflict: 'session_id' });
      await supabase.from('session_trips').upsert({
        session_id: sessionId, trip_id: trip.id,
        member_id: member.member_id, nickname: nickname.trim(), is_organizer: false
      }, { onConflict: 'session_id,trip_id' });
    }
    res.json({ memberId: member.id, memberUUID: member.member_id, member, tripId: trip.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/trips/:tripId
async function deleteTrip(req, res) {
  try {
    const { tripId } = req.params;
    const { organizerId } = req.body;
    const {  organizer } = await supabase.from('trip_members').select('is_organizer')
      .eq('trip_id', tripId).eq('member_id', organizerId).single();
      
    if (!organizer?.is_organizer) {
      const {  tripRow } = await supabase.from('trips').select('organizer_id').eq('id', tripId).single();
      if (tripRow?.organizer_id !== organizerId) {
        return res.status(403).json({ error: 'Only organizer can delete trip' });
      }
    }

    await supabase.from('trips').update({ status: 'deleted' }).eq('id', tripId);
    setTimeout(async () => {
      await supabase.from('trips').delete().eq('id', tripId);
    }, 2000);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/trips/:tripId/members/:memberId
async function removeMember(req, res) {
  try {
    const { tripId, memberId } = req.params;
    const { organizerId } = req.body;
    const {  org } = await supabase.from('trip_members').select('is_organizer')
      .eq('trip_id', tripId).eq('member_id', organizerId).single();
      
    if (!org?.is_organizer) return res.status(403).json({ error: 'Only organizer can remove members' });
    
    await supabase.from('trip_members').delete().eq('id', memberId).eq('trip_id', tripId).eq('is_organizer', false);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
// PATCH /api/trips/:tripId/status
async function updateTripStatus(req, res) {
  try {
    const { tripId } = req.params;
    const { status, organizerId } = req.body;
    const {  org } = await supabase.from('trip_members').select('is_organizer')
      .eq('trip_id', tripId).eq('member_id', organizerId).single();
      
    if (!org?.is_organizer) {
      const {  tripRow } = await supabase.from('trips').select('organizer_id').eq('id', tripId).single();
      if (tripRow?.organizer_id !== organizerId) return res.status(403).json({ error: 'Only organizer can update status' });
    }
    
    await supabase.from('trips').update({ status, updated_at: new Date().toISOString() }).eq('id', tripId);
    if (status === 'active')
      await supabase.from('trip_progress').update({ started_at: new Date().toISOString() }).eq('trip_id', tripId);
    if (status === 'completed')
      await supabase.from('trip_progress').update({ completed_at: new Date().toISOString() }).eq('trip_id', tripId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/trips/:tripId/progress
async function updateProgress(req, res) {
  try {
    const { tripId } = req.params;
    const { currentStopIndex, lat, lng, speed, dayReached } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (currentStopIndex !== undefined) updates.current_stop_index = currentStopIndex;
    if (lat !== undefined) { updates.current_lat = lat; updates.current_lng = lng; }
    if (speed !== undefined) updates.current_speed = speed;

    await supabase.from('trip_progress').update(updates).eq('trip_id', tripId);
    if (dayReached !== undefined)
      await supabase.from('trip_days').update({ is_reached: true }).eq('trip_id', tripId).eq('day_number', dayReached);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/trips/:tripId/announcements
async function postAnnouncement(req, res) {
  try {
    const { tripId } = req.params;
    const { message, type, postedBy } = req.body;    const { data, error } = await supabase.from('trip_announcements').insert({
      trip_id: tripId, message, type: type || 'info', posted_by: postedBy
    }).select().single();
    if (error) throw error;
    res.json({ announcement: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/trips/:tripId/announcements
async function getAnnouncements(req, res) {
  try {
    const { tripId } = req.params;
    const { data } = await supabase.from('trip_announcements').select('*')
      .eq('trip_id', tripId).order('created_at', { ascending: false }).limit(20);
    res.json({ announcements: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  searchLocation, 
  calcRoute, 
  getAIQuestions, 
  getAIPlans, 
  createTrip,
  getTripByCode, 
  getMyTrips, 
  joinTrip, 
  deleteTrip, 
  removeMember,
  updateTripStatus, 
  updateProgress, 
  postAnnouncement, 
  getAnnouncements,
};