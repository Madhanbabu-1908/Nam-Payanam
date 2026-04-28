import React, { useEffect, useState, useMemo } from 'react';
import { Zap, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

// --- REUSABLE COMPONENT FOR EXACT SVG PATHS ---
// Paste your exact SVG path data into the 'd' prop below
const ExactVectorIcon = ({ pathData, color }: { pathData: string; color: string }) => (
  <svg width="140" height="100" viewBox="0 0 200 150" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {/* This path will be your exact image trace */}
    <motion.path 
      d={pathData} 
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    />
    {/* Optional: Add a spinning propeller group if your path doesn't include it animated */}
    <motion.g 
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
      style={{ originX: 0.9, originY: 0.5 }} // Adjust based on where the nose is
    >
      <path d="M180 75 L195 75 M180 75 L190 65 M180 75 L190 85" strokeWidth="2" opacity="0.6" />
    </motion.g>
  </svg>
);

// --- PASTE YOUR EXACT PATH DATA HERE ---
// TODO: Replace the string below with the 'd' attribute from your traced SVG
const AIRPLANE_PATH = "M 40 80 C 40 80 50 40 90 40 L 160 40 C 180 40 190 50 190 60 C 190 70 180 80 160 80 L 90 80 C 50 80 40 80 40 80 Z M 70 40 L 70 20 L 90 40 M 120 80 L 120 100 L 140 80"; 
// ^^^ THIS IS A PLACEHOLDER. SEE INSTRUCTIONS BELOW TO GET THE REAL ONE.

const AnimatedPlane = ({ color }: { color: string }) => (
  <ExactVectorIcon pathData={AIRPLANE_PATH} color={color} />
);

// Placeholders for others
const AnimatedBike = ({ color }: { color: string }) => <ExactVectorIcon pathData={AIRPLANE_PATH} color={color} />;
const AnimatedCar = ({ color }: { color: string }) => <ExactVectorIcon pathData={AIRPLANE_PATH} color={color} />;
const AnimatedBus = ({ color }: { color: string }) => <ExactVectorIcon pathData={AIRPLANE_PATH} color={color} />;
const AnimatedTrain = ({ color }: { color: string }) => <ExactVectorIcon pathData={AIRPLANE_PATH} color={color} />;

// --- Main Component ---
export default function VehicleLoader({ message }: VehicleLoaderProps) {
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const statusMessages = useMemo(() => [
    "Warming up engine...",
    "Calibrating GPS satellites...",
    "Syncing weather data...",
    "Optimizing route geometry...",
    "Checking traffic conditions...",
    "Finalizing itinerary...",
  ], []);

  const vehicles = [
    { Icon: AnimatedBike, color: '#3B82F6', name: 'Bike', shadow: 'shadow-blue-500/50' },
    { Icon: AnimatedCar, color: '#EF4444', name: 'Car', shadow: 'shadow-red-500/50' },
    { Icon: AnimatedBus, color: '#EAB308', name: 'Bus', shadow: 'shadow-yellow-500/50' },
    { Icon: AnimatedTrain, color: '#10B981', name: 'Train', shadow: 'shadow-emerald-500/50' },
    { Icon: AnimatedPlane, color: '#8B5CF6', name: 'Flight', shadow: 'shadow-violet-500/50' }
  ];

  const currentVehicle = vehicles[vehicleIndex];

  useEffect(() => {
    const vehicleInterval = setInterval(() => {
      setVehicleIndex((prev) => (prev + 1) % vehicles.length);
    }, 1800);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        const increment = prev > 85 ? 0.2 : prev > 50 ? 1.5 : 3;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    const statusInterval = setInterval(() => {
      if (!message) {
        setStatusText((prev) => {
          const currentIndex = statusMessages.indexOf(prev);
          return statusMessages[(currentIndex + 1) % statusMessages.length];
        });
      }
    }, 2000);

    if (!message) setStatusText(statusMessages[0]);

    return () => {
      clearInterval(vehicleInterval);
      clearInterval(progressInterval);
      clearInterval(statusInterval);
    };
  }, [message, statusMessages, vehicles.length]);
  const displayMessage = message || statusText;
  const isFinished = progress >= 100;

  const idleVibration = { y: [0, -1, 0] };
  const revVibration = { y: [0, -2, 0, -1, 0] };

  const gridPatternUrl = `url("image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2 1h1v1H3V4z' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E")`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      <motion.div
        animate={{ background: `radial-gradient(circle at 50% 40%, ${currentVehicle.color}20 0%, transparent 70%)` }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
      />
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        <div className="relative mb-10">
          <motion.div
            animate={{ scale: isFinished ? [1, 1.5, 2] : [1, 1.1, 1], opacity: isFinished ? [0.5, 0] : [0.3, 0.6, 0.3] }}
            transition={{ duration: isFinished ? 0.5 : 2, repeat: isFinished ? 0 : Infinity }}
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ backgroundColor: currentVehicle.color }}
          />
          <motion.div
            key={vehicleIndex}
            initial={{ y: 50, opacity: 0, rotateX: -90 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: -50, opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`relative w-56 h-56 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl ${currentVehicle.shadow}`}
            style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`, boxShadow: `0 20px 40px -10px ${currentVehicle.color}60` }}
          >
            <motion.div
              animate={isFinished ? revVibration : idleVibration}
              transition={{ repeat: Infinity, duration: isFinished ? 0.1 : 2, ease: "easeInOut" }}
              className="flex items-center justify-center w-full h-full"
            >
              <currentVehicle.Icon color={currentVehicle.color} />
            </motion.div>
            <div className="absolute -top-2 -right-2 bg-slate-900 border border-white/20 rounded-full p-1.5 shadow-lg">
              {vehicleIndex === 4 ? <Zap size={16} className="text-yellow-400" /> : <Wind size={16} className="text-slate-400" />}
            </div>
          </motion.div>
        </div>
        <div className="text-center space-y-3 h-24 flex flex-col justify-center">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
            Nam Payanam
          </motion.h1>
          <AnimatePresence mode="wait">            <motion.p key={displayMessage} initial={{ opacity: 0, y: 5, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -5, filter: "blur(4px)" }} transition={{ duration: 0.3 }} className="text-slate-400 font-medium text-sm flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentVehicle.color }} />
              {displayMessage}
              {!message && <span className="animate-pulse">_</span>}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="w-full mt-8 relative group">
          <div className="flex justify-between text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">
            <span>System Status</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
            <motion.div className="h-full relative" style={{ backgroundColor: currentVehicle.color }} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ ease: "circOut" }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-shimmer" />
            </motion.div>
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: gridPatternUrl }} />
          </div>
        </div>
      </div>
      <style>{` @keyframes shimmer { 100% { transform: translateX(100%); } } .animate-shimmer { animation: shimmer 1.5s infinite; } `}</style>
    </div>
  );
}