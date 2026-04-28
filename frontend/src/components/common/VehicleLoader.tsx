import { motion, useSpring, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface VehicleLoaderProps {
  /** Optional custom message (e.g., "Locating best route") */
  message?: string;
  /** Loading stage: 0 = route, 1 = traffic, 2 = arrival */
  step?: number;
  /** External progress (0‑100). If not provided, auto‑animates */
  progress?: number;
  /** Callback when loading finishes */
  onComplete?: () => void;
}

export default function VehicleLoader({
  message,
  step = 0,
  progress: externalProgress,
  onComplete,
}: VehicleLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(0);
  const progressValue = externalProgress ?? internalProgress;
  const [currentStep, setCurrentStep] = useState(step);

  // Professional, short loading messages
  const stepMessages = [
    "Locating best route",
    "Checking traffic",
    "Almost there",
  ];
  const displayMessage = message ?? stepMessages[currentStep];

  // Auto‑advance steps (if no external progress control)
  useEffect(() => {
    if (externalProgress !== undefined) return;
    const durations = [3000, 3000, 2000];
    const timer = setTimeout(() => {
      if (currentStep < 2) setCurrentStep((s) => s + 1);
      else if (onComplete) onComplete();
    }, durations[currentStep]);
    return () => clearTimeout(timer);
  }, [currentStep, externalProgress, onComplete]);

  // Auto‑increase internal progress (if no external progress)
  useEffect(() => {
    if (externalProgress !== undefined) return;
    const controls = animate(0, 100, {
      duration: 8,
      ease: [0.2, 0.9, 0.4, 1.0],
      onUpdate: (v) => setInternalProgress(Math.floor(v)),
      onComplete: () => onComplete?.(),
    });
    return () => controls.stop();
  }, [externalProgress, onComplete]);

  // Spring for smooth progress bar animation
  const springProgress = useSpring(progressValue, {
    stiffness: 120,
    damping: 20,
  });
  const width = useTransform(springProgress, (v) => `${v}%`);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0f1c] to-[#0f172a] overflow-hidden">
      {/* Subtle animated map grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Animated route line with moving car */}
      <div className="relative w-72 h-32 mb-10">
        <svg width="100%" height="100%" viewBox="0 0 300 120" fill="none">
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          {/* Dashed route line */}
          <path
            d="M20 60 Q80 20 150 50 T280 40"
            stroke="url(#routeGrad)"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            fill="none"
            strokeLinecap="round"
          />
          {/* Moving car (small, elegant) */}
          <motion.g
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 0.5,
            }}
            style={{ offsetPath: "path('M20 60 Q80 20 150 50 T280 40')" }}
          >
            <rect x="-8" y="-5" width="16" height="10" rx="3" fill="#ef4444" />
            <rect x="-6" y="-8" width="12" height="4" rx="2" fill="#f87171" />
            <circle cx="-4" cy="5" r="2.5" fill="#1e293b" />
            <circle cx="4" cy="5" r="2.5" fill="#1e293b" />
          </motion.g>
        </svg>
      </div>

      {/* Destination pin (subtle pulse) */}
      <div className="relative mb-8">
        <motion.div
          className="absolute inset-0 rounded-full bg-blue-500/40"
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
        />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" strokeWidth="1">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      </div>

      {/* Message */}
      <motion.p
        key={displayMessage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-white/90 text-lg font-medium tracking-wide mb-6"
      >
        {displayMessage}
      </motion.p>

      {/* Progress percentage */}
      <div className="text-5xl font-light text-white mb-3 tabular-nums">
        {Math.floor(progressValue)}%
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          style={{ width }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </div>
  );
}