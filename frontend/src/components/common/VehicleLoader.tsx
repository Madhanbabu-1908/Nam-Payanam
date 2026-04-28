import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface VehicleLoaderProps {
  /** Custom message (overrides step messages) */
  message?: string;
  /** Current loading stage: 0 = route, 1 = traffic, 2 = arrival */
  step?: number;
  /** Optional progress percentage (0-100) */
  progress?: number;
  /** Callback when loading completes (after step 2 finishes) */
  onComplete?: () => void;
}

export default function VehicleLoader({ 
  message, 
  step = 0, 
  progress: externalProgress, 
  onComplete 
}: VehicleLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(0);
  const progressValue = externalProgress ?? internalProgress;
  const [currentStep, setCurrentStep] = useState(step);
  
  // Step messages
  const stepMessages = [
    { title: "Finding optimal route", subtitle: "Analyzing traffic & road conditions" },
    { title: "Checking live traffic", subtitle: "Estimating arrival time" },
    { title: "Almost there", subtitle: "Preparing your itinerary" },
  ];
  
  const activeMessage = message 
    ? { title: message, subtitle: "" } 
    : stepMessages[currentStep];

  // Auto-advance steps if no external step control
  useEffect(() => {
    if (externalProgress !== undefined) return;
    
    const intervals = [3000, 4000, 2000]; // duration per step
    let timeout: NodeJS.Timeout;
    
    if (currentStep < 2) {
      timeout = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, intervals[currentStep]);
    } else if (currentStep === 2 && onComplete) {
      timeout = setTimeout(() => onComplete(), intervals[2]);
    }
    
    return () => clearTimeout(timeout);
  }, [currentStep, externalProgress, onComplete]);

  // Animate internal progress (simulates loading)
  useEffect(() => {
    if (externalProgress !== undefined) return;
    
    const controls = animate(0, 100, {
      duration: 9,
      ease: "linear",
      onUpdate: (value) => setInternalProgress(Math.floor(value)),
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });
    return () => controls.stop();
  }, [externalProgress, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      
      {/* Animated map grid background */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mapGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#60a5fa" strokeWidth="0.5" strokeDasharray="2 4"/>
              <circle cx="0" cy="0" r="1.5" fill="#60a5fa" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapGrid)" />
          
          {/* Moving "radar" sweep */}
          <motion.circle
            cx="50%" cy="50%" r="30%"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="10 20"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          />
        </svg>
      </div>

      {/* Main loader container */}
      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-md">
        
        {/* Animated route line with moving car & glow */}
        <div className="relative w-full h-48 mb-8">
          <svg width="100%" height="100%" viewBox="0 0 400 150" preserveAspectRatio="none">
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <filter id="carGlow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Dashed route path */}
            <path
              d="M20 100 Q100 20 200 70 T380 50"
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="4"
              strokeDasharray="12 12"
              strokeLinecap="round"
            />
            
            {/* Trail effect (glow behind car) */}
            <motion.circle
              r="12"
              fill="#3b82f6"
              filter="url(#carGlow)"
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: "100%" }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ offsetPath: "path('M20 100 Q100 20 200 70 T380 50')" }}
            />
            
            {/* Moving car icon */}
            <motion.g
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: "100%" }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
              style={{ offsetPath: "path('M20 100 Q100 20 200 70 T380 50')" }}
            >
              <rect x="-12" y="-8" width="24" height="16" rx="4" fill="#ef4444" filter="url(#carGlow)"/>
              <rect x="-8" y="-12" width="16" height="6" rx="2" fill="#f87171"/>
              <circle cx="-6" cy="8" r="4" fill="#1e293b"/>
              <circle cx="6" cy="8" r="4" fill="#1e293b"/>
            </motion.g>
          </svg>
        </div>

        {/* Destination pin with ripple */}
        <div className="relative mb-6">
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500"
            animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
          />
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#3b82f6" stroke="#fff" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </motion.div>
        </div>

        {/* Dynamic message with typewriter effect */}
        <div className="text-center mb-4">
          <motion.h2
            key={activeMessage.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="text-xl font-bold text-white drop-shadow-lg"
          >
            {activeMessage.title}
          </motion.h2>
          {activeMessage.subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              className="text-sm text-indigo-200 mt-1"
            >
              {activeMessage.subtitle}
            </motion.p>
          )}
        </div>

        {/* Progress bar with percentage */}
        <div className="w-full bg-slate-700 rounded-full h-2 mb-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progressValue}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="text-right text-xs text-indigo-300 font-mono">
          {progressValue}%
        </div>

        {/* Loading dots with bounce */}
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 bg-blue-400 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>

      {/* Floating particles / clouds */}
      <motion.div
        className="absolute top-20 left-10 text-white/10 text-6xl"
        animate={{ x: [0, 30, 0], rotate: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      >
        ☁️
      </motion.div>
      <motion.div
        className="absolute bottom-20 right-10 text-white/10 text-6xl"
        animate={{ x: [0, -40, 0], rotate: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
      >
        ☁️
      </motion.div>
    </div>
  );
}