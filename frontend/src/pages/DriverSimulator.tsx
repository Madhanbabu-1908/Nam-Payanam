import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../config/api';
import { Navigation, Play, Pause } from 'lucide-react';

export default function DriverSimulator() {
  const { tripId } = useState(useParams().tripId || ''); 
  // In real app, get token from API first. For demo, assume we have one or create it.
  const [token, setToken] = useState<string>(''); 
  const [isRunning, setIsRunning] = useState(false);
  const [coords, setCoords] = useState({ lat: 11.0168, lng: 76.9558 });

  // Helper to get/create token (Simplified)
  useEffect(() => {
    if(tripId) {
      api.post(`/tracking/tokens/${tripId}`).then(res => {
        if(res.data.success) setToken(res.data.data.token);
      });
    }
  }, [tripId]);

  useEffect(() => {
    let interval: any;
    if (isRunning && token) {
      interval = setInterval(() => {
        // Simulate movement (Random walk for demo)
        const newLat = coords.lat + (Math.random() - 0.5) * 0.002;
        const newLng = coords.lng + (Math.random() - 0.5) * 0.002;
        
        setCoords({ lat: newLat, lng: newLng });

        api.post(`/tracking/push/${token}`, {
          latitude: newLat,
          longitude: newLng,
          speed: 45
        });
      }, 2000); // Update every 2 seconds
    }
    return () => clearInterval(interval);
  }, [isRunning, coords, token]);

  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">🚌 Driver Simulator</h1>
      <p className="text-gray-500 mb-6">Simulates GPS updates for Trip {tripId}</p>
      
      <div className="bg-gray-100 p-4 rounded-xl mb-6 font-mono text-sm break-all">
        Token: {token || 'Loading...'}
      </div>

      <button 
        onClick={() => setIsRunning(!isRunning)}
        className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${isRunning ? 'bg-red-500' : 'bg-green-500'}`}
      >
        {isRunning ? <Pause/> : <Play/>}
        {isRunning ? 'Stop Simulation' : 'Start Driving'}
      </button>

      <div className="mt-8 text-left bg-white p-4 rounded shadow">
        <p className="font-bold">Current Coords:</p>
        <p>Lat: {coords.lat.toFixed(6)}</p>
        <p>Lng: {coords.lng.toFixed(6)}</p>
      </div>
      
      <p className="mt-4 text-xs text-gray-400">
        Open <a href={`/track/${token}`} target="_blank" className="text-indigo-600 underline">Public Track Link</a> in another tab to see live movement.
      </p>
    </div>
  );
}