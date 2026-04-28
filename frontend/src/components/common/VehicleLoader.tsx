import { motion, useMotionValue, useTransform, animate, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

interface VehicleLoaderProps {
  message?: string;
  step?: number;
  progress?: number;
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
  
  const stepMessages = [
    { title: "Scanning satellites", subtitle: "Locating best route" },
    { title: "Avoiding traffic jams", subtitle: "Real-time updates" },
    { title: "Preparing your adventure", subtitle: "Almost ready!" },
  ];
  
  const activeMessage = message 
    ? { title: message, subtitle: "" } 
    : stepMessages[currentStep];

  // Auto step advance
  useEffect(() => {
    if (externalProgress !== undefined) return;
    const intervals = [3500, 4000, 2500];
    let timeout: NodeJS.Timeout;
    if (currentStep < 2) {
      timeout = setTimeout(() => setCurrentStep(prev => prev + 1), intervals[currentStep]);
    } else if (currentStep === 2 && onComplete) {
      timeout = setTimeout(() => onComplete(), intervals[2]);
    }
    return () => clearTimeout(timeout);
  }, [currentStep, externalProgress, onComplete]);

  // Internal progress animation
  useEffect(() => {
    if (externalProgress !== undefined) return;
    const controls = animate(0, 100, {
      duration: 10,
      ease: [0.2, 0.9, 0.4, 1.0],
      onUpdate: (value) => setInternalProgress(Math.floor(value)),
      onComplete: () => onComplete && onComplete(),
    });
    return () => controls.stop();
  }, [externalProgress, onComplete]);

  // Spring physics for smoother number transitions
  const springProgress = useSpring(progressValue, { stiffness: 100, damping: 20 });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950">
      
      {/* ===== LAYER 1: Animated map background ===== */}
      <div className="absolute inset-0 opacity-25">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M40 0 L80 20 L80 60 L40 80 L0 60 L0 20 Z" fill="none" stroke="#60a5fa" strokeWidth="0.5"/>
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexGrid)"/>
        </svg>
      </div>

      {/* ===== LAYER 2: Floating location pins (parallax) ===== */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-blue-400/30 text-2xl"
          initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: 0 }}
          animate={{ 
            y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            opacity: [0.3, 0.6, 0.3],
            rotate: [0, 360]
          }}
          transition={{ repeat: Infinity, duration: 20 + i * 5, ease: "linear" }}
        >
          📍
        </motion.div>
      ))}

      {/* ===== LAYER 3: Rotating compass ===== */}
      <motion.div
        className="absolute top-6 right-6 w-12 h-12 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5">
          <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" />
          <circle cx="12" cy="12" r="4" fill="#3b82f6" fillOpacity="0.3" />
          <polygon points="12 6, 14 10, 10 10" fill="#ef4444" />
        </svg>
      </motion.div>

      {/* ===== LAYER 4: Main content ===== */}
      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-lg">
        
        {/* Route path with enhanced effects */}
        <div className="relative w-full h-56 mb-6">
          <svg width="100%" height="100%" viewBox="0 0 500 180" preserveAspectRatio="none">
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <filter id="glowHeavy">
                <feGaussianBlur stdDeviation="6"/>
              </filter>
            </defs>
            
            {/* Glow under path */}
            <path
              d="M20 100 Q120 20 220 80 T420 60 T480 100"
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="12"
              opacity="0.2"
              filter="url(#glowHeavy)"
            />
            
            {/* Dashed route line */}
            <path
              d="M20 100 Q120 20 220 80 T420 60 T480 100"
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="3"
              strokeDasharray="10 10"
              strokeLinecap="round"
            />
            
            {/* Blinking nodes along path */}
            {[0.2, 0.4, 0.6, 0.8].map((t, idx) => {
              // Approximate point on path (simplified)
              const x = 20 + (t * 460);
              const y = 100 + Math.sin(t * Math.PI * 2) * 30;
              return (
                <motion.circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#a855f7"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: idx * 0.2 }}
                />
              );
            })}
            
            {/* Moving car with multiple effects */}
            <motion.g
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: "100%" }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 0.3 }}
              style={{ offsetPath: "path('M20 100 Q120 20 220 80 T420 60 T480 100')" }}
            >
              {/* Pulsing ring behind car */}
              <motion.circle
                r="18"
                fill="#ef4444"
                opacity="0.4"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 1, ease: "easeOut" }}
              />
              {/* Car body */}
              <rect x="-14" y="-9" width="28" height="18" rx="5" fill="#ef4444" filter="url(#glow)"/>
              <rect x="-10" y="-14" width="20" height="7" rx="3" fill="#f87171"/>
              <circle cx="-6" cy="9" r="4.5" fill="#1e293b"/>
              <circle cx="6" cy="9" r="4.5" fill="#1e293b"/>
              {/* Car headlights glow */}
              <circle cx="14" cy="-3" r="3" fill="#fbbf24" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 0.5 }}/>
            </motion.g>
          </svg>
        </div>

        {/* Destination pin with double ripple */}
        <div className="relative mb-6">
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500"
            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500"
            animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.8, delay: 0.3 }}
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="#3b82f6" stroke="#fff" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </motion.div>
        </div>

        {/* Shimmering text */}
        <div className="text-center mb-3">
          <motion.h2
            key={activeMessage.title}
            initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 150 }}
            className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            {activeMessage.title}
          </motion.h2>
          {activeMessage.subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              className="text-sm text-indigo-200 mt-1"
            >
              {activeMessage.subtitle}
            </motion.p>
          )}
        </div>

        {/* Progress bar with wave effect */}
        <div className="w-full bg-slate-700/50 rounded-full h-2.5 mb-2 overflow-hidden backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
            style={{ width: useTransform(springProgress, (v) => `${v}%`) }}
            transition={{ duration: 0.2 }}
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-45"
                 style={{ width: "100%", height: "100%" }} />
          </motion.div>
        </div>
        <div className="text-right text-xs text-indigo-300 font-mono animate-pulse">
          {Math.floor(progressValue)}%
        </div>

        {/* Particle system (flyin dots) */}
        <div className="relative h-12 w-full mt-4">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full"
              initial={{ x: "0%", y: "0%", opacity: 0 }}
              animate={{
                x: ["0%", "100%"],
                y: [0, (Math.random() - 0.5) * 30],
                opacity: [1, 0],
              }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.15, ease: "linear" }}
              style={{ left: "0%", top: "50%" }}
            />
          ))}
        </div>

        {/* Bouncing dots with color cycle */}
        <div className="flex gap-3 mt-6">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ background: `hsl(${i * 90 + 200}, 70%, 60%)` }}
              animate={{ y: [0, -12, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>

      {/* Floating clouds with different speeds */}
      <motion.div
        className="absolute top-12 left-5 text-white/10 text-5xl"
        animate={{ x: [0, 60, 0], rotate: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
      >
        ☁️
      </motion.div>
      <motion.div
        className="absolute bottom-16 right-8 text-white/10 text-6xl"
        animate={{ x: [0, -80, 0], rotate: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 22, ease: "easeInOut" }}
      >
        ☁️
      </motion.div>
      <motion.div
        className="absolute bottom-32 left-1/4 text-white/5 text-4xl"
        animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
      >
        🚗
      </motion.div>
    </div>
  );
}