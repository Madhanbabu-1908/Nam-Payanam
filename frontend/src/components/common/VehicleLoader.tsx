import { motion, useMotionValue, useTransform, animate, useSpring, useTime } from "framer-motion";
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
  const time = useTime(); // For continuous animations
  
  const stepMessages = [
    { title: "Scanning satellites", subtitle: "Locating best route" },
    { title: "Avoiding traffic jams", subtitle: "Real-time updates" },
    { title: "Preparing your adventure", subtitle: "Almost ready!" },
  ];
  
  const activeMessage = message 
    ? { title: message, subtitle: "" } 
    : stepMessages[currentStep];

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

  const springProgress = useSpring(progressValue, { stiffness: 100, damping: 20 });

  // Generate random stars positions
  const stars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: Math.random() * 5,
    duration: 1 + Math.random() * 3,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950">
      
      {/* ===== LAYER 0: Animated gradient overlay that shifts ===== */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, rgba(59,130,246,0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 70%, rgba(168,85,247,0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 40% 60%, rgba(236,72,153,0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 60% 20%, rgba(59,130,246,0.15) 0%, transparent 50%)",
          ]
        }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      />

      {/* ===== LAYER 0.5: Twinkling stars ===== */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute w-0.5 h-0.5 bg-white rounded-full"
          style={{ left: star.left, top: star.top }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: star.duration, delay: star.delay }}
        />
      ))}

      {/* ===== LAYER 1: Animated map grid with rotation ===== */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M40 0 L80 20 L80 60 L40 80 L0 60 L0 20 Z" fill="none" stroke="#60a5fa" strokeWidth="0.5" strokeDasharray="2 4"/>
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexGrid)"/>
        </svg>
      </motion.div>

      {/* ===== LAYER 2: Multiple radar sweeps ===== */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <motion.div
          className="absolute w-[80%] h-[80%] rounded-full border border-blue-500/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeOut" }}
        />
        <motion.div
          className="absolute w-[60%] h-[60%] rounded-full border border-purple-500/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 3.5, delay: 1, ease: "easeOut" }}
        />
        <motion.div
          className="absolute w-40 h-40 rounded-full border border-pink-500/30"
          animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 3, delay: 2, ease: "easeOut" }}
        />
      </motion.div>

      {/* ===== LAYER 3: Floating vehicles (cars, planes) ===== */}
      <motion.div
        className="absolute top-1/4 left-0 text-2xl"
        animate={{ x: ["-10%", "110%"], y: [0, -20, 0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
      >
        🚗
      </motion.div>
      <motion.div
        className="absolute bottom-1/3 right-0 text-2xl"
        animate={{ x: ["110%", "-10%"], y: [0, 15, 0, -15, 0] }}
        transition={{ repeat: Infinity, duration: 15, ease: "linear", delay: 2 }}
      >
        ✈️
      </motion.div>
      <motion.div
        className="absolute top-2/3 left-0 text-xl"
        animate={{ x: ["-10%", "110%"], y: [0, -10, 0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 18, ease: "linear", delay: 5 }}
      >
        🚲
      </motion.div>

      {/* ===== LAYER 4: Rotating compass (enhanced) ===== */}
      <motion.div
        className="absolute top-6 right-6 w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-lg"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
      >
        <motion.svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="1.5"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        >
          <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" />
          <circle cx="12" cy="12" r="4" fill="#3b82f6" fillOpacity="0.3" />
          <polygon points="12 6, 14 10, 10 10" fill="#ef4444" />
        </motion.svg>
      </motion.div>

      {/* ===== LAYER 5: Main content with 3D tilt effect ===== */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 w-full max-w-lg"
        style={{
          transformStyle: "preserve-3d",
        }}
        animate={{
          rotateX: [0, 2, 0, -2, 0],
          rotateY: [0, 3, 0, -3, 0],
        }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
      >
        {/* Route path with drawing animation */}
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
            
            {/* Animated dashed route - draws itself continuously */}
            <motion.path
              d="M20 100 Q120 20 220 80 T420 60 T480 100"
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="3"
              strokeDasharray="10 10"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 200 }}
              animate={{ strokeDashoffset: [200, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            />
            
            {/* Blinking nodes with pulse ring */}
            {[0.2, 0.4, 0.6, 0.8].map((t, idx) => {
              const x = 20 + (t * 460);
              const y = 100 + Math.sin(t * Math.PI * 2) * 30;
              return (
                <g key={idx}>
                  <motion.circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="#a855f7"
                    opacity="0.3"
                    animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: idx * 0.2 }}
                  />
                  <motion.circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#a855f7"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: idx * 0.2 }}
                  />
                </g>
              );
            })}
            
            {/* Moving car with trail particles */}
            <motion.g
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: "100%" }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 0.3 }}
              style={{ offsetPath: "path('M20 100 Q120 20 220 80 T420 60 T480 100')" }}
            >
              {/* Trail particles behind car */}
              {[...Array(5)].map((_, i) => (
                <motion.circle
                  key={i}
                  r="3"
                  fill="#f87171"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.8, 0], x: [-10 - i * 4, -30 - i * 4] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                />
              ))}
              {/* Pulsing ring behind car */}
              <motion.circle
                r="20"
                fill="#ef4444"
                opacity="0.4"
                animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "easeOut" }}
              />
              {/* Car body */}
              <rect x="-14" y="-9" width="28" height="18" rx="5" fill="#ef4444" filter="url(#glow)"/>
              <rect x="-10" y="-14" width="20" height="7" rx="3" fill="#f87171"/>
              <circle cx="-6" cy="9" r="4.5" fill="#1e293b"/>
              <circle cx="6" cy="9" r="4.5" fill="#1e293b"/>
              {/* Headlight beam */}
              <motion.path
                d="M14 -3 L30 -8 L30 2 Z"
                fill="#fbbf24"
                opacity="0.6"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
              />
              <motion.circle
                cx="14"
                cy="-3"
                r="3"
                fill="#fbbf24"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
              />
            </motion.g>
          </svg>
        </div>

        {/* Destination pin with triple ripple and wobble */}
        <div className="relative mb-6">
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500"
            animate={{ scale: [1, 2.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500"
            animate={{ scale: [1, 3.2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.8, delay: 0.3 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-pink-500"
            animate={{ scale: [1, 4, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ repeat: Infinity, duration: 2.1, delay: 0.6 }}
          />
          <motion.div
            animate={{ y: [0, -12, 0], rotateZ: [-3, 3, -3] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="#3b82f6" stroke="#fff" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </motion.div>
        </div>

        {/* Text with per-letter wave animation */}
        <div className="text-center mb-3">
          <motion.div
            key={activeMessage.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            {activeMessage.title.split("").map((char, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, type: "spring" }}
                className="inline-block"
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </motion.div>
          {activeMessage.subtitle && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 0.9, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-indigo-200 mt-1"
            >
              {activeMessage.subtitle}
            </motion.p>
          )}
        </div>

        {/* Glowing progress bar with wave */}
        <div className="w-full bg-slate-700/50 rounded-full h-3 mb-2 overflow-hidden backdrop-blur-sm shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full relative"
            style={{ width: useTransform(springProgress, (v) => `${v}%`) }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-45"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          </motion.div>
        </div>
        <div className="text-right text-xs text-indigo-300 font-mono">
          {Math.floor(progressValue)}%
        </div>

        {/* Particle field (more particles, random directions) */}
        <div className="relative h-16 w-full mt-4">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full"
              initial={{ x: "50%", y: "50%", opacity: 0 }}
              animate={{
                x: ["50%", `${50 + (Math.random() - 0.5) * 100}%`],
                y: ["50%", `${50 + (Math.random() - 0.5) * 80}%`],
                opacity: [1, 0],
                scale: [1, 0.5],
              }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1, ease: "easeOut" }}
            />
          ))}
        </div>

        {/* Bouncing dots with color cycle and rotation */}
        <div className="flex gap-4 mt-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{ background: `hsl(${i * 72 + (time.get() * 0.1) % 360}, 70%, 60%)` }}
              animate={{ y: [0, -14, 0], scale: [1, 1.3, 1], rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>

      {/* ===== LAYER 6: Floating icons with different paths ===== */}
      <motion.div
        className="absolute top-20 left-10 text-white/15 text-5xl"
        animate={{ y: [0, -20, 0], x: [0, 15, 0], rotate: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
      >
        ☁️
      </motion.div>
      <motion.div
        className="absolute bottom-28 right-12 text-white/15 text-6xl"
        animate={{ y: [0, 15, 0], x: [0, -25, 0], rotate: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 9, ease: "easeInOut", delay: 1 }}
      >
        ☁️
      </motion.div>
      <motion.div
        className="absolute top-1/3 right-1/4 text-white/10 text-3xl"
        animate={{ y: [0, -30, 0], x: [0, 20, 0], opacity: [0.1, 0.3, 0.1] }}
        transition={{ repeat: Infinity, duration: 11, ease: "easeInOut", delay: 2 }}
      >
        🗺️
      </motion.div>
      <motion.div
        className="absolute bottom-20 left-1/3 text-white/10 text-3xl"
        animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
      >
        ⭐
      </motion.div>
    </div>
  );
}