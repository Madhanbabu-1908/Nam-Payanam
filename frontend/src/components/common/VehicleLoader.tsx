import { motion, AnimatePresence, useSpring, useTransform, useMotionValue, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface VehicleLoaderProps {
  message?: string;
  onComplete?: () => void;
  speed?: number;
}

type Vehicle = "bike" | "car" | "bus" | "train" | "flight" | "hotel";

export default function VehicleLoader({ message, onComplete, speed = 1 }: VehicleLoaderProps) {
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>("bike");
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const animationProgress = useMotionValue(0);

  const vehicleOrder: Vehicle[] = ["bike", "car", "bus", "train", "flight", "hotel"];
  const durations: Record<Vehicle, number> = {
    bike: 3000,
    car: 3000,
    bus: 3500,
    train: 4000,
    flight: 4500,
    hotel: 2500,
  };

  useEffect(() => {
    if (!isAnimating) return;
    const currentIndex = vehicleOrder.indexOf(currentVehicle);
    const duration = durations[currentVehicle] / speed;
    
    const progressAnimation = animate(0, 1, {
      duration: duration / 1000,
      ease: "linear",
      onUpdate: (value) => {
        animationProgress.set(value);
        const overall = ((currentIndex + value) / vehicleOrder.length) * 100;
        setProgress(Math.min(99, overall));
      },
    });

    const timer = setTimeout(() => {
      progressAnimation.stop();
      if (currentIndex + 1 < vehicleOrder.length) {
        setCurrentVehicle(vehicleOrder[currentIndex + 1]);
        animationProgress.set(0);
      } else {
        setIsAnimating(false);
        setProgress(100);
        setShowConfetti(true);
        setTimeout(() => onComplete?.(), 1000);
      }
    }, duration);

    return () => {
      clearTimeout(timer);
      progressAnimation.stop();
    };
  }, [currentVehicle, isAnimating, speed, onComplete, animationProgress]);

  const springProgress = useSpring(progress, { stiffness: 120, damping: 20 });
  const width = useTransform(springProgress, (v) => `${v}%`);

  const getDefaultMessage = () => {
    switch (currentVehicle) {
      case "bike": return "Sketching bike routes";
      case "car": return "Drawing car traffic";
      case "bus": return "Illustrating bus schedule";
      case "train": return "Doodling train seats";
      case "flight": return "Sketching flight paths";
      case "hotel": return "Watercolouring hotels";
      default: return "Planning your trip";
    }
  };
  const displayMessage = message || getDefaultMessage();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#faf8f2] overflow-hidden">
      
      {/* Paper texture background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")` }}
      />

      {/* Hand‑drawn border / frame */}
      <div className="absolute inset-4 border-2 border-black/10 rounded-2xl pointer-events-none" />

      {/* Sketchy floating lines (like margin doodles) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <path d="M20 85 Q35 70 50 85 T80 85" stroke="black" strokeWidth="0.8" fill="none" strokeDasharray="3 3" opacity="0.2" />
        <path d="M300 150 Q320 130 340 150 T380 150" stroke="black" strokeWidth="0.8" fill="none" strokeDasharray="2 4" opacity="0.2" />
      </svg>

      {/* Vehicle animation container */}
      <div className="relative w-full max-w-lg h-80 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVehicle}
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute"
          >
            {currentVehicle === "bike" && <SketchBike progress={animationProgress} />}
            {currentVehicle === "car" && <SketchCar progress={animationProgress} />}
            {currentVehicle === "bus" && <SketchBus progress={animationProgress} />}
            {currentVehicle === "train" && <SketchTrain progress={animationProgress} />}
            {currentVehicle === "flight" && <SketchFlight progress={animationProgress} />}
            {currentVehicle === "hotel" && <SketchHotel progress={animationProgress} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Message & progress (hand‑written font feel) */}
      <div className="mt-6 text-center z-10">
        <motion.div
          key={displayMessage}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-stone-700 text-base font-serif italic tracking-wide mb-2"
        >
          {displayMessage}
        </motion.div>
        <div className="text-5xl font-light text-stone-800 tabular-nums tracking-tight font-mono">
          {Math.floor(springProgress.get())}%
        </div>
        <div className="w-80 h-1 bg-stone-300 rounded-full mt-4 overflow-hidden">
          <motion.div
            className="h-full bg-stone-600 rounded-full"
            style={{ width }}
          />
        </div>
        <p className="text-stone-400 text-xs mt-3 font-serif">— handcrafted for you —</p>
      </div>

      {/* Confetti (sketchy dots) */}
      {showConfetti &&
        [...Array(60)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: `hsl(${Math.random() * 360}, 70%, 70%)`,
              left: `${Math.random() * 100}%`,
              top: "50%",
            }}
            animate={{
              y: [0, -300, -600],
              x: [0, (Math.random() - 0.5) * 300],
              rotate: [0, Math.random() * 720],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        ))}
    </div>
  );
}

// ---- SKETCH STYLE VEHICLES ----
// Each uses multiple thin, irregular strokes, rough edges, and a monochrome palette

const SketchBike = ({ progress }: { progress: any }) => {
  const x = useTransform(progress, [0, 1], [-180, 180]);
  return (
    <motion.div style={{ x }}>
      <div className="relative">
        <svg width="110" height="80" viewBox="0 0 110 80" fill="none">
          {/* Hand-drawn bike – multiple strokes for each line */}
          <g stroke="#2c2c2c" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Main frame – double lines for sketchy look */}
            <path d="M28 50 L38 28 L58 28 L70 50" strokeDasharray="2 1" />
            <path d="M29 50 L39 29 L57 29 L69 50" strokeDasharray="3 2" opacity="0.6" />
            {/* Wheels – slightly irregular circles */}
            <circle cx="30" cy="58" r="11" strokeDasharray="4 2" />
            <circle cx="30" cy="58" r="10" strokeDasharray="2 3" opacity="0.5" />
            <circle cx="64" cy="58" r="11" strokeDasharray="5 1" />
            <circle cx="64" cy="58" r="10" strokeDasharray="1 4" opacity="0.5" />
            {/* Handlebars & seat */}
            <path d="M38 28 L35 22 L42 23" />
            <path d="M52 28 L55 22" />
            {/* Pedals */}
            <line x1="42" y1="40" x2="48" y2="44" strokeDasharray="2 2" />
          </g>
        </svg>
        {/* Dust – sketchy dots */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-stone-400 rounded-full"
            style={{ left: -10, bottom: 12 }}
            animate={{ x: [-10, -35], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 0.3, delay: i * 0.05 }}
          />
        ))}
      </div>
    </motion.div>
  );
};

const SketchCar = ({ progress }: { progress: any }) => {
  const x = useTransform(progress, [0, 1], [-200, 200]);
  return (
    <motion.div style={{ x }}>
      <svg width="130" height="80" viewBox="0 0 130 80" fill="none">
        <g stroke="#2c2c2c" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <rect x="15" y="30" width="95" height="28" rx="4" strokeDasharray="5 2" />
          <rect x="18" y="32" width="90" height="24" rx="3" strokeDasharray="2 3" opacity="0.5" />
          <rect x="30" y="18" width="65" height="15" rx="3" strokeDasharray="4 2" />
          <circle cx="35" cy="58" r="10" strokeDasharray="3 2" />
          <circle cx="35" cy="58" r="8" strokeDasharray="1 3" opacity="0.5" />
          <circle cx="90" cy="58" r="10" strokeDasharray="4 1" />
          <circle cx="90" cy="58" r="8" strokeDasharray="2 2" opacity="0.5" />
          {/* Windows */}
          <rect x="40" y="22" width="12" height="8" rx="1" strokeDasharray="2 1" />
          <rect x="60" y="22" width="12" height="8" rx="1" strokeDasharray="2 1" />
          <rect x="80" y="22" width="12" height="8" rx="1" strokeDasharray="2 1" />
        </g>
      </svg>
    </motion.div>
  );
};

const SketchBus = ({ progress }: { progress: any }) => {
  const x = useTransform(progress, [0, 1], [-230, 230]);
  return (
    <motion.div style={{ x }}>
      <svg width="150" height="90" viewBox="0 0 150 90" fill="none">
        <g stroke="#2c2c2c" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <rect x="10" y="40" width="125" height="32" rx="6" strokeDasharray="6 3" />
          <rect x="15" y="22" width="115" height="20" rx="4" strokeDasharray="3 2" />
          {[25, 45, 65, 85, 105].map((x, i) => (
            <rect key={i} x={x} y="46" width="12" height="14" rx="1" strokeDasharray="2 2" />
          ))}
          <circle cx="30" cy="72" r="9" strokeDasharray="4 2" />
          <circle cx="30" cy="72" r="7" strokeDasharray="1 2" opacity="0.5" />
          <circle cx="115" cy="72" r="9" strokeDasharray="3 3" />
          <circle cx="115" cy="72" r="7" strokeDasharray="2 1" opacity="0.5" />
        </g>
      </svg>
    </motion.div>
  );
};

const SketchTrain = ({ progress }: { progress: any }) => {
  const x = useTransform(progress, [0, 1], [-280, 280]);
  return (
    <div className="relative">
      <div className="absolute -bottom-10 w-full h-2 bg-stone-400/30 rounded-full">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute w-1 h-3 bg-stone-500/40" style={{ left: `${i * 8.33}%`, top: -4 }} />
        ))}
      </div>
      <motion.div style={{ x }}>
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.3 }}>
          <svg width="170" height="80" viewBox="0 0 170 80" fill="none">
            <g stroke="#2c2c2c" strokeWidth="1.5" fill="none" strokeLinecap="round">
              <rect x="5" y="25" width="155" height="28" rx="4" strokeDasharray="5 2" />
              <rect x="15" y="12" width="32" height="15" rx="2" strokeDasharray="3 2" />
              <rect x="70" y="12" width="32" height="15" rx="2" strokeDasharray="4 1" />
              <rect x="125" y="12" width="32" height="15" rx="2" strokeDasharray="2 3" />
              <circle cx="25" cy="53" r="8" strokeDasharray="3 2" />
              <circle cx="60" cy="53" r="8" strokeDasharray="2 2" />
              <circle cx="95" cy="53" r="8" strokeDasharray="4 1" />
              <circle cx="140" cy="53" r="8" strokeDasharray="3 3" />
            </g>
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
};

const SketchFlight = ({ progress }: { progress: any }) => {
  const x = useTransform(progress, [0, 1], [-320, 320]);
  const y = useTransform(progress, [0, 0.3, 1], [0, -15, -60]);
  return (
    <motion.div style={{ x, y }}>
      <svg width="140" height="80" viewBox="0 0 140 80" fill="none">
        <g stroke="#2c2c2c" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M15 45 L35 32 L100 32 Q115 32 125 42 Q135 52 125 62 Q115 72 100 72 L35 72 L15 45 Z" strokeDasharray="6 2" />
          <path d="M15 45 L35 32 L100 32 Q115 32 125 42 Q135 52 125 62 Q115 72 100 72 L35 72 L15 45 Z" strokeDasharray="3 4" opacity="0.5" transform="translate(1,1)" />
          <path d="M60 32 L75 14 L90 32" strokeDasharray="2 2" />
          <path d="M35 32 L23 18 L45 26" strokeDasharray="3 1" />
          {/* Contrail – sketchy dashed line */}
          <path d="M-10 42 L20 44" strokeDasharray="4 2" strokeWidth="1" opacity="0.6" />
        </g>
      </svg>
    </motion.div>
  );
};

const SketchHotel = ({ progress }: { progress: any }) => {
  const scale = useTransform(progress, [0, 0.4, 1], [0.6, 1.1, 1]);
  return (
    <motion.div style={{ scale }} className="flex flex-col items-center">
      <svg width="130" height="110" viewBox="0 0 130 110" fill="none">
        <g stroke="#2c2c2c" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <rect x="15" y="35" width="100" height="60" rx="4" strokeDasharray="5 2" />
          <rect x="50" y="62" width="30" height="33" rx="2" strokeDasharray="3 2" />
          <rect x="38" y="48" width="12" height="12" rx="1" strokeDasharray="2 2" />
          <rect x="80" y="48" width="12" height="12" rx="1" strokeDasharray="2 2" />
          <rect x="62" y="72" width="8" height="12" rx="1" strokeDasharray="1 2" />
          <path d="M15 35 L65 12 L115 35" strokeDasharray="4 2" />
          {/* Chimney smoke sketch */}
          <path d="M100 12 L100 5" strokeDasharray="2 1" />
          <circle cx="100" cy="3" r="2" strokeDasharray="1 1" opacity="0.5" />
        </g>
      </svg>
      <div className="text-stone-600 text-xs mt-3 italic">✦ welcome ✦</div>
    </motion.div>
  );
};