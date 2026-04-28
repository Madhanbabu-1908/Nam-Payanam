import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

export default function VehicleLoader({ message }: VehicleLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');

  const statusMessages = [
    "Warming up engine...",
    "Calibrating systems...",
    "Checking weather...",
    "Optimizing route...",
    "Finalizing plan...",
  ];

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + (prev > 85 ? 0.3 : prev > 50 ? 1 : 2);
      });
    }, 50);

    // Status text cycling
    const statusInterval = setInterval(() => {
      setStatusText((prev) => {
        const currentIndex = statusMessages.indexOf(prev);
        return statusMessages[(currentIndex + 1) % statusMessages.length];
      });
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(statusInterval);
    };
  }, []);

  const displayMessage = message || statusText;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-purple-900/10" />
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center px-6">
        
        {/* Airplane Icon Container */}
        <div className="relative mb-12">
          {/* Glow effect behind icon */}
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
          
          {/* The Airplane Icon - Exact Recreation */}
          <svg width="200" height="120" viewBox="0 0 200 120" className="relative z-10">
            {/* Main Body Path */}
            <motion.path
              d="M 40 60 L 60 40 L 150 40 Q 170 40 180 50 Q 190 60 180 70 Q 170 80 150 80 L 60 80 L 40 60 Z"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            
            {/* Cockpit Window */}
            <motion.path
              d="M 65 45 L 85 45 L 80 55 L 65 55 Z"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
            
            {/* Tail Fin */}
            <motion.path
              d="M 40 60 L 30 45 L 50 50"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            />
            
            {/* Wings */}
            <motion.path
              d="M 90 40 L 90 25 L 110 40"
              fill="none"
              stroke="#3B82F6"              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            />
            
            {/* Landing Gear Wheels */}
            <motion.circle
              cx="70"
              cy="90"
              r="4"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, duration: 0.3 }}
            />
            <motion.circle
              cx="140"
              cy="90"
              r="4"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, duration: 0.3 }}
            />
            
            {/* Speed Lines (Left) */}
            <motion.path
              d="M 15 50 L 30 50 M 10 70 L 25 70"
              stroke="#3B82F6"
              strokeWidth="1.5"
              opacity="0.6"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            />
            
            {/* Clouds/Exhaust (Right) */}
            <motion.path
              d="M 185 35 Q 190 30 195 35 M 190 50 Q 195 45 200 50"
              stroke="#3B82F6"
              strokeWidth="1.5"
              opacity="0.6"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}              transition={{ delay: 0.8, duration: 0.5 }}
            />
            
            {/* Spinning Propeller */}
            <g style={{ transformOrigin: '40px 60px' }}>
              <motion.path
                d="M 30 60 L 50 60 M 30 60 L 45 45 M 30 60 L 45 75"
                stroke="#3B82F6"
                strokeWidth="1.5"
                opacity="0.8"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.3, ease: "linear" }}
              />
            </g>
          </svg>
        </div>

        {/* Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-4xl font-bold text-white mb-2 tracking-tight"
        >
          Nam Payanam
        </motion.h1>

        {/* Status Message */}
        <motion.div 
          key={displayMessage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-blue-400 text-sm mb-8"
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>{displayMessage}</span>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-slate-500 mb-2 uppercase tracking-wider">
            <span>System Status</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}              transition={{ ease: "easeOut" }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}