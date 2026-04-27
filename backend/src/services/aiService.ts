import { groq } from "../config/groq";

type AIResult = {
  days?: any[];
  raw?: string;
};

const cleanJSON = (content: string) => {
  return content
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
};

// 🔥 1. Generate itinerary
const generateItinerary = async (prompt: string): Promise<AIResult> => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: `
You are a travel planner AI.

Return STRICT JSON only.

{
  "days": [
    {
      "day": 1,
      "title": "string",
      "activities": [
        {
          "time": "string",
          "place": "string",
          "notes": "string"
        }
      ]
    }
  ]
}

User request:
${prompt}
`,
        },
      ],
    });

    const content = response?.choices?.[0]?.message?.content || "";

    const cleaned = cleanJSON(content);

    try {
      const parsed = JSON.parse(cleaned);

      if (!parsed.days || !Array.isArray(parsed.days)) {
        throw new Error("Invalid structure");
      }

      return parsed;
    } catch {
      return { raw: cleaned };
    }
  } catch (err: any) {
    console.error("❌ generateItinerary:", err.message);
    throw new Error("AI itinerary failed");
  }
};

// 🔥 2. Chat (general AI)
const chat = async (message: string): Promise<string> => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [{ role: "user", content: message }],
    });

    return response?.choices?.[0]?.message?.content || "No response";
  } catch (err: any) {
    console.error("❌ chat:", err.message);
    throw new Error("AI chat failed");
  }
};

// 🔥 3. Budget analysis
const analyzeBudget = async (input: string): Promise<string> => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: `Analyze this travel budget and give insights:\n${input}`,
        },
      ],
    });

    return response?.choices?.[0]?.message?.content || "No analysis";
  } catch (err: any) {
    console.error("❌ analyzeBudget:", err.message);
    throw new Error("Budget analysis failed");
  }
};

// 🔥 4. Trip summary
const generateSummary = async (input: string): Promise<string> => {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      messages: [
        {
          role: "user",
          content: `Summarize this trip in a clean paragraph:\n${input}`,
        },
      ],
    });

    return response?.choices?.[0]?.message?.content || "No summary";
  } catch (err: any) {
    console.error("❌ generateSummary:", err.message);
    throw new Error("Summary failed");
  }
};

// ✅ FINAL EXPORT (IMPORTANT)
export const aiService = {
  generateItinerary,
  chat,
  analyzeBudget,
  generateSummary,
};