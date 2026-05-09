import React from 'react';
import { motion } from 'framer-motion';
import SpriteLoader from './SpriteLoader';

// Define props interface to accept optional message for compatibility
interface VehicleLoaderProps {
  message?: string; 
}

export default function VehicleLoader({ message }: VehicleLoaderProps) {
  return (
    // Full Screen Container
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a] overflow-hidden w-full h-full">
      
      {/* 1. Background Glow (Ambient Light) */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none" 
      />

      {/* 2. The Animation Layer (Full Screen) */}
      <div className="absolute inset-0 z-0">
        <SpriteLoader fps={12} color="#3b82f6" />
      </div>

      {/* 
         Note: Text and Progress Bar are intentionally removed 
         as per your request for a clean, full-screen animation.
         The 'message' prop is accepted but not used in the UI.
      */}

    </div>
  );
}
