import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon Issue
const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

export default function PublicTrackPage() {
  const { token } = useParams();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchLocation = async () => {
      try {
        // Use the public endpoint we created in backend
        const res = await fetch(`https://nam-payanam.onrender.com/api/tracking/public/${token}`);
        const data = await res.json();
        
        if (data.success && data.data) {
          setLocation({ lat: data.data.latitude, lng: data.data.longitude });
          setLastUpdated(new Date());
          setError(null);
        } else {
          setError(data.error || 'Invalid tracking link');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to connect to server');
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const defaultCenter: [number, number] = [11.0168, 76.9558];
  const currentCenter: [number, number] = location ? [location.lat, location.lng] : defaultCenter;
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm">
          <h2 className="text-xl font-bold text-red-600 mb-2">Tracking Unavailable</h2>
          <p className="text-slate-600">{error}</p>
          <p className="text-xs text-slate-400 mt-4">Please check the link or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-slate-100">
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-lg rounded-xl p-4 max-w-sm mx-auto border border-slate-200 dark:border-slate-700 pointer-events-auto flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Live Bus Tracking</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Token: {token ? `${token.substring(0,4)}...` : 'Loading...'}</p>
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
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {location && (
            <Marker position={[location.lat, location.lng]} icon={busIcon}>
              <Popup>
                <div className="text-center p-1">
                  <p className="font-bold text-sm text-indigo-600">🚌 Live Location</p>
                  <p className="text-xs text-gray-500">
                    Updated: {lastUpdated?.toLocaleTimeString()}
                  </p>
                </div>
              </Popup>            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}