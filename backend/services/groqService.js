const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PLANNING_MODEL = 'llama-3.3-70b-versatile';
const FAST_MODEL = 'llama-3.1-8b-instant';

// ── Real cost research prompt ────────────────────────────────────────────────
async function generateTripPlans(tripData) {
  const {
    startLocation, endLocation, stops, startDate, endDate, groupSize,
    budget, budgetAmount, preferences, routeDistances,
    transportType, vehicleType, stayPreferences, dayAssignments, planningAnswers
  } = tripData;

  const durationDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
  const allLocations = [startLocation, ...(stops || []), endLocation];

  // Build real distance context
  let distanceContext = '';
  let totalKm = 0, totalDriveMin = 0;
  if (routeDistances?.length > 0) {
    distanceContext = '\nVERIFIED ROUTE DISTANCES (OSRM real data — use exactly):\n';
    routeDistances.forEach(d => {
      distanceContext += `  • ${d.from} → ${d.to}: ${d.distance_km} km, ~${Math.floor(d.duration_minutes/60)}h ${d.duration_minutes%60}min\n`;
      totalKm += parseFloat(d.distance_km || 0);
      totalDriveMin += parseInt(d.duration_minutes || 0);
    });
    distanceContext += `  Total: ${totalKm.toFixed(1)} km, ~${Math.floor(totalDriveMin/60)}h ${totalDriveMin%60}min driving\n`;
  }

  // Build transport context
  const transport = transportType === 'public'
    ? 'Public transport (bus/train)'
    : vehicleType === 'bike' ? 'Own two-wheeler' : 'Own car';

  // Build fuel cost for own vehicle
  let fuelNote = '';
  if (transportType === 'own_vehicle') {
    const fuelRate = vehicleType === 'bike' ? 45 : 12; // km/l approx
    const fuelPrice = vehicleType === 'bike' ? 105 : 100; // ₹/litre
    const litres = totalKm > 0 ? totalKm / fuelRate : 0;
    const fuelCost = Math.round(litres * fuelPrice);
    fuelNote = `\nFuel estimate: ~${litres.toFixed(1)} litres × ₹${fuelPrice} = ₹${fuelCost} total (÷ ${groupSize} = ₹${Math.round(fuelCost/groupSize)}/person)\n`;
  } else {
    const busKmRate = 1.2, trainKmRate = 0.6;
    const busCost = Math.round(totalKm * busKmRate * groupSize);
    fuelNote = `\nPublic transport estimate: ~₹${busCost} total for group (based on ₹${busKmRate}/km bus fare)\n`;
  }

  // Build stay context
  const stayContext = stayPreferences?.length > 0
    ? `\nPlanned stays: ${stayPreferences.map(s => `${s.location} (Day ${s.day}): ${s.preference}`).join(', ')}`
    : '';

  // Budget constraint
  const budgetContext = budgetAmount
    ? `\nORGANISER BUDGET CONSTRAINT: ₹${budgetAmount} per person total. ALL plans MUST fit within or near this budget. If budget is tight, suggest which places to skip or combine.`
    : '';

  // Day assignments
  const dayContext = dayAssignments && Object.keys(dayAssignments).length > 0
    ? `\nUser's day plan: ${Object.entries(dayAssignments).map(([day, places]) => `Day ${day}: ${places}`).join('; ')}`
    : '';

  const prompt = `You are an expert Indian travel cost researcher and planner. Create EXACTLY 3 trip plans.

TRIP DETAILS:
- Route: ${allLocations.join(' → ')}
- Dates: ${startDate} to ${endDate} (${durationDays} days)
- Group: ${groupSize} people
- Transport: ${transport}
- Budget preference: ${budget || 'moderate'}${budgetContext}
- Special notes: ${preferences || 'none'}
${distanceContext}${fuelNote}${stayContext}${dayContext}

CRITICAL PRICING RULES — Do NOT use generic/hardcoded values:
1. Research REAL current prices for each specific location in the route
2. For accommodation: Look up actual hotels/lodges at each stop city. Budget lodge: ₹500-1500/night, Mid: ₹1500-3500, Premium: ₹3500+
3. For food: Research local restaurant prices at each city. South Indian meal: ₹80-200, Restaurant: ₹200-600/person
4. For fuel/transport: Use the calculated fuel cost above
5. For activities: Research actual entry fees for monuments, parks, etc. at each specific location
6. Multiply accommodation × nights, food × days × 3 meals, activities per location
7. The 3 plans should reflect BUDGET (₹800-1500/person/day), MODERATE (₹1500-3000/person/day), PREMIUM (₹3000+/person/day) for THIS specific route

HOTEL RESEARCH: For each overnight stop, list 2-3 REAL hotel names with approximate prices:
- Budget: local lodges, OYO-style hotels
- Moderate: business hotels, mid-range
- Premium: resort/heritage properties if available in that area

ACTIVITIES: List real attractions with actual entry fees for each city in the route.

Respond ONLY with a valid JSON array of exactly 3 objects. No markdown. No preamble.

Each plan:
{
  "planName": "string (Budget Explorer / Comfort Journey / Premium Experience)",
  "summary": "2-3 sentences specific to this route and its real attractions",
  "totalDistance": "string e.g. '${totalKm.toFixed(0)} km'",
  "estimatedDriveTime": "string",
  "transportDetails": "string describing specific transport options for this route",
  "estimatedCost": {
    "perPerson": number (calculated from real prices below),
    "total": number (perPerson × ${groupSize}),
    "breakdown": {
      "transport": number (fuel or bus/train cost per person),
      "accommodation": number (hotel cost per person for all nights),
      "food": number (meals per person for all days),
      "activities": number (entry fees + activities per person),
      "miscellaneous": number
    },
    "priceJustification": "string explaining how each number was calculated"
  },
  "highlights": ["3-4 specific attractions in this route"],
  "bestFor": "string",
  "hotels": [
    {
      "location": "city name",
      "day": number,
      "options": [
        { "name": "hotel name", "type": "budget|moderate|premium", "pricePerNight": number, "notes": "brief note" }
      ]
    }
  ],
  "amenities": {
    "accommodation": ["specific hotel names at each stop"],
    "dining": ["specific restaurant names or food types per city"],
    "facilities": ["specific petrol bunks, hospitals, ATMs en route"],
    "activities": ["specific attractions with entry fees"]
  },
  "days": [
    {
      "dayNumber": number,
      "title": "string",
      "date": "YYYY-MM-DD",
      "route": "string with real distance e.g. 'City A → City B, 145 km, ~2.5h'",
      "stops": [
        {
          "name": "string",
          "type": "start|stop|stay|attraction|food|end",
          "duration": "string",
          "description": "specific description with real info",
          "estimatedCost": number,
          "amenities": ["nearby facilities"],
          "lat": null,
          "lng": null
        }
      ],
      "dailyBudget": number,
      "notes": "practical notes for this day"
    }
  ],
  "tips": ["3-4 route-specific practical tips"],
  "warnings": ["1-2 important warnings for this route"],
  "emergencyContacts": ["Police: 100", "Ambulance: 108"]
}`;

  const response = await groq.chat.completions.create({
    model: PLANNING_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.65,
    max_tokens: 8000,
  });

  let content = response.choices[0]?.message?.content || '[]';
  content = content.replace(/```json\n?|\n?```/g, '').trim();
  // Extract JSON array
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']') + 1;
  if (start !== -1 && end > start) content = content.slice(start, end);
  const plans = JSON.parse(content);
  return Array.isArray(plans) ? plans.slice(0, 3) : [];
}

// ── Hotel search near a location ─────────────────────────────────────────────
async function searchHotelsNearby(location, budget, checkIn, checkOut) {
  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 1;

  const prompt = `List 6 real hotels in ${location}, India for ${nights} night(s).
Budget type: ${budget || 'moderate'} (budget=₹500-1500/night, moderate=₹1500-3500/night, premium=₹3500+/night)
Check-in: ${checkIn || 'flexible'}, Check-out: ${checkOut || 'flexible'}

Return ONLY a JSON array. No markdown.
[
  {
    "name": "hotel name",
    "type": "budget|moderate|premium",
    "pricePerNight": number,
    "totalPrice": number (pricePerNight × ${nights}),
    "location": "area/neighborhood in ${location}",
    "amenities": ["wifi","ac","parking","restaurant"],
    "rating": number (4.0-4.8),
    "bookingNote": "brief note e.g. 'Near bus stand, popular with families'"
  }
]`;

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1500,
  });

  let content = response.choices[0]?.message?.content || '[]';
  content = content.replace(/```json\n?|\n?```/g, '').trim();
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']') + 1;
  if (start !== -1) content = content.slice(start, end);
  return JSON.parse(content);
}

// ── AI Chat ──────────────────────────────────────────────────────────────────
async function chatWithAI(message, tripContext) {
  const systemPrompt = `You are Nam Payanam's travel assistant — a friendly, knowledgeable Indian travel guide.
Trip: ${tripContext?.title || 'group trip'} | Route: ${tripContext?.start_location || ''} → ${tripContext?.end_location || ''} | Group: ${tripContext?.group_size || '?'} people.
When asked about hotels: provide real hotel names with approximate prices for the specific city.
Be concise (under 200 words), practical, enthusiastic. Use occasional Tamil/Hindi travel terms naturally.`;

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
    temperature: 0.6,
    max_tokens: 600,
  });
  return response.choices[0]?.message?.content || 'Could not respond. Try again.';
}

async function generateExpenseInsights(expenses, tripData) {
  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const cats = {};
  expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount); });
  const prompt = `Trip: ${tripData.start_location} → ${tripData.end_location}, ${tripData.group_size} people. Total ₹${total}. By category: ${JSON.stringify(cats)}. Give 3-sentence insight + 2 money-saving tips for this specific route. Be concise.`;
  const r = await groq.chat.completions.create({ model: FAST_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 300 });
  return r.choices[0]?.message?.content || '';
}

module.exports = { generateTripPlans, searchHotelsNearby, chatWithAI, generateExpenseInsights };
