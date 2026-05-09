import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VehicleLoaderProps {
  message?: string;
  onComplete?: () => void;
  speed?: number;
}

export default function VehicleLoader({ message, onComplete, speed = 1 }: VehicleLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState("");

  // Simulate loading progress
  useEffect(() => {
    const duration = 5000 / speed; // Total load time
    const intervalTime = 50;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete?.(), 500);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete, speed]);

  // Animate the "..." dots
  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(dotTimer);
  }, []);

  // Generate 12 bars for the radial loader
  const bars = Array.from({ length: 12 });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#faf8f2] overflow-hidden">
      
      {/* Optional: Very subtle paper texture (kept minimal) */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` 
        }} 
      />

      <div className="relative z-10 flex flex-col items-center">
        
        {/* --- THE RADIAL LOADER --- */}
        <div className="relative w-24 h-24 mb-8">
          {/* Rotating Container */}
          <motion.div
            className="w-full h-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            {bars.map((_, i) => {
              // Calculate opacity gradient: Darker at top, lighter at bottom
              // We offset the index so the darkest bar is at the top (12 o'clock)
              const offsetIndex = (i + 3) % 12; 
              const opacity = 0.15 + (offsetIndex / 12) * 0.85; // Range from 0.15 to 1.0
              
              return (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-0 w-[6px] h-[18px] -ml-[3px] origin-[50%_48px]"
                  style={{
                    backgroundColor: '#3e2723', // Dark Brown color from your image
                    opacity: opacity,
                    borderRadius: '99px', // Fully rounded caps
                  }}
                  // Optional: Add a slight scale pulse to individual bars for extra life
                  animate={{ scaleY: [1, 1.1, 1] }}
                  transition={{ 
                    duration: 0.8, 
                    repeat: Infinity, 
                    delay: i * 0.05,
                    ease: "easeInOut" 
                  }}
                />
              );
            })}
          </motion.div>
        </div>

        {/* --- TEXT --- */}
        <div className="text-center">
          <motion.h1 
            className="text-4xl font-bold text-[#3e2723] tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ fontFamily: '"Merriweather", "Georgia", serif' }} // Bold Serif font
          >
            Loading{dots}
          </motion.h1>
          
          {/* Optional: Subtitle or Progress Percentage */}
          {progress < 100 && (
            <motion.p 
              className="text-sm text-[#8d6e63] mt-2 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {Math.round(progress)}% Complete
            </motion.p>
          )}
        </div>

      </div>
    </div>
  );
}
