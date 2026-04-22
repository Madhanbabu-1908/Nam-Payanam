import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../config/api';
import { ArrowLeft, MapPin, Clock, Gauge, Navigation } from 'lucide-react';

// Fix Leaflet Default Icon
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// ✅ Professional Speedometer Component
const Speedometer = ({ speed }: { speed: number }) => {
  const maxSpeed = 120;
  const percentage = Math.min((speed / maxSpeed) * 100, 100);
  const rotation = (percentage / 100) * 180 - 90;

  return (
    <div className="relative w-24 h-12 overflow-hidden flex justify-center items-end">
      <div className="absolute w-24 h-24 rounded-full border-[10px] border-slate-200 dark:border-slate-700 border-b-0"></div>
      <div 
        className="absolute w-24 h-24 rounded-full border-[10px] border-indigo-600 border-b-0 origin-bottom transition-transform duration-500 ease-out"
        style={{ transform: `rotate(${rotation}deg)` }}
      ></div>
      <div 
        className="absolute w-1 h-10 bg-slate-800 dark:bg-white bottom-0 left-1/2 -translate-x-1/2 origin-bottom transition-transform duration-500 ease-out rounded-t-full z-10 shadow-sm"
        style={{ transform: `rotate(${rotation}deg)` }}
      ></div>
      <div className="absolute w-3 h-3 bg-slate-800 dark:bg-white rounded-full bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20"></div>
      <div className="absolute bottom-[-5px] text-center w-full">
        <span className="text-xl font-bold text-slate-800 dark:text-white">{Math.round(speed)}</span>
        <span className="text-[10px] text-slate-500 block font-medium">km/h</span>
      </div>
    </div>
  );
};

// ✅ Component to Handle Smooth Map Following
function FollowVehicle({ location, active }: { location: [number, number] | null, active: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (active && location) {
      // Smoothly fly to the new location
      map.flyTo(location, map.getZoom(), {        animate: true,
        duration: 1.5 // Seconds for smooth transition
      });
    }
  }, [location, active, map]);

  return null;
}

export default function LiveMapPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [startLoc, setStartLoc] = useState<string>('');
  const [destLoc, setDestLoc] = useState<string>('');
  const [speed, setSpeed] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [followVehicle, setFollowVehicle] = useState(true); // Auto-follow toggle

  const defaultCenter: [number, number] = [11.0168, 76.9558];

  // Haversine Formula
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  // Calculate Total Route Distance
  useEffect(() => {
    if (route.length > 1) {
      let dist = 0;
      for (let i = 0; i < route.length - 1; i++) {
        dist += getDistanceFromLatLonInKm(route[i][0], route[i][1], route[i+1][0], route[i+1][1]);
      }
      setTotalDistance(dist);
    }
  }, [route]);

  // Fetch Live Data
  useEffect(() => {    if (!tripId) return;
    const fetchLocation = async () => {
      try {
        const res = await api.get(`/tracking/live/${tripId}`);
        if (res.data.success && res.data.data) {
          const { currentLocation, route, startLocation, destination } = res.data.data;
          
          if (currentLocation) {
            setCurrentLocation([currentLocation.latitude, currentLocation.longitude]);
            setSpeed(currentLocation.speed || 0);
            setLastUpdated(new Date());
          }
          setRoute(route || []);
          setStartLoc(startLocation || '');
          setDestLoc(destination || '');
        }
      } catch (e) { console.error("Error fetching live location:", e); }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  // Calculate Progress %
  const progress = useMemo(() => {
    if (!currentLocation || route.length === 0) return 0;
    let minDist = Infinity;
    let closestIndex = 0;
    route.forEach((point, index) => {
      const dist = Math.sqrt(Math.pow(point[0] - currentLocation[0], 2) + Math.pow(point[1] - currentLocation[1], 2));
      if (dist < minDist) { minDist = dist; closestIndex = index; }
    });
    return Math.round((closestIndex / (route.length - 1)) * 100);
  }, [currentLocation, route]);

  const etaHours = speed > 0 ? (totalDistance * (1 - progress/100)) / speed : 0;

  return (
    <div className="relative w-full h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button onClick={() => navigate(-1)} className="p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition text-slate-800 dark:text-white">
            <ArrowLeft size={20}/>
          </button>
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-sm text-slate-800 dark:text-white">Live Tracking</span>          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="w-full h-full z-0">
        <MapContainer 
          center={currentLocation || defaultCenter} 
          zoom={13} 
          className="w-full h-full outline-none" 
          scrollWheelZoom={true}
          zoomControl={false}
        >
          {/* ✅ PROFESSIONAL TILES: CartoDB Dark Matter (Sleek & Modern) */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* Full Route Line (Gray) */}
          {route.length > 1 && (
            <Polyline positions={route} color="#4b5563" weight={4} opacity={0.5} lineCap="round" />
          )}

          {/* Traveled Path (Indigo/Purple Gradient Effect via Solid Color for now) */}
          {currentLocation && route.length > 1 && (
             <Polyline 
              positions={route.slice(0, route.findIndex((p) => 
                Math.abs(p[0] - currentLocation[0]) < 0.01 && Math.abs(p[1] - currentLocation[1]) < 0.01
              ) + 1)} 
              color="#6366f1" 
              weight={5} 
              opacity={0.9} 
              lineCap="round"
            />
          )}

          {/* Start Marker */}
          {route.length > 0 && (
            <Marker position={route[0]} icon={new L.DivIcon({
              html: `<div class="bg-emerald-500 text-white p-1 rounded-full shadow-lg flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
              className: '', iconSize: [30, 30], iconAnchor: [15, 30]
            })}>
              <Popup><strong>Start:</strong> {startLoc}</Popup>
            </Marker>
          )}

          {/* Destination Marker */}
          {route.length > 0 && (
            <Marker position={route[route.length - 1]} icon={new L.DivIcon({              html: `<div class="bg-red-500 text-white p-1 rounded-full shadow-lg flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
              className: '', iconSize: [30, 30], iconAnchor: [15, 30]
            })}>
              <Popup><strong>Destination:</strong> {destLoc}</Popup>
            </Marker>
          )}

          {/* Live Bus Marker */}
          {currentLocation && (
            <Marker position={currentLocation} icon={busIcon}>
              <Popup>
                <div className="text-center min-w-[150px]">
                  <p className="font-bold text-indigo-600">Your Bus 🚌</p>
                  <p className="text-xs text-gray-500 mt-1">Updated: {lastUpdated?.toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* ✅ Smooth Follow Logic */}
          <FollowVehicle location={currentLocation} active={followVehicle} />
        </MapContainer>
      </div>

      {/* Toggle Follow Button */}
      <button 
        onClick={() => setFollowVehicle(!followVehicle)}
        className={`absolute bottom-24 right-4 z-[1000] p-3 rounded-full shadow-lg transition-all ${
          followVehicle ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white'
        }`}
        title={followVehicle ? "Auto-Follow ON" : "Auto-Follow OFF"}
      >
        <Navigation size={20} className={followVehicle ? "animate-pulse" : ""} />
      </button>

      {/* Bottom Dashboard */}
      {currentLocation && (
        <div className="absolute bottom-6 left-4 right-4 z-[1000] animate-fade-in">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 max-w-md mx-auto">
            
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Current Leg</p>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 truncate max-w-[200px]">
                  <MapPin size={16} className="text-indigo-600 flex-shrink-0"/> 
                  <span className="truncate">{startLoc} → {destLoc}</span>
                </h3>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                 <span className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded-lg">                   {progress}% Done
                 </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-700 pr-2">
                <Speedometer speed={speed} />
              </div>
              <div className="col-span-2 flex justify-around pl-2">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-white font-bold text-lg">
                    <Gauge size={18} className="text-emerald-500"/>
                    {totalDistance.toFixed(1)} <span className="text-xs font-normal text-slate-500">km</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase tracking-wide">Total Dist</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-white font-bold text-lg">
                    <Clock size={18} className="text-orange-500"/>
                    {etaHours > 0 ? `${etaHours.toFixed(1)}h` : '--'}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase tracking-wide">ETA Left</p>
                </div>
              </div>
            </div>

            <div className="mt-4 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-1000 ease-linear relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[4px]"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}