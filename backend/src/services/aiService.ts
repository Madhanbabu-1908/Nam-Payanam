import { Groq } from 'groq-sdk';
import { env } from '../config/env';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const MODELS = [
  { id: 'llama-3.3-70b-versatile', tokens: 7000 },
  { id: 'llama-3.1-70b-versatile', tokens: 6000 },
  { id: 'llama-3.1-8b-instant',    tokens: 4000 },
  { id: 'gemma2-9b-it',            tokens: 3000 },
];
const cooldowns: Record<string, number> = {};
const isCooling = (id: string) => !!cooldowns[id] && Date.now() < cooldowns[id];
const setCool   = (id: string, ms = 90000) => { cooldowns[id] = Date.now() + ms; };

async function callGroq(messages: any[], maxTokens = 6000): Promise<string> {
  for (const model of MODELS) {
    if (isCooling(model.id)) continue;
    try {
      const r = await groq.chat.completions.create({
        model: model.id, messages,
        temperature: 0.6, max_tokens: Math.min(maxTokens, model.tokens), stream: false,
      });
      return r.choices[0]?.message?.content || '';
    } catch (e: any) {
      if (e?.status === 429) { setCool(model.id); continue; }
      if (e?.status === 503 || e?.status === 502) { setCool(model.id, 30000); continue; }
      throw e;
    }
  }
  throw new Error('All AI models busy. Please retry in 1 minute.');
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  const match   = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) throw new Error('AI returned invalid format. Please try again.');
  return JSON.parse(match[0]) as T;
}

export const aiService = {
  // ── Comprehensive itinerary with waypoints ────────────────
  generateItinerary: async (params: {
    destination: string; days: number; budget: number;
    interests: string[]; startLocation: string; waypoints?: string[];
  }) => {
    const { destination, days, budget, interests, startLocation, waypoints = [] } = params;
    const allStops = [startLocation, ...waypoints, destination].filter(Boolean);
    const route = allStops.join(' → ');

    const prompt = `You are an expert Indian travel planner with deep local knowledge.
Create a detailed ${days}-day travel itinerary for the route: ${route}

Budget: ₹${budget} total for the trip. Interests: ${interests.join(', ')}.

CRITICAL INSTRUCTIONS:
1. Return ONLY a raw JSON array. No markdown. No text outside [].
2. Use REAL place names, REAL entry fees, REAL restaurant names for this route.
3. Distribute stops logically across ${days} days based on actual distances.
4. Include practical tips in each description.
5. REAL Indian prices: entry fees, food, transport.

Each item in the array:
{
  "day_number": number,
  "time_slot": "Morning|Afternoon|Evening|Night",
  "location_name": "exact place name",
  "description": "what to do, practical tips, nearby amenities",
  "estimated_cost": number,
  "latitude": number_or_null,
  "longitude": number_or_null,
  "category": "SIGHTSEEING|FOOD|TRANSPORT|ACTIVITY|REST",
  "duration_hours": number
}

Start the JSON array with [ and end with ]`;

    const content = await callGroq([
      { role: 'system', content: 'You are a JSON-only API. Return a valid JSON array only, no other text whatsoever.' },
      { role: 'user', content: prompt }
    ], 6000);

    try {
      const parsed = parseJSON<any[]>(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Try to extract array even from partial response
      const match = content.match(/\[[\s\S]*?\]/);
      if (match) return JSON.parse(match[0]);
      return [];
    }
  },

  // ── Context-aware chat with history ──────────────────────
  chat: async (message: string, tripContext: {
    destination: string; start_location?: string;
    budget: number; start_date: string; end_date: string; waypoints?: string[];
  }, history: { role: string; content: string }[] = []): Promise<string> => {
    const days = Math.ceil(
      (new Date(tripContext.end_date).getTime() - new Date(tripContext.start_date).getTime()) / 86400000
    ) + 1;
    const route = [tripContext.start_location, ...(tripContext.waypoints||[]), tripContext.destination].filter(Boolean).join(' → ');

    const system = `You are Nam Payanam's AI companion — knowledgeable, warm, Tamil-rooted travel expert.
Trip: ${route} | ${days} days | Budget: ₹${tripContext.budget}
Rules: ≤200 words. Specific names & prices. Use Tamil phrases naturally ("Nalla irukku!", "Super da!").
For hotels/food: real place names. For costs: actual 2024 Indian prices.`;

    const messages = [
      { role: 'system', content: system },
      ...history.slice(-6), // last 3 turns
      { role: 'user', content: message }
    ];
    return await callGroq(messages, 500);
  },

  // ── Budget analysis ───────────────────────────────────────
  analyzeBudget: async (params: {
    destination: string; budget: number; days: number;
    travelMode: string; groupSize: number;
  }): Promise<any> => {
    const prompt = `Budget analysis for ${params.days}-day trip to ${params.destination}.
Total budget: ₹${params.budget} for ${params.groupSize} people by ${params.travelMode}.

Return ONLY this JSON (no markdown):
{
  "breakdown": {"accommodation":number,"food":number,"transport":number,"activities":number,"shopping_misc":number},
  "perDayBudget": number,
  "tips": ["tip1","tip2","tip3"],
  "warning": "string_if_too_low_else_null"
}`;
    const raw = await callGroq([{ role: 'user', content: prompt }], 600);
    return parseJSON(raw);
  },

  // ── Post-trip summary ─────────────────────────────────────
  generateSummary: async (params: {
    destination: string; days: number; totalSpent: number;
    budget: number; expenseCategories: Record<string,number>; memberCount: number;
  }): Promise<string> => {
    const prompt = `Write a fun 3-sentence trip recap for ${params.days} days in ${params.destination}.
${params.memberCount} people. Budget ₹${params.budget}, spent ₹${params.totalSpent}.
Top spends: ${Object.entries(params.expenseCategories).map(([k,v])=>`${k} ₹${v}`).join(', ')}.
Be enthusiastic, use one Tamil phrase, mention if under/over budget.`;
    return await callGroq([{ role: 'user', content: prompt }], 200);
  },
};
