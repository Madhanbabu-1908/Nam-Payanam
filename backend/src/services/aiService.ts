import { Groq } from 'groq-sdk';
import { env } from '../config/env';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// Model fallback queue - if primary hits rate limit, try next
const MODELS = [
  { id: 'llama-3.3-70b-versatile', tokens: 6000 },
  { id: 'llama-3.1-70b-versatile', tokens: 5000 },
  { id: 'llama-3.1-8b-instant',    tokens: 4000 },
  { id: 'gemma2-9b-it',            tokens: 3000 },
];
const cooldowns: Record<string, number> = {};
const isCooling = (id: string) => !!cooldowns[id] && Date.now() < cooldowns[id];
const setCool = (id: string, ms = 90000) => { cooldowns[id] = Date.now() + ms; };

async function callGroq(messages: any[], maxTokens = 5000): Promise<string> {
  for (const model of MODELS) {
    if (isCooling(model.id)) continue;
    try {
      const r = await groq.chat.completions.create({
        model: model.id,
        messages,
        temperature: 0.7,
        max_tokens: Math.min(maxTokens, model.tokens),
        stream: false,
      });
      return r.choices[0]?.message?.content || '';
    } catch (e: any) {
      if (e?.status === 429) { setCool(model.id); continue; }
      if (e?.status === 503 || e?.status === 502) { setCool(model.id, 30000); continue; }
      throw e;
    }
  }
  throw new Error('All AI models are currently busy. Please try again in 1 minute.');
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) throw new Error('AI returned invalid format');
  return JSON.parse(match[0]) as T;
}

export const aiService = {
  // ── Generate full itinerary ──────────────────────────────
  generateItinerary: async (params: {
    destination: string;
    days: number;
    budget: number;
    interests: string[];
    startLocation: string;
  }) => {
    const { destination, days, budget, interests, startLocation } = params;

    const prompt = `You are an expert Indian travel planner. Create a detailed ${days}-day itinerary for a trip from ${startLocation} to ${destination}.

Budget: ₹${budget} total.
Interests: ${interests.join(', ')}.

CRITICAL: Return ONLY a raw JSON array. No markdown, no explanation.

PRICING: Use real Indian prices:
- Entry fees: actual amounts (e.g., Taj Mahal ₹50 Indian, ₹1100 foreign)
- Meals: street food ₹80-150, restaurant ₹200-450, fine dining ₹600+
- Auto/cab: ₹50-200 per trip
- Hotels are NOT included (only activities/food/transport)

Each item:
{
  "day_number": number,
  "time_slot": "Morning|Afternoon|Evening|Night",
  "location_name": "specific place name",
  "description": "what to do there, practical tips",
  "estimated_cost": number,
  "latitude": number_or_null,
  "longitude": number_or_null,
  "category": "SIGHTSEEING|FOOD|TRANSPORT|ACTIVITY|REST"
}

Return array starting with [ and ending with ]`;

    const content = await callGroq([
      { role: 'system', content: 'You are a JSON-only API. Output strictly a valid JSON array with no other text.' },
      { role: 'user', content: prompt }
    ], 5000);

    const parsed = parseJSON<any[]>(content);
    return Array.isArray(parsed) ? parsed : 
      Object.values(parsed).find(v => Array.isArray(v)) as any[] || [];
  },

  // ── Smart AI Chat (context-aware) ────────────────────────
  chat: async (message: string, tripContext: {
    destination: string;
    start_location?: string;
    budget: number;
    start_date: string;
    end_date: string;
  }): Promise<string> => {
    const days = Math.ceil(
      (new Date(tripContext.end_date).getTime() - new Date(tripContext.start_date).getTime()) 
      / (1000 * 60 * 60 * 24)
    ) + 1;

    const system = `You are Nam Payanam's AI travel companion — knowledgeable, warm, Tamil-rooted.
Trip context: ${tripContext.start_location || 'Unknown'} → ${tripContext.destination}, ${days} days, ₹${tripContext.budget} budget.
Rules: Be concise (≤200 words). Give specific names, real prices, distances. Use Tamil phrases naturally (e.g., "Nalla irukku!", "Super place!").
For hotels: give specific hotel names with price ranges. For food: specific restaurant/dhaba names.`;

    return await callGroq([
      { role: 'system', content: system },
      { role: 'user', content: message }
    ], 600);
  },

  // ── AI Budget Advisor ────────────────────────────────────
  analyzeBudget: async (params: {
    destination: string;
    budget: number;
    days: number;
    travelMode: string;
    groupSize: number;
  }): Promise<{
    breakdown: Record<string, number>;
    tips: string[];
    warning?: string;
    perDayBudget: number;
  }> => {
    const prompt = `For a ${params.days}-day trip to ${params.destination} with total budget ₹${params.budget} for ${params.groupSize} people travelling by ${params.travelMode}:

Return ONLY this JSON (no markdown):
{
  "breakdown": {
    "accommodation": number,
    "food": number,
    "transport": number,
    "activities": number,
    "shopping_misc": number
  },
  "perDayBudget": number,
  "tips": ["tip1", "tip2", "tip3"],
  "warning": "string if budget is too low, else null"
}

Use REAL current Indian prices. Be specific about this route.`;

    const content = await callGroq([{ role: 'user', content: prompt }], 800);
    return parseJSON(content);
  },

  // ── AI Trip Summary (end of trip) ────────────────────────
  generateSummary: async (params: {
    destination: string;
    days: number;
    totalSpent: number;
    budget: number;
    expenseCategories: Record<string, number>;
    memberCount: number;
  }): Promise<string> => {
    const prompt = `Write a warm, fun 3-sentence trip summary for a ${params.days}-day trip to ${params.destination}.
Group of ${params.memberCount} people. Budget: ₹${params.budget}, Spent: ₹${params.totalSpent}.
Top categories: ${Object.entries(params.expenseCategories).map(([k,v]) => `${k}: ₹${v}`).join(', ')}.
Be enthusiastic, use one Tamil phrase, mention if they were under/over budget.`;

    return await callGroq([{ role: 'user', content: prompt }], 300);
  },
};
