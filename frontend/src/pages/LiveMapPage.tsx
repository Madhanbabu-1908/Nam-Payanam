import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl, ScaleControl } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../config/api';
import { ArrowLeft, MapPin, Clock, Gauge, Navigation, AlertTriangle, PauseCircle } from 'lucide-react';

// ✅ Free Vector Tile Styles (No API Key)
const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark-matter',
};

// ✅ Speedometer Component (Same as before)
const Speedometer = ({ speed }: { speed: number }) => {
  const maxSpeed = 120;
  const percentage = Math.min((speed / maxSpeed) * 100, 100);
  const rotation = (percentage / 100) * 180 - 90;
  return (
    <div className="relative w-24 h-12 overflow-hidden flex justify-center items-end">
      <div className="absolute w-24 h-24 rounded-full border-[10px] border-slate-200 dark:border-slate-700 border-b-0"></div>
      <div className="absolute w-24 h-24 rounded-full border-[10px] border-indigo-600 border-b-0 origin-bottom transition-transform duration-500 ease-out" style={{ transform: `rotate(${rotation}deg)` }}></div>
      <div className="absolute w-1 h-10 bg-slate-800 dark:bg-white bottom-0 left-1/2 -translate-x-1/2 origin-bottom transition-transform duration-500 ease-out rounded-t-full z-10 shadow-sm" style={{ transform: `rotate(${rotation}deg)` }}></div>
      <div className="absolute w-3 h-3 bg-slate-800 dark:bg-white rounded-full bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20"></div>
      <div className="absolute bottom-[-5px] text-center w-full">
        <span className="text-xl font-bold text-slate-800 dark:text-white">{Math.round(speed)}</span>
        <span className="text-[10px] text-slate-500 block font-medium">km/h</span>
      </div>
    </div>
  );
};

// ✅ Safety Alert Component
const SafetyAlert = ({ type, message }: { type: 'speed' | 'stop' | 'deviation', message: string }) => {
  const colors = {
    speed: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
    stop: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
    deviation: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
  };
  const icons = { speed: <AlertTriangle size={16} />, stop: <PauseCircle size={16} />, deviation: <MapPin size={16} /> };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[type]} animate-pulse text-xs font-medium pointer-events-auto`}>
      {icons[type]} <span>{message}</span>
    </div>
  );
};

export default function LiveMapPage() {
  const { tripId } = useParams();  const navigate = useNavigate();
  const mapRef = useRef<any>(null);
  
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [traveledGeoJSON, setTraveledGeoJSON] = useState<any>(null);
  const [startLoc, setStartLoc] = useState<{ coords: [number, number], name: string } | null>(null);
  const [destLoc, setDestLoc] = useState<{ coords: [number, number], name: string } | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [alerts, setAlerts] = useState<{ type: 'speed' | 'stop' | 'deviation', message: string }[]>([]);
  
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Haversine Distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // Fetch Data
  useEffect(() => {
    if (!tripId) return;
    const fetchData = async () => {
      try {
        const [tripRes, liveRes] = await Promise.all([
          api.get(`/trips/${tripId}`),
          api.get(`/tracking/live/${tripId}`)
        ]);

        if (tripRes.data.success) {
          const t = tripRes.data.data;
          if (t.start_lat && t.start_lng) setStartLoc({ coords: [t.start_lat, t.start_lng], name: t.start_location || 'Start' });
          if (t.destination_lat && t.destination_lng) setDestLoc({ coords: [t.destination_lat, t.destination_lng], name: t.destination || 'Destination' });
          
          if (t.route_data && t.route_data.length > 1) {
            const coords = t.route_data.map((c: [number, number]) => [c[1], c[0]]); // [lng, lat] for GeoJSON
            setRouteGeoJSON({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });
            
            let dist = 0;
            for (let i = 0; i < t.route_data.length - 1; i++) dist += getDistance(t.route_data[i][0], t.route_data[i][1], t.route_data[i+1][0], t.route_data[i+1][1]);
            setTotalDistance(dist);
          }
        }

        if (liveRes.data.success && liveRes.data.data?.currentLocation) {          const { latitude, longitude, speed } = liveRes.data.data.currentLocation;
          const loc: [number, number] = [longitude, latitude]; // [lng, lat]
          setCurrentLocation(loc);
          setSpeed(speed || 0);
          
          // Update traveled path
          if (routeGeoJSON) {
            const routeCoords = routeGeoJSON.geometry.coordinates as [number, number][];
            let closestIdx = 0, minD = Infinity;
            routeCoords.forEach((c, i) => {
              const d = Math.hypot(c[0] - loc[0], c[1] - loc[1]);
              if (d < minD) { minD = d; closestIdx = i; }
            });
            setTraveledGeoJSON({ type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoords.slice(0, closestIdx + 1) } });
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [tripId]);

  // Auto-follow & Fit Bounds
  useEffect(() => {
    if (mapRef.current) {
      if (followVehicle && currentLocation) {
        mapRef.current.easeTo({ center: currentLocation, duration: 1000 });
      } else if (startLoc && destLoc && !currentLocation) {
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend(startLoc.coords);
        bounds.extend(destLoc.coords);
        mapRef.current.fitBounds(bounds, { padding: 50, duration: 1500 });
      }
    }
  }, [currentLocation, followVehicle, startLoc, destLoc]);

  // Safety Alerts
  useEffect(() => {
    if (!currentLocation) return;
    const newAlerts: typeof alerts = [];
    if (speed > 80) newAlerts.push({ type: 'speed', message: speed > 100 ? '⚠️ High Speed!' : '⚡ Speeding' });
    
    if (speed < 2) {
      if (!stopTimerRef.current) stopTimerRef.current = setTimeout(() => newAlerts.push({ type: 'stop', message: '⏸️ Stopped > 3m' }), 180000);
    } else {
      if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    }

    if (routeGeoJSON) {      let minD = Infinity;
      routeGeoJSON.geometry.coordinates.forEach((c: [number, number]) => {
        minD = Math.min(minD, getDistance(currentLocation[1], currentLocation[0], c[1], c[0]));
      });
      if (minD > 0.5) newAlerts.push({ type: 'deviation', message: '📍 Off Route' });
    }
    setAlerts(newAlerts);
  }, [currentLocation, speed, routeGeoJSON]);

  const progress = useMemo(() => {
    if (!currentLocation || !routeGeoJSON) return 0;
    const coords = routeGeoJSON.geometry.coordinates as [number, number][];
    let minD = Infinity, idx = 0;
    coords.forEach((c, i) => {
      const d = Math.hypot(c[0] - currentLocation[0], c[1] - currentLocation[1]);
      if (d < minD) { minD = d; idx = i; }
    });
    return Math.round((idx / (coords.length - 1)) * 100);
  }, [currentLocation, routeGeoJSON]);

  const eta = speed > 0 ? (totalDistance * (1 - progress/100)) / speed : 0;

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button onClick={() => navigate(-1)} className="p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-full shadow-lg text-slate-800 dark:text-white"><ArrowLeft size={20}/></button>
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-slate-200 dark:border-slate-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-sm text-slate-800 dark:text-white">Live Tracking</span>
          </div>
        </div>
      </div>

      {/* ✅ MapLibre Map */}
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 78.47, latitude: 12.05, zoom: 6 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES.dark}
        mapLib={maplibregl}
        attributionControl={false}
        interactiveLayerIds={[]}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />

        {/* Full Route (Gray) */}
        {routeGeoJSON && (          <source id="route" type="geojson" data={routeGeoJSON}>
            <layer id="route-line" type="line" paint={{ 'line-color': '#4b5563', 'line-width': 4, 'line-opacity': 0.6, 'line-cap': 'round' }} />
          </source>
        )}

        {/* Traveled Path (Indigo) */}
        {traveledGeoJSON && (
          <source id="traveled" type="geojson" data={traveledGeoJSON}>
            <layer id="traveled-line" type="line" paint={{ 'line-color': '#6366f1', 'line-width': 5, 'line-opacity': 0.9, 'line-cap': 'round' }} />
          </source>
        )}

        {/* Start Marker */}
        {startLoc && (
          <Marker longitude={startLoc.coords[0]} latitude={startLoc.coords[1]} anchor="bottom">
            <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg flex items-center justify-center"><MapPin size={18}/></div>
          </Marker>
        )}

        {/* Destination Marker */}
        {destLoc && (
          <Marker longitude={destLoc.coords[0]} latitude={destLoc.coords[1]} anchor="bottom">
            <div className="bg-red-500 text-white p-1.5 rounded-full shadow-lg flex items-center justify-center"><MapPin size={18}/></div>
          </Marker>
        )}

        {/* Live Bus Marker */}
        {currentLocation && (
          <Marker longitude={currentLocation[0]} latitude={currentLocation[1]} anchor="center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-40"></div>
              <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-xl border-2 border-indigo-500 flex items-center justify-center">
                <span className="text-lg">🚌</span>
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Follow Toggle */}
      <button onClick={() => setFollowVehicle(!followVehicle)} className={`absolute bottom-24 right-4 z-20 p-3 rounded-full shadow-lg transition-all ${followVehicle ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white'}`}>
        <Navigation size={20} className={followVehicle ? "animate-pulse" : ""} />
      </button>

      {/* Safety Alerts */}
      {alerts.length > 0 && (
        <div className="absolute top-20 left-4 right-4 z-20 flex flex-col gap-2">
          {alerts.map((a, i) => <SafetyAlert key={i} type={a.type} message={a.message} />)}
        </div>
      )}
      {/* Bottom Dashboard */}
      {currentLocation && (
        <div className="absolute bottom-6 left-4 right-4 z-20 animate-fade-in">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 max-w-md mx-auto">
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Current Leg</p>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 truncate">
                  <MapPin size={16} className="text-indigo-600 flex-shrink-0"/> 
                  <span className="truncate">{startLoc?.name} → {destLoc?.name}</span>
                </h3>
              </div>
              <span className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded-lg">{progress}% Done</span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-700 pr-2"><Speedometer speed={speed} /></div>
              <div className="col-span-2 flex justify-around pl-2">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-white font-bold text-lg"><Gauge size={18} className="text-emerald-500"/>{totalDistance.toFixed(1)}<span className="text-xs font-normal text-slate-500">km</span></div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase">DIST</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-white font-bold text-lg"><Clock size={18} className="text-orange-500"/>{eta > 0 ? `${eta.toFixed(1)}h` : '--'}</div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase">ETA</p>
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}