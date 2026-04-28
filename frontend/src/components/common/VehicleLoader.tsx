import React, { useEffect, useState, useMemo } from 'react';
import { Zap, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

// --- Custom Animated Vehicle Components ---

const AnimatedBike = ({ color }: { color: string }) => (
  <svg width="80" height="60" viewBox="0 0 100 80" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M25 40 L45 40 L65 15 L85 40 L25 40" />
    <path d="M45 40 L35 65" />
    <path d="M65 15 L55 25" />
    <path d="M20 35 L30 35" strokeWidth="4" />
    <path d="M75 20 L80 15" />
    <g className="origin-center animate-[spin_3s_linear_infinite]" style={{ transformOrigin: '25px 65px' }}>
      <circle cx="25" cy="65" r="12" strokeWidth="2.5" />
      <path d="M25 53 L25 77 M13 65 L37 65" strokeWidth="1.5" opacity="0.5" />
    </g>
    <g className="origin-center animate-[spin_3s_linear_infinite]" style={{ transformOrigin: '85px 65px' }}>
      <circle cx="85" cy="65" r="12" strokeWidth="2.5" />
      <path d="M85 53 L85 77 M73 65 L97 65" strokeWidth="1.5" opacity="0.5" />
    </g>
  </svg>
);

const AnimatedCar = ({ color }: { color: string }) => (
  <svg width="90" height="50" viewBox="0 0 100 60" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 35 Q10 25 20 25 L35 25 L45 15 L75 15 L85 25 L90 25 Q95 25 95 35 L95 45 L10 45 Z" />
    <path d="M38 25 L48 18 L72 18 L82 25" strokeWidth="2" opacity="0.6" />
    <g className="origin-center animate-[spin_2s_linear_infinite]" style={{ transformOrigin: '25px 45px' }}>
      <circle cx="25" cy="45" r="10" strokeWidth="2.5" />
      <circle cx="25" cy="45" r="4" strokeWidth="1.5" opacity="0.5" />
    </g>
    <g className="origin-center animate-[spin_2s_linear_infinite]" style={{ transformOrigin: '75px 45px' }}>
      <circle cx="75" cy="45" r="10" strokeWidth="2.5" />
      <circle cx="75" cy="45" r="4" strokeWidth="1.5" opacity="0.5" />
    </g>
  </svg>
);

const AnimatedBus = ({ color }: { color: string }) => (
  <svg width="90" height="60" viewBox="0 0 100 70" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="10" y="15" width="80" height="45" rx="8" />
    <path d="M20 25 H80" strokeWidth="2" opacity="0.6" />
    <path d="M50 25 V60" strokeWidth="2" opacity="0.6" />
    <path d="M15 35 V55" strokeWidth="2" opacity="0.6" />
    <g className="origin-center animate-[spin_2.5s_linear_infinite]" style={{ transformOrigin: '25px 60px' }}>      <circle cx="25" cy="60" r="8" strokeWidth="2.5" />
    </g>
    <g className="origin-center animate-[spin_2.5s_linear_infinite]" style={{ transformOrigin: '75px 60px' }}>
      <circle cx="75" cy="60" r="8" strokeWidth="2.5" />
    </g>
  </svg>
);

const AnimatedTrain = ({ color }: { color: string }) => (
  <svg width="90" height="50" viewBox="0 0 100 60" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 45 L15 20 Q15 10 25 10 L75 10 Q85 10 85 20 L85 45" />
    <path d="M10 45 H90" strokeWidth="4" />
    <rect x="30" y="20" width="40" height="15" rx="2" strokeWidth="2" opacity="0.6" />
    <path d="M5 35 H10" strokeWidth="2" />
    <g className="origin-center animate-[spin_1.5s_linear_infinite]" style={{ transformOrigin: '30px 45px' }}>
      <circle cx="30" cy="45" r="6" strokeWidth="2.5" />
      <path d="M30 39 L30 51 M24 45 L36 45" strokeWidth="1" />
    </g>
    <g className="origin-center animate-[spin_1.5s_linear_infinite]" style={{ transformOrigin: '70px 45px' }}>
      <circle cx="70" cy="45" r="6" strokeWidth="2.5" />
      <path d="M70 39 L70 51 M64 45 L76 45" strokeWidth="1" />
    </g>
  </svg>
);

const AnimatedPlane = ({ color }: { color: string }) => (
  <svg width="90" height="60" viewBox="0 0 100 70" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 35 Q30 10 60 10 Q85 10 90 35 Q85 60 60 60 Q30 60 10 35 Z" />
    <path d="M45 35 L45 15 Q60 15 65 35" fill="rgba(255,255,255,0.1)" />
    <path d="M20 35 L15 20 L30 25" />
    <g className="origin-center animate-[spin_0.5s_linear_infinite]" style={{ transformOrigin: '88px 35px' }}>
      <path d="M85 35 H95" strokeWidth="2" opacity="0.8" />
      <path d="M85 35 H95" strokeWidth="2" opacity="0.8" transform="rotate(60 88 35)" />
      <path d="M85 35 H95" strokeWidth="2" opacity="0.8" transform="rotate(120 88 35)" />
    </g>
    <path d="M5 25 H2" strokeWidth="2" opacity="0.5" className="animate-pulse" />
    <path d="M5 45 H2" strokeWidth="2" opacity="0.5" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
  </svg>
);

// --- Main Component ---

export default function VehicleLoader({ message }: VehicleLoaderProps) {
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const statusMessages = useMemo(() => [
    "Warming up engine...",
    "Calibrating GPS satellites...",    "Syncing weather data...",
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

  // Define the grid pattern URL safely outside JSX to avoid parsing errors
  const gridPatternUrl = `url("data:image/svg+xml,%3Csvg width='4' height='4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2 1h1v1H3V4z' fill='%23fff' fill-opacity='0.1'/%3E%3C/svg%3E")`;

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

      {/* Speed Lines */}
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
            animate={{              scale: isFinished ? [1, 1.5, 2] : [1, 1.1, 1],
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
            className={`relative w-40 h-40 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl ${currentVehicle.shadow}`}
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
            <motion.p              key={displayMessage}
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
            
            {/* Fixed: Using style prop for background image to avoid Tailwind parsing error */}
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
        .animate-shimmer {          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}