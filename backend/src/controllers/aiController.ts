import { Request, Response } from "express";
import { aiService } from "../services/aiService";

// 🔥 1. Generate Trip Plan
export const generateTripPlan = async (req: Request, res: Response) => {
  try {
    const { destination, days, budget, interests, startLocation } = req.body;

    // ✅ Convert object → string prompt
    const prompt = `
Plan a trip:

Destination: ${destination}
Days: ${days}
Budget: ${budget}
Interests: ${interests}
Start Location: ${startLocation}
`;

    const result = await aiService.generateItinerary(prompt);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("AI Trip Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to generate trip plan",
    });
  }
};

// 🔥 2. Chat with AI
export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const reply = await aiService.chat(message);

    return res.json({
      success: true,
      data: reply,
    });
  } catch (err: any) {
    console.error("AI Chat Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Chat failed",
    });
  }
};

// 🔥 3. Budget Analysis
export const analyzeBudget = async (req: Request, res: Response) => {
  try {
    const { budgetDetails } = req.body;

    if (!budgetDetails) {
      return res.status(400).json({
        success: false,
        message: "Budget details required",
      });
    }

    const result = await aiService.analyzeBudget(budgetDetails);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Budget Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Budget analysis failed",
    });
  }
};

// 🔥 4. Trip Summary
export const generateSummary = async (req: Request, res: Response) => {
  try {
    const { tripData } = req.body;

    if (!tripData) {
      return res.status(400).json({
        success: false,
        message: "Trip data required",
      });
    }

    const result = await aiService.generateSummary(tripData);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Summary Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Summary generation failed",
    });
  }
};