import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../config/api';
import { ArrowLeft, Navigation } from 'lucide-react';

// Fix Leaflet Default Icon Issue
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

export default function LiveMapPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // ✅ FIX: Explicitly type the state as [number, number][]
  const [history, setHistory] = useState<[number, number][]>([]);
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const defaultCenter: [number, number] = [11.0168, 76.9558];

  useEffect(() => {
    if (!tripId) return;

    const fetchLocation = async () => {
      try {
        const res = await api.get(`/tracking/live/${tripId}`);
        if (res.data.success && res.data.data) {
          const { latitude, longitude } = res.data.data;
          const newLoc = { lat: latitude, lng: longitude };
          
          setLocation(newLoc);
          
          // ✅ FIX: Cast the new point explicitly to [number, number]
          setHistory(prev => {
            const newPoint: [number, number] = [latitude, longitude];
            const newHistory = [...prev, newPoint];
            return newHistory.slice(-50);
          });
          
          setLastUpdated(new Date());
        }
      } catch (e) { 
        console.error("Error fetching live location:", e);       }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  const currentCenter: [number, number] = location 
    ? [location.lat, location.lng] 
    : defaultCenter;

  return (
    <div className="relative w-full h-screen bg-slate-100">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition text-slate-800 dark:text-white"
          >
            <ArrowLeft size={20}/>
          </button>
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-sm text-slate-800 dark:text-white">Live Tracking</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="w-full h-full z-0">
        <MapContainer 
          center={currentCenter} 
          zoom={13} 
          className="w-full h-full outline-none" 
          scrollWheelZoom={true}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {history.length > 1 && (
            <Polyline positions={history} color="#4f46e5" weight={4} opacity={0.7} dashArray="5, 10" />
          )}

          {location && (
            <Marker position={[location.lat, location.lng]} icon={busIcon}>              <Popup>
                <div className="text-center min-w-[150px]">
                  <p className="font-bold text-indigo-600">Your Bus 🚌</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Updated: {lastUpdated?.toLocaleTimeString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Bottom Info Card */}
      {location && (
        <div className="absolute bottom-6 left-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl p-4 z-[1000] animate-fade-in border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Status</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Navigation size={18}/> On Route
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Speed</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">45 <span className="text-sm font-normal text-slate-500">km/h</span></p>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-2/3 animate-pulse"></div>
          </div>
        </div>
      )}
    </div>
  );
}