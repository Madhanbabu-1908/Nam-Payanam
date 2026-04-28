import { motion } from "framer-motion";

interface VehicleLoaderProps {
  message?: string;
  step?: number; // 0,1,2 for different loading stages
}

export default function VehicleLoader({ message, step = 0 }: VehicleLoaderProps) {
  const loadingMessages = [
    "Finding the best route 🗺️",
    "Checking traffic 🚦",
    "Almost there ⏳",
  ];
  const displayMessage = message || loadingMessages[step] || "Planning your trip...";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#eef2ff] to-[#f9fafb] overflow-hidden">

      {/* Map-like background (subtle grid) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Dashed route line */}
      <svg width="300" height="200" viewBox="0 0 300 200" className="mb-8">
        <path
          d="M30 150 Q80 50 150 80 T270 90"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeDasharray="8 8"
        />
        {/* Moving car along the path */}
        <motion.circle
          r="8"
          fill="#ef4444"
          stroke="white"
          strokeWidth="2"
          initial={{ offsetDistance: "0%" }}
          animate={{ offsetDistance: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ offsetPath: "path('M30 150 Q80 50 150 80 T270 90')" }}
        />
      </svg>

      {/* Destination pin pulse */}
      <motion.div
        className="relative mb-6"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" strokeWidth="1">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      </motion.div>

      {/* Dynamic message with fade in/out */}
      <motion.p
        key={displayMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="text-base text-gray-700 font-medium text-center px-4"
      >
        {displayMessage}
      </motion.p>

      {/* Optional small loading dots */}
      <div className="flex gap-1 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-blue-500 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}