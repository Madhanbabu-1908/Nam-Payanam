const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 4-model smart rotation queue — silent to user
const MODEL_QUEUE = [
  { id: 'llama-3.3-70b-versatile',   label: 'primary',   maxTokens: 6000 },
  { id: 'llama-3.1-70b-versatile',   label: 'secondary', maxTokens: 6000 },
  { id: 'llama-3.1-8b-instant',      label: 'fast',      maxTokens: 4000 },
  { id: 'gemma2-9b-it',              label: 'fallback',  maxTokens: 3000 },
];

const CHAT_MODEL_QUEUE = [
  { id: 'llama-3.1-8b-instant',  maxTokens: 600 },
  { id: 'gemma2-9b-it',          maxTokens: 500 },
  { id: 'llama-3.3-70b-versatile', maxTokens: 600 },
];

// Track per-model cooldown
const modelCooldowns = {};

function isModelCooling(modelId) {
  const coolUntil = modelCooldowns[modelId];
  return coolUntil && Date.now() < coolUntil;
}

function setCooldown(modelId, ms = 60000) {
  modelCooldowns[modelId] = Date.now() + ms;
  console.log(`[Groq] Model ${modelId} cooling for ${ms/1000}s`);
}

async function callWithFallback(queue, messages, systemPrompt = null) {
  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  for (const model of queue) {
    if (isModelCooling(model.id)) {
      console.log(`[Groq] Skipping ${model.id} (cooling)`);
      continue;
    }
    try {
      console.log(`[Groq] Trying ${model.id}`);
      const resp = await groq.chat.completions.create({
        model: model.id,
        messages: msgs,
        temperature: 0.7,
        max_tokens: model.maxTokens,
      });
      return resp.choices[0]?.message?.content || '';
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 429) {
        setCooldown(model.id, 90000); // 90s cooldown on rate limit
        console.log(`[Groq] Rate limited on ${model.id}, trying next`);
        await new Promise(r => setTimeout(r, 300));
        continue;
      }
      if (status === 503 || status === 502) {
        setCooldown(model.id, 30000);
        continue;
      }
      throw err; // non-rate-limit errors bubble up
    }
  }
  throw new Error('All AI models are currently busy. Please try again in a minute.');
}

// ── Generate 3 trip plans ────────────────────────────────────
async function generateTripPlans(tripData) {
  const {
    startLocation, endLocation, stops, startDate, endDate,
    groupSize, budget, preferences, routeData, travelMode,
    accommodation, foodPref, departureTime
  } = tripData;

  const durationDays = Math.max(1,
    Math.round((new Date(endDate) - new Date(startDate)) / 86400000));

  // Build route context from real OSRM data
  let routeContext = '';
  if (routeData?.segments?.length > 0) {
    const segs = routeData.segments.map(s =>
      `${s.from} → ${s.to}: ${s.distanceKm}km, ${s.durationText}`).join('\n');
    routeContext = `\nREAL ROUTE DATA (from OSRM):\nTotal distance: ${routeData.totalDistanceKm}km\nTotal driving time: ${routeData.totalDurationText}\nSegments:\n${segs}`;
  }

  const prompt = `You are an expert Indian travel planner with deep knowledge of Indian roads, culture, and tourism.

Trip Details:
- Start: ${startLocation}
- Stops: ${stops?.map(s=>s.name||s).join(', ') || 'none specified'}
- End: ${endLocation}
- Dates: ${startDate} to ${endDate} (${durationDays} days)
- Group: ${groupSize} people
- Travel mode: ${travelMode || 'road'}
- Accommodation: ${accommodation || 'moderate hotel'}
- Food preference: ${foodPref || 'no restriction'}
- Preferred departure time each day: ${departureTime || '7:00 AM'}
- Budget type: ${budget || 'moderate'}
- Special preferences: ${preferences || 'none'}
${routeContext}

Create exactly 3 distinct trip plans as a JSON array. NO markdown, NO explanation — ONLY the raw JSON array.

Each plan object:
{
  "planName": "string",
  "summary": "string (2-3 sentences)",
  "totalDistanceKm": number,
  "totalDrivingHours": number,
  "estimatedCost": {
    "perPerson": number,
    "total": number,
    "breakdown": { "transport": number, "accommodation": number, "food": number, "activities": number, "miscellaneous": number }
  },
  "highlights": ["4 key highlights"],
  "prerequisites": ["5 preparation items"],
  "bestFor": "string",
  "days": [
    {
      "dayNumber": number,
      "title": "string",
      "date": "YYYY-MM-DD",
      "departureTime": "HH:MM",
      "stops": [
        {
          "name": "string",
          "type": "start|stop|stay|attraction|food|fuel|rest|end",
          "duration": "string",
          "description": "string (2 sentences with local tips)",
          "estimatedCost": number,
          "amenities": ["nearby amenities list"],
          "lat": number or null,
          "lng": number or null
        }
      ],
      "dailyBudgetPerPerson": number,
      "drivingDistanceKm": number,
      "drivingDuration": "string",
      "notes": "string",
      "weatherTip": "string"
    }
  ],
  "tips": ["4 practical tips"],
  "warnings": ["important warnings"],
  "fuelEstimate": { "totalLitres": number, "estimatedCostAt100PerLitre": number }
}`;

  const raw = await callWithFallback(MODEL_QUEUE, [{ role: 'user', content: prompt }]);
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();

  // Try to extract JSON array even if model added text around it
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI returned invalid plan format. Please try again.');

  const plans = JSON.parse(match[0]);
  return Array.isArray(plans) ? plans.slice(0, 3) : [];
}

// ── AI preference interview (ask follow-up Qs) ───────────────
async function generateFollowUpQuestions(basicInfo) {
  const prompt = `A user wants to plan a trip from ${basicInfo.startLocation} to ${basicInfo.endLocation} for ${basicInfo.groupSize} people over ${basicInfo.days} days.

Generate 5 smart follow-up questions to better plan this trip. Return ONLY a JSON array of question objects:
[
  {
    "id": "travel_mode",
    "question": "string",
    "type": "single",
    "options": ["option1", "option2", "option3"]
  }
]
Question IDs must be: travel_mode, accommodation, food_pref, departure_time, special_needs
Make options specific to Indian travel context.`;

  const raw = await callWithFallback(CHAT_MODEL_QUEUE, [{ role: 'user', content: prompt }]);
  const match = raw.replace(/```json\n?|\n?```/g,'').trim().match(/\[[\s\S]*\]/);
  if (!match) return getDefaultQuestions();
  try { return JSON.parse(match[0]); } catch { return getDefaultQuestions(); }
}

function getDefaultQuestions() {
  return [
    { id: 'travel_mode', question: 'How are you planning to travel?', type: 'single',
      options: ['Road trip (car/bike)', 'Mix of road + train', 'Train for long legs', 'Bus throughout'] },
    { id: 'accommodation', question: 'What type of stay do you prefer?', type: 'single',
      options: ['Budget lodge/dharamshala', 'Mid-range hotel', 'Resort/homestay', 'Decide en-route'] },
    { id: 'food_pref', question: 'Any food preferences for the group?', type: 'single',
      options: ['Pure vegetarian', 'Non-veg welcome', 'Jain food needed', 'No restriction'] },
    { id: 'departure_time', question: 'What time does your group usually start each day?', type: 'single',
      options: ['Early bird (5-6 AM)', 'Morning (7-8 AM)', 'Late morning (9-10 AM)', 'Flexible'] },
    { id: 'special_needs', question: 'Any special requirements?', type: 'single',
      options: ['Senior citizens in group', 'Children under 10', 'Medical stops needed', 'None'] },
  ];
}

// ── AI chat ──────────────────────────────────────────────────
async function chatWithAI(message, tripContext) {
  const system = `You are Nam Payanam's travel assistant — a friendly, knowledgeable Indian travel guide.
Trip: ${tripContext?.title || 'group trip'} | Route: ${tripContext?.start_location || ''} → ${tripContext?.end_location || ''} | Group: ${tripContext?.group_size || '?'} people.
Be concise (under 180 words), practical, warm. Use occasional Tamil/Hindi travel phrases naturally.`;

  return await callWithFallback(CHAT_MODEL_QUEUE,
    [{ role: 'user', content: message }], system);
}

// ── Expense insights ─────────────────────────────────────────
async function generateExpenseInsights(expenses, tripData) {
  const total = expenses.reduce((s,e) => s+parseFloat(e.amount), 0);
  const cats = {};
  expenses.forEach(e => { cats[e.category] = (cats[e.category]||0)+parseFloat(e.amount); });

  const prompt = `Trip expense analysis — ${tripData.group_size} people, ${tripData.start_location} to ${tripData.end_location}.
Total: ₹${total} | By category: ${JSON.stringify(cats)}
Give 2-sentence smart insight + 2 tips for future similar trips. Be concise and specific.`;

  return await callWithFallback(CHAT_MODEL_QUEUE, [{ role: 'user', content: prompt }]);
}

module.exports = { generateTripPlans, generateFollowUpQuestions, chatWithAI, generateExpenseInsights };
