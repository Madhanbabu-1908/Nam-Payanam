import { motion, AnimatePresence, useSpring, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface VehicleLoaderProps {
  /** Optional custom message to display (overrides the default step message) */
  message?: string;
  /** Callback when loading finishes */
  onComplete?: () => void;
  /** Optional speed multiplier for the animation (1 = normal) */
  speed?: number;
}

type Vehicle = "bike" | "car" | "bus" | "train" | "flight" | "hotel";

export default function VehicleLoader({ 
  message, 
  onComplete, 
  speed = 1 
}: VehicleLoaderProps) {
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>("bike");
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const vehicleOrder: Vehicle[] = ["bike", "car", "bus", "train", "flight", "hotel"];
  const durations: Record<Vehicle, number> = {
    bike: 2500,
    car: 2500,
    bus: 3000,
    train: 3500,
    flight: 4000,
    hotel: 2000,
  };

  // Auto-advance to next vehicle
  useEffect(() => {
    if (!isAnimating) return;
    const currentIndex = vehicleOrder.indexOf(currentVehicle);
    const duration = durations[currentVehicle] / speed;
    const timer = setTimeout(() => {
      if (currentIndex + 1 < vehicleOrder.length) {
        setCurrentVehicle(vehicleOrder[currentIndex + 1]);
        setProgress(((currentIndex + 2) / vehicleOrder.length) * 100);
      } else {
        setIsAnimating(false);
        onComplete?.();
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [currentVehicle, isAnimating, speed, onComplete]);

  // Helper to get the default message based on the current vehicle
  const getDefaultMessage = () => {
    switch (currentVehicle) {
      case "bike": return "Finding bike routes";
      case "car": return "Checking car traffic";
      case "bus": return "Optimizing bus schedule";
      case "train": return "Booking train seats";
      case "flight": return "Searching flights";
      case "hotel": return "Preparing hotels";
      default: return "Planning your trip";
    }
  };

  // Use custom message if provided, otherwise use the default step message
  const displayMessage = message || getDefaultMessage();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 overflow-hidden">
      {/* Subtle map grid background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Animated vehicle */}
      <div className="relative w-full max-w-md h-64 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVehicle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute"
          >
            {/* ... vehicle rendering logic (unchanged) ... */}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Message & progress */}
      <div className="mt-8 text-center">
        {/* Display the message - either custom or default */}
        <motion.p
          key={displayMessage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          className="text-white/80 text-sm tracking-wide mb-2"
        >
          {displayMessage}
        </motion.p>
        <div className="text-4xl font-light text-white tabular-nums">
          {Math.floor(progress)}%
        </div>
        <div className="w-64 h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}