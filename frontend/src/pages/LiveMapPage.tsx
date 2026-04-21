import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api } from '../config/api';
import { ArrowLeft, Navigation, MapPin } from 'lucide-react';

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
            
            if (route && route.length > 0) {
              const currentIndex = route.findIndex((p: [number, number]) => 
                Math.abs(p[0] - currentLocation.latitude) < 0.001 && 
                Math.abs(p[1] - currentLocation.longitude) < 0.001
              );
              if (currentIndex !== -1) {
                setProgress(Math.round((currentIndex / (route.length - 1)) * 100));
              }
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
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-slateThe errors indicate that the files got corrupted during copy-paste, likely due to hidden characters or formatting issues. The TypeScript compiler is seeing invalid syntax like `Unexpected keyword` and `Unterminated template literal`.

Here are the **clean, raw, copy-paste ready** versions of the files. Please delete your existing files and create new ones with this exact content.

### 1. `frontend/src/config/api.ts` (Clean & Fixed)

```typescript
import axios from 'axios';
import { supabase } from './supabaseClient';

const cache = new Map<string, any>();

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get' && response.data) {
      cache.set(response.config.url!, response.data);
    }
    return response;
  },
  (error) => {
    if (!navigator.onLine && error.config && error.config.method === 'get') {
      const cachedData = cache.get(error.config.url!);
      if (cachedData) {
        console.log("Serving from cache:", error.config.url);
        return Promise.resolve({ data: cachedData });
      }
    }
    return Promise.reject(error);
  }
);

export { api };