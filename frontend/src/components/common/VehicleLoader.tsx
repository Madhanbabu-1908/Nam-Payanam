import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VehicleLoaderProps {
  message?: string;
  onComplete?: () => void;
  duration?: number; // Total loading time in ms
}

export default function VehicleLoader({ message, onComplete, duration = 4000 }: VehicleLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(nextProgress);

      if (nextProgress < 100) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => onComplete?.(), 800);
      }
    };

    requestAnimationFrame(animate);
  }, [duration, onComplete]);

  // Generate 12 bars
  const totalBars = 12;
  const bars = Array.from({ length: totalBars });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAFAF9] overflow-hidden selection:bg-none">
      
      {/* Subtle Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-50/50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-10">
        
        {/* --- THE LOADER RING --- */}
        <div className="relative w-28 h-28">
          {/* 
            We use a single rotating container for smoothness.
            The 'animate' prop handles the continuous rotation.
          */}
          <motion.div
            className="w-full h-full relative"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "linear",
              type: "tween" 
            }}
          >
            {bars.map((_, i) => {
              // Calculate opacity gradient
              // We want the bar at the top (index 0 after rotation offset) to be darkest
              // and the one at the bottom to be lightest.
              // Since the container rotates, we staticly assign opacities that create a trail.
              const normalizedIndex = (i + 9) % totalBars; 
              const opacity = 0.1 + (normalizedIndex / (totalBars - 1)) * 0.9;
              
              // Calculate slight scale variation for "breathing" effect
              const scale = 0.8 + (normalizedIndex / (totalBars - 1)) * 0.2;

              return (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-0 origin-[50%_56px]"
                  style={{
                    width: '6px',
                    height: '24px',
                    marginLeft: '-3px', // Center the 6px width
                    backgroundColor: '#44403C', // Stone-800: A premium dark grey/brown
                    borderRadius: '9999px',
                    opacity: opacity,
                    willChange: "transform, opacity",
                  }}
                  // Individual bar pulse for extra life
                  animate={{ 
                    scaleY: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.05,
                    ease: "easeInOut",
                    repeatType: "reverse"
                  }}
                />
              );
            })}
          </motion.div>
          
          {/* Optional: Central Dot for focus (adds a nice anchor point) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              className="w-1.5 h-1.5 bg-stone-800 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* --- TYPOGRAPHY --- */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-baseline gap-1"
          >
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              Loading
            </h1>
            <span className="flex gap-0.5 h-6 items-end">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 bg-stone-400 rounded-full"
                  animate={{ 
                    opacity: [0.2, 1, 0.2],
                    y: [0, -4, 0]
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </span>
          </motion.div>

          {/* Progress Percentage - Monospace for stability */}
          <motion.p 
            className="text-xs font-medium tracking-widest text-stone-500 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(progress)}%
          </motion.p>
        </div>

      </div>
    </div>
  );
}
