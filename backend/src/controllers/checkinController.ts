import { Request, Response } from "express";
import { supabaseAdmin } from "../config/db";

const createCheckin = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { tripId, location } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!tripId || !location) {
      return res.status(400).json({
        success: false,
        message: "Trip ID and location are required",
      });
    }

    const { data: member } = await supabaseAdmin
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", userId)
      .single();

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Not a trip member",
      });
    }

    const { error } = await supabaseAdmin.from("checkins").insert({
      trip_id: tripId,
      user_id: userId,
      location,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return res.json({ success: true, message: "Check-in created" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 🔥 NEW: get all checkins for a trip
const getCheckins = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("checkins")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 🔥 NEW: update status
const updateStatus = async (req: Request, res: Response) => {
  try {
    const { checkinId } = req.params;
    const { status } = req.body;

    const { error } = await supabaseAdmin
      .from("checkins")
      .update({ status })
      .eq("id", checkinId);

    if (error) throw error;

    return res.json({ success: true, message: "Status updated" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ EXPORT FIX
export const checkinController = {
  createCheckin,
  getCheckins,
  updateStatus,
};