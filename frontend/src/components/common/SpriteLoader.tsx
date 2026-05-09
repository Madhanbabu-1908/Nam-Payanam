import { useEffect, useState, useMemo, useRef } from 'react';

interface SpriteLoaderProps {
  fps?: number;
  color?: string; 
}

export default function SpriteLoader({ fps = 12, color = "#FF6B35" }: SpriteLoaderProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Dynamically import ALL SVGs
  const svgModules = import.meta.glob('../../assets/frames/*.svg', { 
    eager: true, 
    as: 'url' 
  });

  // 2. Smart Sorting & Grouping Logic
  const sortedUrls = useMemo(() => {
    if (!svgModules || Object.keys(svgModules).length === 0) return [];
    
    let entries = Object.entries(svgModules);

    // Define the order you want: Plane -> Car -> Building
    // Adjust these keywords to match your filenames exactly
    const orderPriority = ['plane', 'car', 'building', 'hotel']; 

    // Custom Sort Function
    entries.sort((a, b) => {
      const pathA = a[0].toLowerCase();
      const pathB = b[0].toLowerCase();

      // 1. Check Priority (Plane first, then Car, etc.)
      const priorityA = orderPriority.findIndex(k => pathA.includes(k));
      const priorityB = orderPriority.findIndex(k => pathB.includes(k));

      if (priorityA !== -1 && priorityB !== -1) {
        // If both match a category, sort by category first
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        // If same category, sort by number inside filename
        const numA = parseInt(pathA.match(/(\d+)/)?.[1] || '0');
        const numB = parseInt(pathB.match(/(\d+)/)?.[1] || '0');
        return numA - numB;
      }

      // Fallback: Just sort by number if no keywords match
      const numA = parseInt(pathA.match(/(\d+)/)?.[1] || '0');
      const numB = parseInt(pathB.match(/(\d+)/)?.[1] || '0');
      return numA - numB;
    });
    
    console.log(`✅ Sorted ${entries.length} frames into correct sequence.`);
    return entries.map(([_, url]) => url as string);
  }, []);

  // 3. Preload Images
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
        loadedCount++; 
        if (loadedCount === totalImages) setIsLoaded(true);
      };
    });
  }, [sortedUrls]);

  // 4. Animation Loop
  useEffect(() => {
    if (!isLoaded || frames.length === 0) return;

    const intervalTime = 1000 / fps;

    timerRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [frames.length, fps, isLoaded]);

  useEffect(() => {
    if (isLoaded && sortedUrls.length > 0) {
      setFrames(sortedUrls);
    }
  }, [isLoaded, sortedUrls]);

  if (!isLoaded || frames.length === 0) {
    return <div className="w-full h-full bg-white flex items-center justify-center"><div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"/></div>;
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-white">
      <img
        src={frames[currentFrameIndex]}
        alt="Loading Animation"
        className="w-full h-full object-contain p-8"
        style={{ filter: `drop-shadow(0 4px 6px rgba(0,0,0,0.1))` }}
      />
    </div>
  );
}
