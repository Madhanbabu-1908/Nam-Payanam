import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../config/api';
import { Navigation, Play, Pause, MapPin } from 'lucide-react';

export default function DriverSimulator() {
  const { tripId } = useParams(); // ✅ Correct: Get tripId directly from useParams
  const [token, setToken] = useState<string>(''); 
  const [isRunning, setIsRunning] = useState(false);
  const [coords, setCoords] = useState({ lat: 11.0168, lng: 76.9558 }); // Default Coimbatore
  const [status, setStatus] = useState('Idle');

  // Fetch or Create Token on Load
  useEffect(() => {
    if (!tripId) return;
    
    const initToken = async () => {
      try {
        const res = await api.post(`/tracking/tokens/${tripId}`);
        if (res.data.success) {
          setToken(res.data.data.token);
          setStatus('Token Generated');
        }
      } catch (error) {
        setStatus('Error generating token');
        console.error(error);
      }
    };

    initToken();
  }, [tripId]);

  // Simulation Loop
  useEffect(() => {
    let interval: any;
    if (isRunning && token) {
      setStatus('Simulating Drive... 🚌');
      interval = setInterval(() => {
        // Simulate movement (Random walk for demo)
        const newLat = coords.lat + (Math.random() - 0.5) * 0.002;
        const newLng = coords.lng + (Math.random() - 0.5) * 0.002;
        
        setCoords({ lat: newLat, lng: newLng });

        // Push to Backend
        api.post(`/tracking/push/${token}`, {
          latitude: newLat,
          longitude: newLng,
          speed: Math.floor(Math.random() * 20) + 30 // Random speed 30-50 km/h
        }).then(() => {          // Optional: Update UI on success
        }).catch(err => {
          console.error("Push failed", err);
          setIsRunning(false);
          setStatus('Connection Lost');
        });
      }, 2000); // Update every 2 seconds
    } else if (!isRunning) {
      setStatus('Paused');
    }

    return () => clearInterval(interval);
  }, [isRunning, coords, token]);

  if (!tripId) return <div className="p-8 text-center">No Trip ID found in URL.</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white text-center">
          <Navigation className="h-12 w-12 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Driver Simulator</h1>
          <p className="text-indigo-200 text-sm">Trip: {tripId}</p>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Status Card */}
          <div className={`p-4 rounded-xl border text-center font-mono text-sm transition-colors ${
            isRunning 
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' 
              : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
          }`}>
            <p className="font-bold uppercase tracking-wider mb-1">Status</p>
            <p className="text-lg">{status}</p>
          </div>

          {/* Token Display */}
          <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl break-all text-xs font-mono text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-1">Secure Token:</p>
            <p className="font-bold text-slate-800 dark:text-white">{token || 'Generating...'}</p>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">LAT</p>
              <p className="font-mono text-sm">{coords.lat.toFixed(5)}</p>            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">LNG</p>
              <p className="font-mono text-sm">{coords.lng.toFixed(5)}</p>
            </div>
          </div>

          {/* Controls */}
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] ${
              isRunning 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200' 
                : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200'
            }`}
          >
            {isRunning ? <Pause size={20}/> : <Play size={20}/>}
            {isRunning ? 'Stop Engine' : 'Start Engine'}
          </button>

          {/* Public Link Hint */}
          {token && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
              <p className="text-xs text-slate-500 mb-2">Test the live view:</p>
              <a 
                href={`/track/${token}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline flex items-center justify-center gap-1"
              >
                <MapPin size={14}/> Open Public Tracking Page
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}