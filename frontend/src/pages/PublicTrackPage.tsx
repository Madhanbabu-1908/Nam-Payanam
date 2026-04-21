import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'; // ✅ Added Popup to import
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon Issue
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export default function PublicTrackPage() {
  const { token } = useParams();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchLocation = async () => {
      try {
        // Note: In a real app, this should be a public endpoint that doesn't require Auth headers.
        // For now, we assume the backend allows this or we use a specific public axios instance.
        // If you get 401, you need to create a public route in backend like GET /tracking/public/:token
        
        // Simulating fetch for now since we don't have a public getter implemented in previous steps
        // You should implement GET /tracking/public/:token in backend similar to pushLocation but for SELECT
        
        // Placeholder: Replace with actual API call once backend public route is added
        // const res = await fetch(`https://nam-payanam.onrender.com/api/tracking/public/${token}`);
        // const data = await res.json();
        
        console.log("Polling for location updates for token:", token);
        
      } catch (error) {
        console.error("Failed to fetch public location", error);
      }
    };

    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="h-screen w-full relative bg-slate-100">
      <MapContainer 
        center={[11.0168, 76.9558]} 
        zoom={13} 
        className="w-full h-full z-0" 
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Live Bus Marker */}
        {location && (
          <Marker position={[location.lat, location.lng]} icon={busIcon}>
            <Popup>
              <div className="text-center p-1">
                <p className="font-bold text-sm">🚌 Live Bus Location</p>
                <p className="text-xs text-gray-500">
                  Updated: {lastUpdated?.toLocaleTimeString()}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Overlay Header */}
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md shadow-lg rounded-xl p-4 max-w-sm mx-auto border border-gray-200 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Live Tracking</h2>
              <p className="text-xs text-gray-500">Secure Token: {token ? `${token.substring(0,4)}...` : 'Loading...'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}