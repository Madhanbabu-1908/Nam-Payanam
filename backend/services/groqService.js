const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PLANNING_MODEL = 'llama-3.3-70b-versatile';
const FAST_MODEL = 'llama-3.1-8b-instant';

async function generateTripPlans(tripData) {
  const { startLocation, endLocation, stops, startDate, endDate, groupSize, budget, preferences, routeDistances } = tripData;
  const durationDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));

  // Build real distance context if available
  let distanceContext = '';
  if (routeDistances?.length > 0) {
    distanceContext = '\nREAL ROUTE DISTANCES (use these exact figures):\n';
    routeDistances.forEach(d => {
      distanceContext += `  • ${d.from} → ${d.to}: ${d.distance_km} km, ~${Math.round(d.duration_minutes / 60)}h ${d.duration_minutes % 60}min drive\n`;
    });
    const total = routeDistances.reduce((s, d) => s + parseFloat(d.distance_km || 0), 0);
    distanceContext += `  • Total route distance: ${total.toFixed(1)} km\n`;
    distanceContext += 'IMPORTANT: Use these real distances in your plan. Do NOT invent distances.\n';
  }

  const prompt = `You are an expert Indian travel planner. Create exactly 3 distinct trip plan suggestions.

Trip Details:
- Start: ${startLocation}
- End: ${endLocation}
- Intermediate stops requested: ${stops?.join(', ') || 'flexible'}
- Start Date: ${startDate}
- End Date: ${endDate} (${durationDays} days)
- Group Size: ${groupSize} people
- Budget preference: ${budget || 'moderate'}
- Preferences: ${preferences || 'general sightseeing'}
${distanceContext}

Create 3 plans with DIFFERENT approaches:
Plan 1: Budget-conscious, maximum sightseeing
Plan 2: Comfortable balance of comfort and exploration  
Plan 3: Premium/luxury experience

Respond ONLY with a valid JSON array of exactly 3 plan objects. No markdown, no explanation, just the JSON array.

Each plan object must have:
{
  "planName": "string",
  "summary": "string (2-3 sentence overview)",
  "totalDistance": "string (use real distances if provided, e.g. '450 km')",
  "estimatedDriveTime": "string (e.g. '8h total driving')",
  "estimatedCost": {
    "perPerson": number,
    "total": number,
    "breakdown": { "transport": number, "accommodation": number, "food": number, "activities": number, "miscellaneous": number }
  },
  "highlights": ["string array of 3-4 key highlights"],
  "prerequisites": ["string array of 4-5 items to prepare"],
  "bestFor": "string",
  "amenities": {
    "accommodation": ["list of accommodation types/names at each stop"],
    "dining": ["list of must-try restaurants or food types"],
    "facilities": ["petrol stations, ATMs, hospitals en route"],
    "activities": ["top activities at each location"]
  },
  "days": [
    {
      "dayNumber": number,
      "title": "string",
      "date": "YYYY-MM-DD",
      "route": "string (e.g. 'Chennai → Vellore, 145 km, ~2.5h')",
      "stops": [
        {
          "name": "string",
          "type": "start|stop|stay|attraction|food|end",
          "duration": "string",
          "description": "string",
          "estimatedCost": number,
          "amenities": ["nearby facilities"],
          "lat": number or null,
          "lng": number or null
        }
      ],
      "dailyBudget": number,
      "notes": "string"
    }
  ],
  "tips": ["string array of 3-4 practical tips"],
  "warnings": ["string array of 1-2 important warnings if any"],
  "emergencyContacts": ["Police: 100", "Ambulance: 108", "local contacts if applicable"]
}`;

  const response = await groq.chat.completions.create({
    model: PLANNING_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 7000,
  });

  const content = response.choices[0]?.message?.content || '[]';
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const plans = JSON.parse(cleaned);
  return Array.isArray(plans) ? plans.slice(0, 3) : [];
}

async function chatWithAI(message, tripContext) {
  const systemPrompt = `You are Nam Payanam's travel assistant - a friendly, knowledgeable Indian travel guide. 
You are helping with a trip: ${tripContext?.title || 'a group trip'}.
Trip route: ${tripContext?.start_location || ''} → ${tripContext?.end_location || ''}.
Group size: ${tripContext?.group_size || 'unknown'} people.
Be concise, practical, and enthusiastic. Use occasional Tamil/Hindi travel terms naturally.
Focus on actionable advice. Keep responses under 200 words unless asked for detail.`;

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
    temperature: 0.6,
    max_tokens: 500,
  });
  return response.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
}

async function generateExpenseInsights(expenses, tripData) {
  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const categories = {};
  expenses.forEach(e => { categories[e.category] = (categories[e.category] || 0) + parseFloat(e.amount); });

  const prompt = `Trip expense analysis for ${tripData.group_size} people:
Total spent: ₹${totalSpent}
By category: ${JSON.stringify(categories)}
Trip: ${tripData.start_location} to ${tripData.end_location}
Give a 3-sentence smart insight about spending patterns and 2 practical tips for future similar trips. Be concise.`;

  const response = await groq.chat.completions.create({
    model: FAST_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 300,
  });
  return response.choices[0]?.message?.content || '';
}

module.exports = { generateTripPlans, chatWithAI, generateExpenseInsights };
