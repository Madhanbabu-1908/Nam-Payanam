import { groq } from "../config/groq";

type AIResult = {
  days?: any[];
  raw?: string;
};

const generateItinerary = async (prompt: string): Promise<AIResult> => {
  try {
    if (!prompt || prompt.trim().length < 10) {
      throw new Error("Invalid prompt");
    }

    const finalPrompt = `
You are a travel planner AI.

Create a detailed travel itinerary in STRICT JSON format.

Rules:
- Return ONLY valid JSON (no explanation)
- Structure:
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
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: finalPrompt,
        },
      ],
    });

    const content = response?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    const cleaned = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);

      if (!parsed.days || !Array.isArray(parsed.days)) {
        throw new Error("Invalid itinerary format");
      }

      return parsed;
    } catch {
      console.warn("⚠️ AI returned non-JSON. Sending raw response.");

      return {
        raw: cleaned,
      };
    }
  } catch (err: any) {
    console.error("❌ AI Service Error:", err.message);
    throw new Error("Failed to generate itinerary");
  }
};

// ✅ THIS FIXES YOUR BUILD ERROR
export const aiService = {
  generateItinerary,
};