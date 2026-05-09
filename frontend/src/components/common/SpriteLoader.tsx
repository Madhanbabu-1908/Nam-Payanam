import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface SpriteLoaderProps {
  fps?: number; // Frames per second (default 12)
  color?: string; // Stroke color override
}

export default function SpriteLoader({ fps = 12, color = "#3b82f6" }: SpriteLoaderProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // 1. Dynamically import ALL SVGs in the folder using Vite's glob
  // This automatically finds every .svg file in src/assets/plane-frames/
  const svgModules = import.meta.glob('../../assets/plane-frames/*.svg', { 
    eager: true, 
    as: 'url' 
  });

  // 2. Convert the object result into a sorted Array of URLs
  // We sort numerically to ensure 1.svg comes before 10.svg
  const frames = useMemo(() => {
    if (!svgModules) return [];
    
    const entries = Object.entries(svgModules);
    
    // Sort by filename number
    const sortedEntries = entries.sort((a, b) => {
      // Extract number from filename (e.g., "1.svg" -> 1)
      const numA = parseInt(a[0].match(/(\d+)\.svg/)?.[1] || '0');
      const numB = parseInt(b[0].match(/(\d+)\.svg/)?.[1] || '0');
      return numA - numB;
    });
    
    return sortedEntries.map(([_, url]) => url as string);
  }, []);

  // 3. Set ready state once frames are loaded
  useEffect(() => {
    if (frames.length > 0) {
      setIsReady(true);
    }
  }, [frames]);

  // 4. Animation Loop
  useEffect(() => {
    if (!isReady || frames.length === 0) return;

    const intervalTime = 1000 / fps;
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [frames.length, fps, isReady]);

  // Loading placeholder while assets bundle
  if (!isReady || frames.length === 0) {
    return <div className="w-[220px] h-[140px] bg-slate-800/50 rounded-lg animate-pulse" />;
  }

  return (
    <div className="relative w-[220px] h-[140px]">
      <motion.img
        key={currentFrameIndex}
        src={frames[currentFrameIndex]}
        alt="Plane Animation Frame"
        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        style={{ 
          filter: `drop-shadow(0 0 5px ${color})`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.05 }} // Fast fade between frames for smoothness
      />
    </div>
  );
}
