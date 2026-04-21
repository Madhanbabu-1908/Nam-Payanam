import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { Navigation, Play, Pause, MapPin, Copy, CheckCircle, Clock, Users } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function DriverSimulator() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string>(''); 
  const [isRunning, setIsRunning] = useState(false);
  const [coords, setCoords] = useState({ lat: 11.0168, lng: 76.9558 });
  const [status, setStatus] = useState<'idle' | 'generating' | 'active' | 'paused' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  // Fetch or Create Token on Load
  useEffect(() => {
    if (!tripId) return;
    
    const initToken = async () => {
      setStatus('generating');
      try {
        const res = await api.post(`/tracking/tokens/${tripId}`);
        if (res.data.success) {
          setToken(res.data.data.token);
          setStatus('idle');
        }
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
    };

    initToken();
  }, [tripId]);

  // Simulation Loop
  useEffect(() => {
    let interval: any;
    if (isRunning && token) {
      setStatus('active');
      interval = setInterval(() => {
        const newLat = coords.lat + (Math.random() - 0.5) * 0.002;
        const newLng = coords.lng + (Math.random() - 0.5) * 0.002;
        
        setCoords({ lat: newLat, lng: newLng });

        api.post(`/tracking/push/${token}`, {
          latitude: newLat,
          longitude: newLng,          speed: Math.floor(Math.random() * 20) + 30
        }).catch(err => {
          console.error("Push failed", err);
          setIsRunning(false);
          setStatus('error');
        });
      }, 2000);
    } else if (!isRunning && status === 'active') {
      setStatus('paused');
    }

    return () => clearInterval(interval);
  }, [isRunning, coords, token, status]);

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/track/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!tripId) return (
    <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <p className="text-slate-500 dark:text-slate-400">Trip ID not found in URL.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline">Go Back</button>
      </div>
    </div>
  );

  const statusInfo = {
    idle: { text: 'Ready to Start', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' },
    generating: { text: 'Generating Token...', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    active: { text: 'Simulating Drive', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    paused: { text: 'Simulation Paused', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' },
    error: { text: 'Connection Error', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' }
  };

  const { text, color, bg } = statusInfo[status];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-300">
      <div className="max-w-2xl mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Driver Simulator</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          {/* Status Bar */}
          <div className={`${bg} p-4 border-b border-slate-100 dark:border-slate-700`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status === 'active' && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>}
                <span className={`font-bold uppercase tracking-wider text-sm ${color}`}>{text}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Trip ID: {tripId}</div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Token Card */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Secure Tracking Token</p>
                <button 
                  onClick={handleCopy}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                >
                  {copied ? <CheckCircle size={14}/> : <Copy size={14}/>} {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <div className="font-mono text-sm break-all bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                {token ? `${window.location.origin}/track/${token}` : 'Generating...'}
              </div>
            </div>

            {/* Coordinates Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Latitude</p>
                <p className="font-mono text-lg font-bold text-slate-800 dark:text-white">{coords.lat.toFixed(6)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Longitude</p>
                <p className="font-mono text-lg font-bold text-slate-800 dark:text-white">{coords.lng.toFixed(6)}</p>
              </div>
            </div>

            {/* Control Button */}
            <div className="pt-4">
              <Button 
                variant={isRunning ? 'secondary' : 'primary'}                 onClick={() => setIsRunning(!isRunning)} 
                className="w-full py-4 flex items-center justify-center gap-2 font-bold"
                disabled={status === 'generating' || !token}
              >
                {isRunning ? <Pause size={20}/> : <Play size={20}/>}
                {isRunning ? 'Stop Simulation' : 'Start Driving'}
              </Button>
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-blue-600 dark:text-blue-400" /> How It Works
              </h3>
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <li>• Click "Start Driving" to begin simulating GPS updates.</li>
                <li>• Share the tracking link with passengers.</li>
                <li>• The bus icon moves in real-time on their map.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}