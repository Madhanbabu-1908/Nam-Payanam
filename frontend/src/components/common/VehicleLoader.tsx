import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface VehicleLoaderProps {
  onComplete?: () => void;
  /** Optional speed multiplier (1 = normal) */
  speed?: number;
}

type Vehicle = "bike" | "car" | "bus" | "train" | "flight" | "hotel";

export default function VehicleLoader({ onComplete, speed = 1 }: VehicleLoaderProps) {
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>("bike");
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Sequence durations (ms) - affected by speed
  const durations: Record<Vehicle, number> = {
    bike: 2500,
    car: 2500,
    bus: 3000,
    train: 3500,
    flight: 4000,
    hotel: 2000,
  };

  const vehicleOrder: Vehicle[] = ["bike", "car", "bus", "train", "flight", "hotel"];

  // Advance to next vehicle
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

  // Helper: render the current vehicle with its specific animation
  const renderVehicle = () => {
    switch (currentVehicle) {
      case "bike":
        return <BikeAnimation />;
      case "car":
        return <CarAnimation />;
      case "bus":
        return <BusAnimation />;
      case "train":
        return <TrainAnimation />;
      case "flight":
        return <FlightAnimation />;
      case "hotel":
        return <HotelAnimation />;
      default:
        return null;
    }
  };

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
            {renderVehicle()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Message & progress */}
      <div className="mt-8 text-center">
        <motion.p
          key={currentVehicle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          className="text-white/80 text-sm tracking-wide mb-2"
        >
          {currentVehicle === "bike" && "Finding bike routes"}
          {currentVehicle === "car" && "Checking car traffic"}
          {currentVehicle === "bus" && "Optimizing bus schedule"}
          {currentVehicle === "train" && "Booking train seats"}
          {currentVehicle === "flight" && "Searching flights"}
          {currentVehicle === "hotel" && "Preparing hotels"}
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

// --- Individual vehicle animations ---

const BikeAnimation = () => {
  return (
    <div className="relative">
      <motion.div
        className="flex items-center gap-2"
        initial={{ x: -150 }}
        animate={{ x: 150 }}
        transition={{ duration: 2, ease: "linear" }}
        onAnimationComplete={() => {}}
      >
        {/* Bike icon */}
        <div className="relative">
          <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
            <path d="M20 40 L30 20 L45 20 L55 40" stroke="#ef4444" strokeWidth="3" fill="none" />
            <circle cx="22" cy="45" r="8" stroke="#ef4444" strokeWidth="3" fill="none" />
            <circle cx="50" cy="45" r="8" stroke="#ef4444" strokeWidth="3" fill="none" />
            <line x1="30" y1="20" x2="38" y2="35" stroke="#ef4444" strokeWidth="2" />
            <line x1="45" y1="20" x2="42" y2="35" stroke="#ef4444" strokeWidth="2" />
          </svg>
          {/* Dust particles from back wheel */}
          <motion.div
            className="absolute -left-4 bottom-0"
            animate={{ x: [-10, -30], opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.5, ease: "easeOut" }}
          >
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-500 rounded-full mt-1 ml-1" />
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full ml-2" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

const CarAnimation = () => {
  return (
    <motion.div
      initial={{ x: -180 }}
      animate={{ x: 180 }}
      transition={{ duration: 2.2, ease: "linear" }}
    >
      <svg width="100" height="60" viewBox="0 0 100 60" fill="none">
        <rect x="10" y="25" width="80" height="25" rx="6" fill="#3b82f6" />
        <rect x="25" y="15" width="50" height="15" rx="4" fill="#60a5fa" />
        <circle cx="25" cy="50" r="8" fill="#1e293b" />
        <circle cx="75" cy="50" r="8" fill="#1e293b" />
        <circle cx="25" cy="50" r="4" fill="#94a3b8" />
        <circle cx="75" cy="50" r="4" fill="#94a3b8" />
      </svg>
    </motion.div>
  );
};

const BusAnimation = () => {
  return (
    <motion.div
      initial={{ x: -200 }}
      animate={{ x: 200 }}
      transition={{ duration: 2.5, ease: "linear" }}
    >
      <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
        <rect x="10" y="30" width="100" height="30" rx="8" fill="#a855f7" />
        <rect x="20" y="15" width="80" height="20" rx="4" fill="#c084fc" />
        {[35, 55, 75, 95].map((x) => (
          <rect key={x} x={x} y="35" width="8" height="12" rx="2" fill="#1e293b" />
        ))}
        <circle cx="25" cy="60" r="8" fill="#1e293b" />
        <circle cx="95" cy="60" r="8" fill="#1e293b" />
      </svg>
    </motion.div>
  );
};

const TrainAnimation = () => {
  return (
    <motion.div
      initial={{ x: -250 }}
      animate={{ x: 250 }}
      transition={{ duration: 3, ease: "linear" }}
    >
      <div className="relative">
        {/* Railway track */}
        <div className="absolute -bottom-6 w-full h-2 bg-gray-600 rounded-full">
          <div className="absolute inset-x-0 h-0.5 bg-gray-400 top-1/2 -translate-y-1/2" />
        </div>
        {/* Train with slight bounce */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.3, ease: "easeInOut" }}
        >
          <svg width="140" height="60" viewBox="0 0 140 60" fill="none">
            <rect x="5" y="20" width="130" height="25" rx="5" fill="#f59e0b" />
            <rect x="15" y="10" width="25" height="15" rx="3" fill="#fbbf24" />
            <rect x="60" y="10" width="25" height="15" rx="3" fill="#fbbf24" />
            <rect x="105" y="10" width="25" height="15" rx="3" fill="#fbbf24" />
            <circle cx="25" cy="45" r="6" fill="#1e293b" />
            <circle cx="55" cy="45" r="6" fill="#1e293b" />
            <circle cx="85" cy="45" r="6" fill="#1e293b" />
            <circle cx="115" cy="45" r="6" fill="#1e293b" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
};

const FlightAnimation = () => {
  return (
    <motion.div
      initial={{ x: -300, y: 0 }}
      animate={{ x: 300, y: -80 }}
      transition={{ duration: 3.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
        <path d="M10 35 L30 25 L80 25 Q95 25 105 35 Q115 45 105 55 Q95 65 80 65 L30 65 L10 35 Z" fill="#ec4899" />
        <path d="M50 25 L65 10 L80 25" fill="#f472b6" />
        <path d="M30 25 L20 15 L40 20" fill="#f472b6" />
        {/* Contrail (fading trail) */}
        <motion.path
          d="M-20 35 L10 35"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="4 4"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        />
      </svg>
    </motion.div>
  );
};

const HotelAnimation = () => {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="flex flex-col items-center"
    >
      <svg width="100" height="80" viewBox="0 0 100 80" fill="none">
        <rect x="15" y="25" width="70" height="50" rx="4" fill="#10b981" />
        <rect x="40" y="45" width="20" height="30" rx="2" fill="#34d399" />
        <rect x="30" y="35" width="8" height="8" rx="1" fill="#fef3c7" />
        <rect x="62" y="35" width="8" height="8" rx="1" fill="#fef3c7" />
        <path d="M15 25 L50 10 L85 25" fill="#059669" stroke="none" />
      </svg>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/90 text-sm mt-3"
      >
        ✨ Best hotels ready ✨
      </motion.div>
    </motion.div>
  );
};