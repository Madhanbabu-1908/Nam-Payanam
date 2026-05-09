import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpriteLoader from './SpriteLoader';

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

    // Status Text Cycling
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
    // Full Screen Container
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] text-white overflow-hidden w-full h-full">
      
      {/* 1. Background Glow */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" 
      />

      {/* 2. Main Content Wrapper - Centers everything vertically and horizontally */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full px-4 py-8">
        
        {/* Icon Container - Full Width */}
        <div className="relative w-full max-w-4xl mb-12">
          
          {/* Main SVG Group with Hover Animation */}
          <motion.div 
            className="relative w-full aspect-video"
            // Gentle Hover Animation
            animate={{ y: [0, -5, 0] }}
            transition={{ y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
          >
            
            {/* Inner Group for Engine Vibration */}
            <motion.div
              className="w-full h-full"
              animate={{ 
                x: [0, -0.5, 0.5, -0.5, 0], 
                y: [0, 0.5, -0.5, 0.5, 0] 
              }}
              transition={{ 
                x: { duration: 0.1, repeat: Infinity, ease: "linear" },
                y: { duration: 0.1, repeat: Infinity, ease: "linear" }
              }}
            >
              {/* Use the Sprite Loader here */}
              <SpriteLoader fps={12} color="#3b82f6" />
              
            </motion.div>
          </motion.div>
        </div>

        {/* 3. Text & Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-lg">
            Nam Payanam
          </h1>
          
          <div className="flex items-center justify-center gap-2 h-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <AnimatePresence mode="wait">
              <motion.span
                key={currentStatus}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-blue-400 text-sm md:text-base font-medium tracking-wide"
              >
                {currentStatus}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* 4. Progress Bar */}
        <div className="w-full max-w-xs mt-8 space-y-2">
          <div className="flex justify-between text-xs text-slate-500 font-mono uppercase tracking-wider">
            <span>Status</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <motion.div
              className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "circOut" }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
