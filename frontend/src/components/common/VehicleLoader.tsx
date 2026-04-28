import React, { useEffect, useState, useMemo } from 'react';
import { Bike, Car, Bus, Train, Plane, MapPin, Zap, Wind, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

export default function VehicleLoader({ message }: VehicleLoaderProps) {
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  // Dynamic status messages for the "No custom message" state
  const statusMessages = useMemo(() => [
    "Warming up engine...",
    "Calibrating GPS satellites...",
    "Syncing weather data...",
    "Optimizing route geometry...",
    "Checking traffic conditions...",
    "Finalizing itinerary...",
  ], []);

  const vehicles = [
    { Icon: Bike, color: '#3B82F6', name: 'Bike', gradient: 'from-blue-500/20 to-cyan-500/20', shadow: 'shadow-blue-500/50' },
    { Icon: Car, color: '#EF4444', name: 'Car', gradient: 'from-red-500/20 to-orange-500/20', shadow: 'shadow-red-500/50' },
    { Icon: Bus, color: '#EAB308', name: 'Bus', gradient: 'from-yellow-500/20 to-amber-500/20', shadow: 'shadow-yellow-500/50' },
    { Icon: Train, color: '#10B981', name: 'Train', gradient: 'from-emerald-500/20 to-green-500/20', shadow: 'shadow-emerald-500/50' },
    { Icon: Plane, color: '#8B5CF6', name: 'Flight', gradient: 'from-violet-500/20 to-purple-500/20', shadow: 'shadow-violet-500/50' }
  ];

  const currentVehicle = vehicles[vehicleIndex];

  useEffect(() => {
    // 1. Vehicle Cycling Logic
    const vehicleInterval = setInterval(() => {
      setVehicleIndex((prev) => (prev + 1) % vehicles.length);
    }, 1800);

    // 2. Progress Simulation (Non-linear for realism)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        // Slow down near 90% to simulate "finalizing"
        const increment = prev > 85 ? 0.2 : prev > 50 ? 1.5 : 3;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    // 3. Status Text Cycling (Only if no custom message)    const statusInterval = setInterval(() => {
      if (!message) {
        setStatusText((prev) => {
          const currentIndex = statusMessages.indexOf(prev);
          return statusMessages[(currentIndex + 1) % statusMessages.length];
        });
      }
    }, 2000);

    // Set initial status
    if (!message) setStatusText(statusMessages[0]);

    return () => {
      clearInterval(vehicleInterval);
      clearInterval(progressInterval);
      clearInterval(statusInterval);
    };
  }, [message, statusMessages]);

  // Determine display text
  const displayMessage = message || statusText;
  const isFinished = progress >= 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      
      {/* --- Background Effects --- */}
      
      {/* Dynamic Radial Glow following vehicle color */}
      <motion.div
        animate={{
          background: `radial-gradient(circle at 50% 40%, ${currentVehicle.color}20 0%, transparent 70%)`,
        }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Animated Speed Lines (Background) */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-[1px] bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: '-20%',
              width: `${Math.random() * 200 + 50}px`,
            }}
            animate={{
              x: ['0vw', '100vw'],              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 1 + 0.5,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* --- Main Content --- */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        
        {/* Vehicle Card Container */}
        <div className="relative mb-10">
          {/* Pulsing Glow Ring */}
          <motion.div
            animate={{
              scale: isFinished ? [1, 1.5, 2] : [1, 1.1, 1],
              opacity: isFinished ? [0.5, 0] : [0.3, 0.6, 0.3],
            }}
            transition={{ 
              duration: isFinished ? 0.5 : 2, 
              repeat: isFinished ? 0 : Infinity 
            }}
            className={`absolute inset-0 rounded-full blur-2xl bg-${currentVehicle.color}`}
            style={{ backgroundColor: currentVehicle.color }}
          />

          {/* The Vehicle Icon Box */}
          <motion.div
            key={vehicleIndex}
            initial={{ y: 50, opacity: 0, rotateX: -90 }}
            animate={{ 
              y: 0, 
              opacity: 1, 
              rotateX: 0,
              // Engine Idle Vibration
              y: isFinished ? [0, -2, 0, -1, 0] : [0, -1, 0],
            }}
            exit={{ y: -50, opacity: 0, scale: 0.5 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              y: isFinished ? { repeat: Infinity, duration: 0.1 } : { repeat: Infinity, duration: 2 }
            }}
            className={`relative w-32 h-32 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl ${currentVehicle.shadow}`}            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,
              boxShadow: `0 20px 40px -10px ${currentVehicle.color}60`
            }}
          >
            <currentVehicle.Icon 
              size={64} 
              strokeWidth={1.5}
              style={{ color: currentVehicle.color }}
              className="drop-shadow-lg"
            />

            {/* Decorative Badge */}
            <div className="absolute -top-2 -right-2 bg-slate-900 border border-white/20 rounded-full p-1.5 shadow-lg">
              {vehicleIndex === 4 ? <Zap size={16} className="text-yellow-400" /> : <Wind size={16} className="text-slate-400" />}
            </div>
          </motion.div>
        </div>

        {/* Text Area */}
        <div className="text-center space-y-3 h-24 flex flex-col justify-center">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight"
          >
            Nam Payanam
          </motion.h1>

          <AnimatePresence mode="wait">
            <motion.p
              key={displayMessage}
              initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
              transition={{ duration: 0.3 }}
              className="text-slate-400 font-medium text-sm flex items-center justify-center gap-2"
            >
              <span 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: currentVehicle.color }}
              />
              {displayMessage}
              {!message && <span className="animate-pulse">_</span>}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Advanced Progress Bar */}
        <div className="w-full mt-8 relative group">          <div className="flex justify-between text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">
            <span>System Status</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
            {/* Fill Bar */}
            <motion.div
              className="h-full relative"
              style={{ backgroundColor: currentVehicle.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "circOut" }}
            >
              {/* Shimmer Effect on Bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-[shimmer_1.5s_infinite]" />
            </motion.div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xIDNoMXYxSDFWM3ptMiAxaDF2MUgzVjR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')] opacity-30" />
          </div>
        </div>

      </div>

      {/* Global Styles for Custom Animations */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}