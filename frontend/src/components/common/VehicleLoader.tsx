import { motion } from "framer-motion";

interface VehicleLoaderProps {
  message?: string;
}

export default function VehicleLoader({ message }: VehicleLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f3f4f6] overflow-hidden">

      {/* Plane */}
      <motion.div
        animate={{ y: [0, -2, 0] }} // subtle vibration
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut",
        }}
        className="relative"
      >
        <svg
          width="220"
          height="120"
          viewBox="0 0 220 120"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Plane Body */}
          <path d="M50 60 L80 40 L150 40 Q165 40 175 50 Q185 60 175 70 Q165 80 150 80 L80 80 L50 60 Z" />

          {/* Wing */}
          <path d="M100 40 L120 25 L135 40" />

          {/* Tail */}
          <path d="M50 60 L38 48 L60 52" />

          {/* Bottom fin */}
          <path d="M75 80 L60 95 L90 85" />

          {/* Speed Lines */}
          <motion.path
            d="M20 50 L40 50"
            strokeOpacity="0.6"
            animate={{ x: [-10, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
          <motion.path
            d="M10 65 L35 65"
            strokeOpacity="0.6"
            animate={{ x: [-10, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
          <motion.path
            d="M25 40 L45 40"
            strokeOpacity="0.4"
            animate={{ x: [-10, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        </svg>
      </motion.div>

      {/* Optional Message */}
      {message && (
        <p className="mt-6 text-sm text-gray-500 font-medium tracking-wide">
          {message}
        </p>
      )}

      {/* Cloud 1 */}
      <motion.div
        className="absolute right-24 top-28"
        animate={{ x: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <svg
          width="50"
          height="25"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
        >
          <path d="M10 18 Q15 8 25 12 Q30 5 40 12 Q45 15 40 18 Z" />
        </svg>
      </motion.div>

      {/* Cloud 2 */}
      <motion.div
        className="absolute right-40 bottom-24"
        animate={{ x: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
      >
        <svg
          width="50"
          height="25"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
        >
          <path d="M10 18 Q15 8 25 12 Q30 5 40 12 Q45 15 40 18 Z" />
        </svg>
      </motion.div>
    </div>
  );
}