import { useEffect, useState, useMemo } from 'react';

interface SpriteLoaderProps {
  fps?: number; // Frames per second
  color?: string; 
}

export default function SpriteLoader({ fps = 12, color = "#3b82f6" }: SpriteLoaderProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Dynamically import ALL SVGs
  // Note: Ensure this path matches your actual folder structure
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
    
    return sortedEntries.map(([_, url]) => url as string);
  }, []);

  // 3. Preload Images into Browser Cache
  useEffect(() => {
    if (sortedUrls.length === 0) return;

    let loadedCount = 0;
    const totalImages = sortedUrls.length;

    sortedUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setIsLoaded(true);
        }
      };
      img.onerror = () => {
        console.error(`Failed to preload image: ${url}`);
        loadedCount++; // Count it anyway to avoid infinite hang
        if (loadedCount === totalImages) {
          setIsLoaded(true);
        }
      };
    });
  }, [sortedUrls]);

  // 4. Animation Loop
  useEffect(() => {
    if (!isLoaded || frames.length === 0) return;

    const intervalTime = 1000 / fps;
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [frames.length, fps, isLoaded]);

  // Update frames state once preloading is done
  useEffect(() => {
    if (isLoaded && sortedUrls.length > 0) {
      setFrames(sortedUrls);
    }
  }, [isLoaded, sortedUrls]);

  // Loading State
  if (!isLoaded || frames.length === 0) {
    return (
      <div className="w-[220px] h-[140px] bg-slate-800/50 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-500">Loading Assets...</span>
      </div>
    );
  }

  return (
    <div className="relative w-[220px] h-[140px] overflow-hidden">
      {/* 
         SINGLE IMG TAG WITHOUT KEY.
         This prevents React from unmounting/remounting the element.
         We simply swap the src attribute.
      */}
      <img
        src={frames[currentFrameIndex]}
        alt="Plane Animation"
        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-opacity duration-75"
        style={{ 
          filter: `drop-shadow(0 0 5px ${color})`,
        }}
      />
    </div>
  );
}
