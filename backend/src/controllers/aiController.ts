import { Request, Response } from "express";
import { aiService } from "../services/aiService";

// 🔥 Controller as OBJECT (IMPORTANT for your routes)
export const aiController = {

  // ✅ 1. Regenerate itinerary
  regenerateItinerary: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;

      // In real app → fetch trip details from DB using tripId
      const prompt = `Regenerate itinerary for trip ID: ${tripId}`;

      const result = await aiService.generateItinerary(prompt);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("AI regenerate error:", err.message);

      return res.status(500).json({
        success: false,
        message: "Failed to regenerate itinerary",
      });
    }
  },

  // ✅ 2. Chat
  chat: async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      const { tripId } = req.params;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      const reply = await aiService.chat(
        `Trip ${tripId}: ${message}`
      );

      return res.json({
        success: true,
        data: reply,
      });
    } catch (err: any) {
      console.error("AI chat error:", err.message);

      return res.status(500).json({
        success: false,
        message: "Chat failed",
      });
    }
  },

  // ✅ 3. Chat history (mock for now)
  getChatHistory: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;

      // 🔥 Replace with DB later
      return res.json({
        success: true,
        data: [
          { role: "user", message: "Plan my day" },
          { role: "ai", message: "Here is your plan..." },
        ],
      });
    } catch (err: any) {
      console.error("Chat history error:", err.message);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch chat history",
      });
    }
  },

  // ✅ 4. Budget analysis
  analyzeBudget: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;

      // In real app → fetch trip expenses
      const input = `Analyze budget for trip ID: ${tripId}`;

      const result = await aiService.analyzeBudget(input);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("Budget error:", err.message);

      return res.status(500).json({
        success: false,
        message: "Budget analysis failed",
      });
    }
  },

  // ✅ 5. Trip summary
  generateSummary: async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;

      const input = `Summarize trip ID: ${tripId}`;

      const result = await aiService.generateSummary(input);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error("Summary error:", err.message);

      return res.status(500).json({
        success: false,
        message: "Summary failed",
      });
    }
  },
};