import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../config/api';
import { ArrowLeft, Navigation, Clock } from 'lucide-react';

// Fix Leaflet Default Icon Issue
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/30This is the **ultimate upgrade**. We are moving from a "Planning Tool" to a **Real-Time Operations Platform**.

To achieve **Rapido/RedBus-style tracking**, we need three components:
1.  **🗺️ Interactive Live Map**: Visualizing the route and vehicle movement (using Leaflet + OpenStreetMap).
2.  **📍 Real-Time Location Stream**: Simulating GPS updates from a driver's device to the server.
3.  **⚡ WebSocket/Polling**: Pushing coordinates to users instantly so the bus icon moves smoothly.

*Note: For a production app, you would use a native mobile app for the driver to send real GPS. Here, we will build a **"Driver Simulator"** in the web app to demonstrate the technology.*

---

### 🚀 Phase 1: Database Schema (Supabase)

Run this SQL in your **Supabase SQL Editor** to create the tracking tables.

```sql
-- 1. Create Tracking Tokens (Secure links for drivers)
CREATE TABLE tracking_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Live Location Logs
CREATE TABLE location_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  speed NUMERIC DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tracking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active tokens" ON tracking_tokens FOR SELECT USING (is_active = true);
CREATE POLICY "Members can view logs" ON location_logs FOR SELECT USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
);
CREATE POLICY "Token holders can insert logs" ON location_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tracking_tokens WHERE token = current_setting('app.current_token', true)::text AND trip_id = location_logs.trip_id)
);

-- Index for fast latest location lookup
CREATE INDEX idx_location_logs_trip_time ON location_logs(trip_id, timestamp DESC);