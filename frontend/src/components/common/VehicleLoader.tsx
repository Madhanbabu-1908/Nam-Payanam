import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

export default function VehicleLoader({ message }: VehicleLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    "Warming up engine...",
    "Calibrating GPS...",
    "Syncing Weather...",
    "Optimizing Route...",
    "Final Check..."
  ];

  useEffect(() => {
    // Progress Logic
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + (prev > 85 ? 0.2 : prev > 50 ? 1 : 2);
      });
    }, 50);

    // Text Cycling Logic
    const textTimer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(textTimer);
    };
  }, []);

  const currentStatus = message || statuses[statusIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] text-white overflow-hidden">
      
      {/* 1. Background Glow */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" 
      />

      {/* 2. The Icon Container */}
      <div className="relative z-10 mb-10 scale-125">
        
        {/* Main SVG Group with Hover & Vibration Animations */}
        <motion.svg 
          width="220" 
          height="140" 
          viewBox="0 0 200 120" 
          fill="none" 
          stroke="#3b82f6" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          // Gentle Hover Animation
          animate={{ y: [0, -5, 0] }}
          transition={{ y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
        >
          
          {/* Inner Group for Engine Vibration */}
          <motion.g
            animate={{ 
              x: [0, -0.5, 0.5, -0.5, 0], 
              y: [0, 0.5, -0.5, 0.5, 0] 
            }}
            transition={{ 
              x: { duration: 0.1, repeat: Infinity, ease: "linear" },
              y: { duration: 0.1, repeat: Infinity, ease: "linear" }
            }}
          >
            {/* Main Fuselage - Draw Animation */}
            <motion.path
              d="M 35 62 L 55 42 L 145 42 Q 165 42 175 52 Q 185 62 175 72 Q 165 82 145 82 L 55 82 L 35 62 Z"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />

            {/* Cockpit Window */}
            <motion.path
              d="M 60 46 L 80 46 L 75 56 L 60 56 Z"
              fill="rgba(59, 130, 246, 0.1)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            />

            {/* Tail Fin */}
            <motion.path
              d="M 35 62 L 25 48 L 45 52"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            />

            {/* Wing */}
            <motion.path
              d="M 95 42 L 95 28 L 115 42"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            />

            {/* Wheels */}
            <motion.circle cx="65" cy="92" r="3.5" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }} />
            <motion.circle cx="135" cy="92" r="3.5" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: "spring" }} />

            {/* Speed Lines (Animated to move left) */}
            <motion.g>
              <motion.path 
                d="M 15 52 L 28 52" 
                strokeOpacity="0.6" 
                initial={{ pathLength: 0, x: 10 }} 
                animate={{ pathLength: 1, x: -20 }} 
                transition={{ delay: 0.1, duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }} 
              />
              <motion.path 
                d="M 10 72 L 23 72" 
                strokeOpacity="0.6" 
                initial={{ pathLength: 0, x: 10 }} 
                animate={{ pathLength: 1, x: -20 }} 
                transition={{ delay: 0.2, duration: 0.5, repeat: Infinity, repeatDelay: 0.6 }} 
              />
              <motion.path 
                d="M 20 42 L 30 42" 
                strokeOpacity="0.4" 
                initial={{ pathLength: 0, x: 10 }} 
                animate={{ pathLength: 1, x: -20 }} 
                transition={{ delay: 0.3, duration: 0.5, repeat: Infinity, repeatDelay: 0.7 }} 
              />
            </motion.g>

            {/* Clouds/Exhaust (Animated Puffs) */}
            <motion.g>
              <motion.path 
                d="M 185 38 Q 190 33 195 38" 
                fill="none" 
                strokeOpacity="0.6" 
                initial={{ pathLength: 0, opacity: 0 }} 
                animate={{ pathLength: 1, opacity: [0.6, 0.2], x: [0, 10] }} 
                transition={{ delay: 0.5, duration: 1, repeat: Infinity, repeatDelay: 0.5 }} 
              />
              <motion.path 
                d="M 190 55 Q 195 50 200 55" 
                fill="none" 
                strokeOpacity="0.6" 
                initial={{ pathLength: 0, opacity: 0 }} 
                animate={{ pathLength: 1, opacity: [0.6, 0.2], x: [0, 15] }} 
                transition={{ delay: 0.8, duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }} 
              />
            </motion.g>

            {/* Spinning Propeller (High Speed) */}
            <g style={{ transformOrigin: '35px 62px' }}>
              <motion.path
                d="M 25 62 L 45 62 M 25 62 L 40 48 M 25 62 L 40 76"
                strokeOpacity="0.8"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.1, ease: "linear" }}
              />
            </g>
          </motion.g>
        </motion.svg>
      </div>

      {/* 3. Text & Title */}
      <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Nam Payanam</h1>
      
      <div className="flex items-center gap-2 text-blue-400 text-sm mb-8 h-6">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <AnimatePresence mode="wait">
          <motion.span
            key={currentStatus}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {currentStatus}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* 4. Progress Bar */}
      <div className="w-64 space-y-2">
        <div className="flex justify-between text-xs text-slate-500 font-mono uppercase">
          <span>Status</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "circOut" }}
          />
        </div>
      </div>
    </div>
  );
}
