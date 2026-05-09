import { Request, Response } from "express";
import { supabaseAdmin } from "../config/db";

const createCheckin = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    // 1. Destructure fields matching Frontend CheckinPage.tsx
    const { tripId, locationName, latitude, longitude, icon, note } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!tripId || !locationName) {
      return res.status(400).json({
        success: false,
        message: "Trip ID and Location Name are required",
      });
    }

    // 2. Verify user is a member of the trip
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

    // 3. Insert into Database
    // ⚠️ MATCHING YOUR SCHEMA EXACTLY: latitude, longitude, location_name
    const { error } = await supabaseAdmin.from("checkins").insert({
      trip_id: tripId,
      user_id: userId,
      location_name: locationName, 
      latitude: latitude,               
      longitude: longitude,             
      icon: icon || 'PIN',         
      note: note,                  
      status: 'WAITING',           
      checked_in_at: new Date().toISOString(), // Matches your schema column name
    });

    if (error) {
      console.error("Supabase Insert Error:", error);
      throw error;
    }

    return res.json({ success: true, message: "Check-in created" });
  } catch (err: any) {
    console.error("❌ Create Checkin Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getCheckins = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { data, error } = await supabaseAdmin
      .from("checkins")
      .select("*")
      .eq("trip_id", tripId)
      .order("checked_in_at", { ascending: false }); // Use checked_in_at for sorting

    if (error) throw error;
    return res.json({ success: true,  data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateStatus = async (req: Request, res: Response) => {
  try {
    const { checkinId } = req.params;
    const { status } = req.body;
    
    // Validate status against your DB constraint
    const validStatuses = ['WAITING', 'PICKED_UP', 'ARRIVED'];
    if (!validStatuses.includes(status)) {
       return res.status(400).json({ success: false, message: "Invalid status" });
    }

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

export const checkinController = {
  createCheckin,
  getCheckins,
  updateStatus,
};
