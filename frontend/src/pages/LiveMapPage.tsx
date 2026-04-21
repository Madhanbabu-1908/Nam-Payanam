import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../config/api';
import { ArrowLeft, Navigation, Clock, MapPin } from 'lucide-react';

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
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [startLoc, setStartLoc] = useState<string>('');
  const [destLoc, setDestLoc] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const defaultCenter: [number, number] = [11.0168, 76.9558];

  useEffect(() => {
    if (!tripId) return;

    const fetchLocation = async () => {
      try {
        const res = await api.get(`/tracking/live/${tripId}`);
        if (res.data.success && res.data.data) {
          const { currentLocation, route, startLocation, destination } = res.data.data;
          
          if (currentLocation) {
            setCurrentLocation({ lat: currentLocation.latitude, lng: currentLocation.longitude });
            setLastUpdated(new Date());
            
            // Calculate progress (simple % based on index in route array)
            const currentIndex = route.findIndex(p => 
              Math.abs(p[0] - currentLocation.latitude) < 0.001 && 
              Math.abs(p[1] - currentLocation.longitude) < 0.001
            );
            if (currentIndex !== -1) {
              setProgress(Math.round((currentIndex / (route.length - 1)) * 100));
            }
          }          
          setRoute(route || []);
          setStartLoc(startLocation || '');
          setDestLoc(destination || '');
        }
      } catch (e) { 
        console.error("Error fetching live location:", e); 
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  const currentCenter: [number, number] = currentLocation 
    ? [currentLocation.lat, currentLocation.lng] 
    : defaultCenter;

  return (
    <div className="relative w-full h-screen bg-slate-100 dark:bg-slate-900">
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
          {/* Full Route Line */}
          {route.length > 1 && (
            <Polyline positions={route} color="#94a3b8" weight={3} opacity={0.5} dashArray="5, 5" />
          )}

          {/* Traveled Path (up to current location) */}
          {currentLocation && route.length > 1 && (
            <Polyline 
              positions={route.slice(0, route.findIndex(p => 
                Math.abs(p[0] - currentLocation.lat) < 0.001 && 
                Math.abs(p[1] - currentLocation.lng) < 0.001
              ) + 1]} 
              color="#4f46e5" 
              weight={4} 
              opacity={0.8} 
            />
          )}

          {/* Start Marker */}
          {route.length > 0 && (
            <Marker position={route[0]} icon={new L.DivIcon({
              html: `<div style="background:#10b981;color:white;padding:4px;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:bold;">S</div>`,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}>
              <Popup><strong>Start:</strong> {startLoc}</Popup>
            </Marker>
          )}

          {/* Destination Marker */}
          {route.length > 0 && (
            <Marker position={route[route.length - 1]} icon={new L.DivIcon({
              html: `<div style="background:#ef4444;color:white;padding:4px;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:bold;">D</div>`,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}>
              <Popup><strong>Destination:</strong> {destLoc}</Popup>
            </Marker>
          )}

          {/* Live Bus Marker */}
          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lng]} icon={busIcon}>
              <Popup>
                <div className="text-center min-w-[150px]">
                  <p className="font-bold text-indigo-600">Your Bus 🚌</p>
                  <p className="text-xs text-gray-500 mt-1">                    Updated: {lastUpdated?.toLocaleTimeString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Bottom Info Card */}
      {currentLocation && (
        <div className="absolute bottom-6 left-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl p-4 z-[1000] animate-fade-in border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Route</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1">
                <MapPin size={14} className="text-emerald-500"/> {startLoc} → {destLoc}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Progress</p>
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{progress}%</p>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-center mt-2 text-slate-400">Vehicle is moving towards destination</p>
        </div>
      )}
    </div>
  );
}