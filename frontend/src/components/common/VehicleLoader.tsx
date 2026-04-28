import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface VehicleLoaderProps {
  message?: string;
  onComplete?: () => void;
  speed?: number; // 1 = normal, >1 faster
}

type Vehicle = "bike" | "car" | "bus" | "train" | "flight" | "hotel";

export default function VehicleLoader({ message, onComplete, speed = 1 }: VehicleLoaderProps) {
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>("bike");
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  const vehicleOrder: Vehicle[] = ["bike", "car", "bus", "train", "flight", "hotel"];
  const durations: Record<Vehicle, number> = {
    bike: 2800,
    car: 2800,
    bus: 3200,
    train: 3600,
    flight: 4200,
    hotel: 2200,
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
        if (onComplete) {
          // Show confetti before completing
          setShowConfetti(true);
          setTimeout(() => onComplete(), 800);
        }
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [currentVehicle, isAnimating, speed, onComplete]);

  // Spring progress for bar
  const springProgress = useSpring(progress, { stiffness: 100, damping: 20 });
  const width = useTransform(springProgress, (v) => `${v}%`);

  const getDefaultMessage = () => {
    switch (currentVehicle) {
      case "bike": return "Finding bike routes 🚲";
      case "car": return "Checking car traffic 🚗";
      case "bus": return "Optimizing bus schedule 🚌";
      case "train": return "Booking train seats 🚆";
      case "flight": return "Searching flights ✈️";
      case "hotel": return "Preparing hotels 🏨";
      default: return "Planning your trip";
    }
  };
  const displayMessage = message || getDefaultMessage();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#60a5fa" strokeWidth="0.5" strokeDasharray="2 3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Parallax clouds */}
      <motion.div
        className="absolute top-12 left-10 text-white/10 text-6xl"
        animate={{ x: [0, 30, 0], y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      >
        ☁️
      </motion.div>
      <motion.div
        className="absolute bottom-20 right-8 text-white/10 text-5xl"
        animate={{ x: [0, -40, 0], y: [0, 15, 0] }}
        transition={{ repeat: Infinity, duration: 15, ease: "easeInOut", delay: 2 }}
      >
        ☁️
      </motion.div>

      {/* Confetti overlay for final step */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: `hsl(${Math.random() * 360}, 70%, 60%)`,
                left: `${Math.random() * 100}%`,
                top: "50%",
              }}
              animate={{
                y: [0, -200, -400],
                x: [0, (Math.random() - 0.5) * 200],
                rotate: [0, Math.random() * 360],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          ))}
        </div>
      )}

      {/* Vehicle container */}
      <div className="relative w-full max-w-lg h-72 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVehicle}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute"
          >
            {currentVehicle === "bike" && <BikeAnimation />}
            {currentVehicle === "car" && <CarAnimation />}
            {currentVehicle === "bus" && <BusAnimation />}
            {currentVehicle === "train" && <TrainAnimation />}
            {currentVehicle === "flight" && <FlightAnimation />}
            {currentVehicle === "hotel" && <HotelAnimation />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Message & progress */}
      <div className="mt-6 text-center z-10">
        <motion.p
          key={displayMessage}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 0.9, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-white/90 text-base tracking-wide mb-2 font-medium"
        >
          {displayMessage}
        </motion.p>
        <div className="text-5xl font-light text-white tabular-nums tracking-tight">
          {Math.floor(springProgress.get())}%
        </div>
        <div className="w-80 h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
            style={{ width }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Enhanced Bike with realistic dust particles ---
const BikeAnimation = () => {
  return (
    <div className="relative">
      <motion.div
        className="flex items-center gap-2"
        initial={{ x: -200 }}
        animate={{ x: 200 }}
        transition={{ duration: 2.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <svg width="90" height="70" viewBox="0 0 90 70" fill="none">
          <path d="M20 45 L32 25 L48 25 L60 45" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <circle cx="22" cy="52" r="9" stroke="#ef4444" strokeWidth="3" fill="none"/>
          <circle cx="55" cy="52" r="9" stroke="#ef4444" strokeWidth="3" fill="none"/>
          <line x1="32" y1="25" x2="40" y2="40" stroke="#ef4444" strokeWidth="2.5"/>
          <line x1="48" y1="25" x2="44" y2="40" stroke="#ef4444" strokeWidth="2.5"/>
          <circle cx="22" cy="52" r="3" fill="#fca5a5" />
          <circle cx="55" cy="52" r="3" fill="#fca5a5" />
        </svg>
        {/* Enhanced dust cloud */}
        <motion.div
          className="absolute -left-6 bottom-2"
          animate={{
            x: [-15, -45],
            y: [0, -5, 0],
            opacity: [0.8, 0],
          }}
          transition={{ repeat: Infinity, duration: 0.4, ease: "easeOut" }}
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-gray-400 rounded-full blur-[0.5px]"
              style={{ left: i * 2, top: i * 1.5 }}
              animate={{ scale: [1, 0.5], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 0.3, delay: i * 0.05 }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

// --- Car with smooth slide and subtle suspension wobble ---
const CarAnimation = () => {
  return (
    <motion.div
      initial={{ x: -220 }}
      animate={{ x: 220 }}
      transition={{ duration: 2.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <motion.div
        animate={{ y: [0, -2, 0, 2, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
      >
        <svg width="110" height="70" viewBox="0 0 110 70" fill="none">
          <rect x="10" y="25" width="88" height="28" rx="6" fill="#3b82f6" />
          <rect x="25" y="12" width="58" height="16" rx="4" fill="#60a5fa" />
          <circle cx="28" cy="53" r="10" fill="#1e293b" />
          <circle cx="80" cy="53" r="10" fill="#1e293b" />
          <circle cx="28" cy="53" r="5" fill="#94a3b8" />
          <circle cx="80" cy="53" r="5" fill="#94a3b8" />
          <rect x="45" y="20" width="18" height="8" rx="2" fill="#93c5fd" opacity="0.6" />
        </svg>
      </motion.div>
    </motion.div>
  );
};

// --- Bus with heavier motion ---
const BusAnimation = () => {
  return (
    <motion.div
      initial={{ x: -250 }}
      animate={{ x: 250 }}
      transition={{ duration: 2.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <motion.div
        animate={{ y: [0, -1, 0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
      >
        <svg width="130" height="80" viewBox="0 0 130 80" fill="none">
          <rect x="10" y="35" width="110" height="32" rx="8" fill="#a855f7" />
          <rect x="20" y="18" width="88" height="22" rx="4" fill="#c084fc" />
          {[35, 52, 69, 86].map((x) => (
            <rect key={x} x={x} y="40" width="9" height="14" rx="2" fill="#1e293b" />
          ))}
          <circle cx="28" cy="67" r="9" fill="#1e293b" />
          <circle cx="102" cy="67" r="9" fill="#1e293b" />
          <circle cx="28" cy="67" r="4.5" fill="#94a3b8" />
          <circle cx="102" cy="67" r="4.5" fill="#94a3b8" />
        </svg>
      </motion.div>
    </motion.div>
  );
};

// --- Train with track joints bounce and chuff effect ---
const TrainAnimation = () => {
  return (
    <div className="relative">
      {/* Railway track */}
      <motion.div
        className="absolute -bottom-8 w-full h-3 bg-gray-700 rounded-full"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 0.5 }}
      >
        <div className="absolute inset-x-0 h-0.5 bg-gray-500 top-1/2 -translate-y-1/2" />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="absolute w-1 h-3 bg-gray-600" style={{ left: `${i * 10}%`, top: -2 }} />
        ))}
      </motion.div>
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: 280 }}
        transition={{ duration: 3.2, ease: "linear" }}
      >
        <motion.div
          animate={{ y: [0, -5, 0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.4, ease: "easeInOut" }}
        >
          <svg width="150" height="70" viewBox="0 0 150 70" fill="none">
            <rect x="5" y="20" width="140" height="28" rx="6" fill="#f59e0b" />
            <rect x="15" y="8" width="28" height="16" rx="3" fill="#fbbf24" />
            <rect x="65" y="8" width="28" height="16" rx="3" fill="#fbbf24" />
            <rect x="115" y="8" width="28" height="16" rx="3" fill="#fbbf24" />
            <circle cx="25" cy="48" r="7" fill="#1e293b" />
            <circle cx="55" cy="48" r="7" fill="#1e293b" />
            <circle cx="85" cy="48" r="7" fill="#1e293b" />
            <circle cx="125" cy="48" r="7" fill="#1e293b" />
          </svg>
          {/* Steam puffs */}
          <motion.div
            className="absolute -top-2 left-4 text-white/30 text-xl"
            animate={{ x: [0, 20, 40], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, ease: "easeOut" }}
          >
            💨
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// --- Flight with curved takeoff and contrail ---
const FlightAnimation = () => {
  return (
    <motion.div
      initial={{ x: -320, y: 0 }}
      animate={{ x: 320, y: -70 }}
      transition={{ duration: 3.8, ease: [0.33, 1, 0.68, 1] }}
    >
      <motion.div
        animate={{ rotate: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 0.5 }}
      >
        <svg width="130" height="70" viewBox="0 0 130 70" fill="none">
          <path d="M15 40 L35 28 L90 28 Q105 28 115 38 Q125 48 115 58 Q105 68 90 68 L35 68 L15 40 Z" fill="#ec4899" />
          <path d="M55 28 L70 12 L85 28" fill="#f472b6" />
          <path d="M35 28 L25 16 L45 22" fill="#f472b6" />
          <circle cx="100" cy="48" r="4" fill="#fbcfe8" />
        </svg>
        {/* Contrail (fading trail) */}
        <motion.div
          className="absolute -left-20 top-8 h-1 bg-white/30 rounded-full blur-sm"
          style={{ width: 80 }}
          animate={{ opacity: [0, 0.6, 0], width: [40, 100, 140] }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
      </motion.div>
    </motion.div>
  );
};

// --- Hotel with glow, scale, and sparkles ---
const HotelAnimation = () => {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
          <rect x="15" y="30" width="90" height="60" rx="6" fill="#10b981" />
          <rect x="45" y="55" width="30" height="35" rx="3" fill="#34d399" />
          <rect x="35" y="42" width="10" height="10" rx="2" fill="#fef3c7" />
          <rect x="75" y="42" width="10" height="10" rx="2" fill="#fef3c7" />
          <rect x="55" y="65" width="10" height="15" rx="2" fill="#fef3c7" />
          <path d="M15 30 L60 10 L105 30" fill="#059669" stroke="none" />
        </svg>
        {/* Glow behind hotel */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-500 blur-2xl -z-10"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </div>
      {/* Sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-yellow-300 text-lg"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], y: [-10, -30] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
          style={{ left: `${20 + i * 12}%`, top: "10%" }}
        >
          ✨
        </motion.div>
      ))}
    </motion.div>
  );
};