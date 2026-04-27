import { groq } from "../config/groq";

type AIResult = {
  days?: any[];
  raw?: string;
};

export const generateItinerary = async (prompt: string): Promise<AIResult> => {
  try {
    if (!prompt || prompt.trim().length < 10) {
      throw new Error("Invalid prompt");
    }

    // 🧠 Strong structured prompt (VERY IMPORTANT)
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

    // 🔥 Clean response (remove markdown if AI adds ```json)
    const cleaned = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // 🛡️ Safe parsing
    try {
      const parsed = JSON.parse(cleaned);

      // Basic validation
      if (!parsed.days || !Array.isArray(parsed.days)) {
        throw new Error("Invalid itinerary format");
      }

      return parsed;
    } catch (parseError) {
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