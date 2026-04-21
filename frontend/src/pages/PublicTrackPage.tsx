import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../config/api'; // Note: This might need a public axios instance if auth headers block it

const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export default function PublicTrackPage() {
  const { token } = useParams();
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    // You need a public endpoint or a specific public axios instance for this
    // For now, assuming we can hit the backend. In prod, create a specific public route.
    const fetchLoc = async () => {
       // Implementation depends on making this endpoint publicly accessible without auth header
       // Ideally: fetch(`https://api.com/tracking/public/${token}`)
       console.log("Fetching public location for token:", token);
    };
    const interval = setInterval(fetchLoc, 5000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="h-screen w-full">
      <MapContainer center={[11.0168, 76.9558]} zoom={12} className="w-full h-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {location && <Marker position={[location.lat, location.lng]} icon={busIcon}><Popup>Live Bus</Popup></Marker>}
      </MapContainer>
      <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded shadow font-bold">
        🔒 Secure Tracking Link
      </div>
    </div>
  );
}