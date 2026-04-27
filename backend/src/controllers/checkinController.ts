import { Request, Response } from "express";
import { supabaseAdmin } from '../config/db';

export const checkIn = async (req: Request, res: Response) => {
  try {
    // 🔐 Get user from auth middleware
    const userId = (req as any).user?.id;

    // 📦 Extract request data
    const { tripId, location } = req.body;

    // ❗ Validations
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    if (!tripId || !location) {
      return res.status(400).json({
        success: false,
        message: "Trip ID and location are required",
      });
    }

    // 🧠 Optional: Check if user is part of trip
    const { data: member, error: memberError } = await supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this trip",
      });
    }

    // 📍 Insert check-in
    const { error } = await supabase.from("checkins").insert({
      trip_id: tripId,
      user_id: userId,
      location,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    // ✅ Success
    return res.status(200).json({
      success: true,
      message: "Check-in successful",
    });
  } catch (err: any) {
    console.error("❌ Check-in Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to check-in",
      error: err.message,
    });
  }
};