import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface SpriteLoaderProps {
  fps?: number;
  color?: string;
}

export default function SpriteLoader({ fps = 12, color = "#3b82f6" }: SpriteLoaderProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Dynamically import ALL SVGs in the folder
  // IMPORTANT: Ensure the path matches your actual folder structure
  const svgModules = import.meta.glob('../../assets/plane-frames/*.svg', { 
    eager: true, 
    as: 'url' 
  });

  // 2. Convert to sorted Array
  const frames = useMemo(() => {
    if (!svgModules || Object.keys(svgModules).length === 0) {
      console.error("❌ No SVGs found in ../../assets/plane-frames/");
      setError("No SVGs found. Check folder path.");
      return [];
    }
    
    const entries = Object.entries(svgModules);
    
    // Sort numerically: 1.svg, 2.svg ... 10.svg
    const sortedEntries = entries.sort((a, b) => {
      const numA = parseInt(a[0].match(/(\d+)\.svg/)?.[1] || '0');
      const numB = parseInt(b[0].match(/(\d+)\.svg/)?.[1] || '0');
      return numA - numB;
    });
    
    console.log(`✅ Found ${sortedEntries.length} frames.`);
    return sortedEntries.map(([_, url]) => url as string);
  }, []);

  // 3. Set ready state
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

  // --- DEBUG UI ---
  if (error) {
    return (
      <div className="text-red-500 text-xs p-4 bg-red-900/20 rounded border border-red-500/50">
        <p>⚠️ Error: {error}</p>
        <p className="mt-2">Check console logs for details.</p>
      </div>
    );
  }

  if (!isReady) {
    return <div className="w-[220px] h-[140px] bg-slate-800/50 rounded-lg animate-pulse flex items-center justify-center text-xs text-slate-500">Loading Assets...</div>;
  }

  if (frames.length === 0) {
    return <div className="text-yellow-500 text-xs">No frames loaded.</div>;
  }

  return (
    <div className="relative w-[220px] h-[140px]">
      {/* 
         We use img tag. 
         If SVGs are transparent, they will show against the dark bg.
         If they have white bg, they will look like white boxes.
      */}
      <motion.img
        key={currentFrameIndex}
        src={frames[currentFrameIndex]}
        alt={`Frame ${currentFrameIndex + 1}`}
        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        style={{ 
          filter: `drop-shadow(0 0 5px ${color})`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.05 }}
        onError={(e) => console.error("Failed to load frame:", frames[currentFrameIndex])}
      />
      
      {/* Optional: Show current frame index for debugging */}
      {/* <div className="absolute bottom-0 right-0 text-[10px] text-white/50">{currentFrameIndex + 1}/{frames.length}</div> */}
    </div>
  );
}
