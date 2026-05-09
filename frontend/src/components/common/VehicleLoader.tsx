import React, { useEffect, useState, useMemo } from 'react';
import { Zap, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

// --- EXACT DESIGN FROM YOUR REFERENCE IMAGE ---

const AnimatedPlane = ({ color }: { color: string }) => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Airplane Body - Exact Shape from Reference */}
    <path d="M20 40 L40 40 L50 30 L90 30 Q100 30 100 40 Q100 50 90 50 L50 50 L40 40 Z" />
    
    {/* Tail Fin */}
    <path d="M30 40 L25 30 L35 35 Z" fill="none" />
    
    {/* Wing */}
    <path d="M55 40 L55 25 Q65 25 70 40" fill="none" />
    
    {/* Landing Gear */}
    <circle cx="45" cy="55" r="3" fill="none" />
    <circle cx="85" cy="55" r="3" fill="none" />
    
    {/* Speed Lines (Left Side) */}
    <path d="M5 35 L15 35" strokeWidth="1.5" opacity="0.6" />
    <path d="M10 45 L20 45" strokeWidth="1.5" opacity="0.6" />
    
    {/* Clouds (Right Side) */}
    <path d="M105 25 Q108 22 112 25 Q115 22 118 25" strokeWidth="1.5" fill="none" opacity="0.6" />
    <path d="M108 30 Q110 28 113 30" strokeWidth="1.5" fill="none" opacity="0.6" />
    
    {/* Propeller Spin Effect */}
    <g className="origin-center animate-[spin_0.3s_linear_infinite]" style={{ transformOrigin: '98px 40px' }}>
      <path d="M95 40 L105 40" strokeWidth="1.5" opacity="0.8" />
      <path d="M95 40 L105 40" strokeWidth="1.5" opacity="0.8" transform="rotate(45 98 40)" />
      <path d="M95 40 L105 40" strokeWidth="1.5" opacity="0.8" transform="rotate(90 98 40)" />
    </g>
  </svg>
);

// Simple placeholders for other vehicles (you can customize these later)
const AnimatedBike = ({ color }: { color: string }) => <AnimatedPlane color={color} />;
const AnimatedCar = ({ color }: { color: string }) => <AnimatedPlane color={color} />;
const AnimatedBus = ({ color }: { color: string }) => <AnimatedPlane color={color} />;
const AnimatedTrain = ({ color }: { color: string }) => <AnimatedPlane color={color} />;

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
      
      {/* Background Effects */}
      <motion.div
        animate={{
          background: `radial-gradient(circle at 50% 40%, ${currentVehicle.color}20 0%, transparent 70%)`,
        }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Speed Lines Background */}
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
              x: ['0vw', '100vw'],
              opacity: [0, 1, 0],
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

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        
        {/* Vehicle Card */}
        <div className="relative mb-10">
          <motion.div
            animate={{
              scale: isFinished ? [1, 1.5, 2] : [1, 1.1, 1],
              opacity: isFinished ? [0.5, 0] : [0.3, 0.6, 0.3],
            }}
            transition={{ 
              duration: isFinished ? 0.5 : 2, 
              repeat: isFinished ? 0 : Infinity 
            }}
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ backgroundColor: currentVehicle.color }}
          />

          <motion.div
            key={vehicleIndex}
            initial={{ y: 50, opacity: 0, rotateX: -90 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: -50, opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`relative w-48 h-48 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl ${currentVehicle.shadow}`}
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`,
              boxShadow: `0 20px 40px -10px ${currentVehicle.color}60`
            }}
          >
            {/* Inner Vibration Animation */}
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

        {/* Progress Bar */}
        <div className="w-full mt-8 relative group">
          <div className="flex justify-between text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">
            <span>System Status</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
            <motion.div
              className="h-full relative"
              style={{ backgroundColor: currentVehicle.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "circOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-shimmer" />
            </motion.div>
            
            <div 
              className="absolute inset-0 opacity-30"
              style={{ backgroundImage: gridPatternUrl }}
            />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
