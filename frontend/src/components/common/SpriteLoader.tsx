import { useEffect, useState, useMemo, useRef } from 'react';

interface SpriteLoaderProps {
  fps?: number; // Frames per second (Default 12 for smooth line art)
  color?: string; 
}

export default function SpriteLoader({ fps = 12, color = "#3b82f6" }: SpriteLoaderProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Ref to store the timer ID for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Dynamically import ALL SVGs
  // IMPORTANT: Ensure this path matches your actual folder structure
  const svgModules = import.meta.glob('../../assets/frames/*.svg', { 
    eager: true, 
    as: 'url' 
  });

  // 2. Sort and Prepare URLs
  const sortedUrls = useMemo(() => {
    if (!svgModules || Object.keys(svgModules).length === 0) return [];
    
    const entries = Object.entries(svgModules);
    
    // Sort numerically: 1.svg, 2.svg ... 10.svg
    const sortedEntries = entries.sort((a, b) => {
      const numA = parseInt(a[0].match(/(\d+)\.svg/)?.[1] || '0');
      const numB = parseInt(b[0].match(/(\d+)\.svg/)?.[1] || '0');
      return numA - numB;
    });
    
    console.log(`✅ Loaded ${sortedEntries.length} frames.`);
    return sortedEntries.map(([_, url]) => url as string);
  }, []);

  // 3. Preload Images into Browser Cache
  useEffect(() => {
    if (sortedUrls.length === 0) return;

    let loadedCount = 0;
    const totalImages = sortedUrls.length;

    // Helper to handle load completion
    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        setIsLoaded(true);
      }
    };

    // Start preloading
    sortedUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
      
      // Handle successful load
      img.onload = onImageLoad;
      
      // Handle error (still count it so we don't hang forever)
      img.onerror = () => {
        console.warn(`⚠️ Failed to preload frame: ${url}`);
        onImageLoad();
      };
    });
  }, [sortedUrls]);

  // 4. Animation Loop
  useEffect(() => {
    // Only start animation if all frames are loaded
    if (!isLoaded || frames.length === 0) return;

    // Calculate interval time based on FPS
    const intervalTime = 1000 / fps;

    timerRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        // Cycle through frames: 0 -> 1 -> 2 ... -> last -> 0
        return (prev + 1) % frames.length;
      });
    }, intervalTime);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [frames.length, fps, isLoaded]);

  // Update frames state once preloading is done
  useEffect(() => {
    if (isLoaded && sortedUrls.length > 0) {
      setFrames(sortedUrls);
    }
  }, [isLoaded, sortedUrls]);

  // --- LOADING STATE (Skeleton Pulse) ---
  if (!isLoaded || frames.length === 0) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#0f172a]">
        {/* Skeleton Box */}
        <div className="w-64 h-40 bg-slate-800/50 rounded-xl animate-pulse border border-slate-700/50" />
      </div>
    );
  }

  // --- ANIMATION STATE (FULL SCREEN) ---
  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={frames[currentFrameIndex]}
        alt="Plane Animation"
        // object-cover ensures it fills the screen. 
        // If you want to see the whole plane even if it leaves empty space, use 'object-contain'
        className="w-full h-full object-cover drop-shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-opacity duration-75"
        style={{ 
          filter: `drop-shadow(0 0 10px ${color})`,
        }}
      />
    </div>
  );
}
