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
      
      {/* 1. Background Glow (Behind everything) */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none" 
      />

      {/* 2. The Animation Layer (Full Screen) */}
      <div className="absolute inset-0 z-0">
        <SpriteLoader fps={12} color="#3b82f6" />
      </div>

      {/* 3. UI Overlay (Text & Progress) - Centered on Top */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full px-4 py-8 pointer-events-none">
        
        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] mb-4">
          Nam Payanam
        </h1>
        
        {/* Status Text */}
        <div className="flex items-center gap-2 h-8 mb-8">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]" />
          <AnimatePresence mode="wait">
            <motion.span
              key={currentStatus}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="text-blue-300 text-lg md:text-xl font-medium tracking-wide drop-shadow-md"
            >
              {currentStatus}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-mono uppercase tracking-wider">
            <span>Status</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800/50 backdrop-blur-sm rounded-full overflow-hidden border border-slate-700/50">
            <motion.div
              className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
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
