import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../config/api';
import { ArrowLeft, Navigation, Clock } from 'lucide-react';

// Fix Leaflet Default Icon Issue
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png', // Bus Icon
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export default function LiveMapPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [history, setHistory] = useState<[number, number][]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const fetchLocation = async () => {
      try {
        const res = await api.get(`/tracking/live/${tripId}`);
        if (res.data.success && res.data.data) {
          const { latitude, longitude } = res.data.data;
          setLocation({ lat: latitude, lng: longitude });
          setHistory(prev => [...prev.slice(-50), [latitude, longitude]]); // Keep last 50 points
          setLastUpdated(new Date());
        }
      } catch (e) { console.error(e); }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [tripId]);

  const center = location || { lat: 11.0168, lng: 76.9558 }; // Default to Coimbatore if no loc

  return (
    <div className="h-screen flex flex-col relative">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"><ArrowLeft/></button>          <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-sm text-gray-800">Live Tracking</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer center={[center.lat, center.lng]} zoom={13} className="w-full h-full" scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Path History */}
        {history.length > 1 && (
          <Polyline positions={history} color="#4f46e5" weight={4} opacity={0.7} dashArray="5, 10" />
        )}

        {/* Live Bus Marker */}
        {location && (
          <Marker position={[location.lat, location.lng]} icon={busIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">Your Bus is Here! 🚌</p>
                <p className="text-xs text-gray-500">Updated: {lastUpdated?.toLocaleTimeString()}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Bottom Info Card */}
      {location && (
        <div className="absolute bottom-6 left-4 right-4 bg-white rounded-2xl shadow-xl p-4 z-[1000] animate-fade-in border border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Estimated Arrival</p>
              <p className="text-xl font-bold text-indigo-600">15 mins</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-bold">Speed</p>
              <p className="text-xl font-bold text-gray-800">45 <span className="text-sm font-normal">km/h</span></p>
            </div>
          </div>
          <div className="mt-3 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-2/3 animate-pulse"></div>
          </div>
          <p className="text-xs text-center mt-2 text-gray-400">Vehicle is on track</p>
        </div>      )}
    </div>
  );
}