import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

export default function VehicleLoader({ message }: VehicleLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    "Initializing Systems...",
    "Calibrating GPS Satellites...",
    "Syncing Weather Data...",
    "Optimizing Route Geometry...",
    "Finalizing Itinerary..."
  ];

  useEffect(() => {
    // Smooth Progress Logic
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        // Non-linear progression for realism (slower at start/end)
        const increment = prev > 90 ? 0.1 : prev > 70 ? 0.5 : 1.2;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    // Status Text Cycling
    const textTimer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(textTimer);
    };
  }, []);

  const currentStatus = message || statuses[statusIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19] text-white overflow-hidden font-sans">
      
      {/* 1. Ambient Background Grid & Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
      
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" 
      />

      {/* 2. Main Content Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6">
        
        {/* The Airplane Icon - Enhanced with Layers */}
        <div className="relative mb-12 scale-110 md:scale-125">
          
          {/* Engine Glow Pulse */}
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 0.2, repeat: Infinity }}
            className="absolute top-1/2 left-8 -translate-y-1/2 w-12 h-12 bg-blue-400/30 blur-xl rounded-full"
          />

          <svg width="240" height="160" viewBox="0 0 200 120" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            
            {/* Group for the whole plane to apply engine vibration */}
            <motion.g
              animate={{ 
                x: [0, -0.5, 0.5, -0.5, 0], 
                y: [0, 0.5, -0.5, 0.5, 0] 
              }}
              transition={{ duration: 0.1, repeat: Infinity, ease: "linear" }}
            >
              {/* Main Fuselage - Draw Animation */}
              <motion.path
                d="M 35 62 L 55 42 L 145 42 Q 165 42 175 52 Q 185 62 175 72 Q 165 82 145 82 L 55 82 L 35 62 Z"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
                className="stroke-blue-400"
              />

              {/* Cockpit Window */}
              <motion.path
                d="M 60 46 L 80 46 L 75 56 L 60 56 Z"
                fill="rgba(96, 165, 250, 0.1)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                className="stroke-blue-300"
              />

              {/* Tail Fin */}
              <motion.path
                d="M 35 62 L 25 48 L 45 52"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              />

              {/* Wing */}
              <motion.path
                d="M 95 42 L 95 28 L 115 42"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
              />

              {/* Wheels - Pop in animation */}
              <motion.circle cx="65" cy="92" r="3.5" fill="#0B0F19" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: "spring", stiffness: 500 }} />
              <motion.circle cx="135" cy="92" r="3.5" fill="#0B0F19" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: "spring", stiffness: 500 }} />
              
              {/* Wheel Struts */}
              <motion.path d="M 65 82 L 65 88" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.1 }} />
              <motion.path d="M 135 82 L 135 88" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.1 }} />

              {/* Speed Lines */}
              <motion.g strokeOpacity="0.4">
                <motion.path d="M 15 52 L 28 52" initial={{ pathLength: 0, x: -10 }} animate={{ pathLength: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5 }} />
                <motion.path d="M 10 72 L 23 72" initial={{ pathLength: 0, x: -10 }} animate={{ pathLength: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }} />
              </motion.g>

              {/* Exhaust Clouds */}
              <motion.g strokeOpacity="0.5">
                <motion.path d="M 185 38 Q 190 33 195 38" fill="none" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 1, duration: 0.8 }} />
                <motion.path d="M 190 55 Q 195 50 200 55" fill="none" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }} />
                
                {/* Animated Particle Puffs */}
                <motion.circle cx="190" cy="45" r="2" fill="#60A5FA" initial={{ opacity: 0, x: 0 }} animate={{ opacity: [0, 0.6, 0], x: [0, 10] }} transition={{ delay: 1.5, duration: 1, repeat: Infinity, repeatDelay: 0.5 }} />
                <motion.circle cx="195" cy="60" r="1.5" fill="#60A5FA" initial={{ opacity: 0, x: 0 }} animate={{ opacity: [0, 0.6, 0], x: [0, 15] }} transition={{ delay: 1.8, duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }} />
              </motion.g>

              {/* Spinning Propeller - High Speed Blur */}
              <g style={{ transformOrigin: '35px 62px' }}>
                <motion.path
                  d="M 20 62 L 50 62 M 20 62 L 45 45 M 20 62 L 45 76"
                  stroke="#93C5FD"
                  strokeWidth="1.5"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.08, ease: "linear" }}
                />
                {/* Propeller Hub */}
                <circle cx="35" cy="62" r="2" fill="#DBEAFE" />
              </g>
            </motion.g>
          </svg>
        </div>

        {/* 3. Glassmorphism Text Panel */}
        <div className="w-full backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-blue-200">
            Nam Payanam
          </h1>
          
          <div className="flex items-center justify-center gap-2 h-8 mb-6">
            <motion.span 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"
            />
            <AnimatePresence mode="wait">
              <motion.p
                key={currentStatus}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="text-blue-200/80 text-sm font-medium tracking-wide"
              >
                {currentStatus}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Advanced Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-blue-300/50 uppercase tracking-widest">
              <span>System Status</span>
              <span className="text-white font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
              {/* Glow Track */}
              <div className="absolute inset-0 bg-blue-500/10 blur-sm" />
              
              <motion.div
                className="h-full relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "circOut" }}
              >
                {/* Gradient Fill */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />
                
                {/* Shimmer Effect */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
