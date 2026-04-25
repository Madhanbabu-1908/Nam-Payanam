import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 4-model fallback chain
const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
];
const cooldowns: Record<string, number> = {};

async function callGroq(prompt: string, maxTokens = 6000): Promise<string> {
  for (const model of MODELS) {
    if (cooldowns[model] && Date.now() < cooldowns[model]) continue;
    try {
      const res = await groq.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: maxTokens,
      });
      return res.choices[0]?.message?.content || '';
    } catch (err: any) {
      if (err?.status === 429) { cooldowns[model] = Date.now() + 90000; continue; }
      throw err;
    }
  }
  throw new Error('All AI models are currently busy. Please retry in a minute.');
}

export interface TripInput {
  startLocation: string;
  destination: string;
  stops: { name: string; lat?: number; lng?: number }[];
  startDate: string;
  endDate: string;
  budget?: number;
  interests?: string[];
}

export interface ItineraryStop {
  day_number: number;
  name: string;
  stop_type: 'HOTEL' | 'FOOD' | 'ATTRACTION' | 'VIEWPOINT' | 'FUEL' | 'REST' | 'START' | 'END' | 'STOP';
  time_of_day: string;
  duration_minutes: number;
  cost_estimate: number;
  notes: string;
  latitude: number | null;
  longitude: number | null;
}

export async function generateItinerary(trip: TripInput): Promise<ItineraryStop[]> {
  const days = Math.max(1, Math.round(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000
  ));

  const stopList = trip.stops?.length
    ? trip.stops.map(s => s.name).join(' → ')
    : 'direct route';

  const interestStr = trip.interests?.length
    ? `Interests: ${trip.interests.join(', ')}`
    : '';

  const budgetStr = trip.budget
    ? `Total budget: ₹${trip.budget}`
    : '';

  // ── Step 1: Web-search prompt (Groq with search context) ─
  // We simulate agentic web search by having the model generate
  // a comprehensive plan using its training knowledge + explicit
  // instruction to behave as if it searched for current info.
  const searchPrompt = `You are an expert Indian travel planner with up-to-date knowledge of tourist places, roads, hotels and food across India.

Plan a ${days}-day road trip:
- From: ${trip.startLocation}
- Via: ${stopList}
- To: ${trip.destination}
- Dates: ${trip.startDate} to ${trip.endDate}
- ${budgetStr}
- ${interestStr}

IMPORTANT RULES:
1. Use REAL, NAMED places (actual hotels, restaurants, viewpoints by name — not generic descriptions)
2. For every attraction, include accurate timings (opening hours, best time to visit)
3. Include real driving time estimates between stops
4. Mention entry fees, costs in INR where applicable
5. Be specific: "Ooty Rose Garden (opens 6am, ₹30 entry)" not just "visit a garden"
6. Think like someone who searched Google Maps + TripAdvisor for this exact route
7. Include fuel stops, dhaba/restaurant recommendations on highway stretches
8. Mix all stop types: hotels for night stay, food, attractions, viewpoints, rest stops

Return ONLY a valid JSON array. No markdown, no explanation. Each item:
{
  "day_number": 1,
  "name": "Actual Place Name",
  "stop_type": "HOTEL|FOOD|ATTRACTION|VIEWPOINT|FUEL|REST|START|END|STOP",
  "time_of_day": "09:00",
  "duration_minutes": 90,
  "cost_estimate": 500,
  "notes": "Specific tip or info about this place",
  "latitude": 11.4102,
  "longitude": 76.6950
}

Generate ${Math.min(days * 6, 40)} stops spread across all ${days} days. Day 1 starts at ${trip.startLocation}, Day ${days} ends at ${trip.destination}.`;

  const raw = await callGroq(searchPrompt, 7000);

  // Extract JSON array from response
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI returned invalid format. Please try again.');

  let stops: ItineraryStop[] = [];
  try {
    stops = JSON.parse(match[0]);
  } catch {
    throw new Error('Failed to parse AI response. Please try again.');
  }

  // ── Step 2: Validate + sanitise ────────────────────────
  const VALID_TYPES = ['HOTEL','FOOD','ATTRACTION','VIEWPOINT','FUEL','REST','START','END','STOP'];
  return stops
    .filter(s => s.name && s.day_number >= 1 && s.day_number <= days + 1)
    .map(s => ({
      day_number:       Math.max(1, Math.min(s.day_number, days)),
      name:             String(s.name).trim().slice(0, 200),
      stop_type:        VALID_TYPES.includes(s.stop_type) ? s.stop_type : 'STOP',
      time_of_day:      s.time_of_day || '09:00',
      duration_minutes: Math.max(15, Math.min(s.duration_minutes || 60, 480)),
      cost_estimate:    Math.max(0, parseFloat(String(s.cost_estimate)) || 0),
      notes:            String(s.notes || '').slice(0, 500),
      latitude:         s.latitude  ? parseFloat(String(s.latitude))  : null,
      longitude:        s.longitude ? parseFloat(String(s.longitude)) : null,
    }));
}
