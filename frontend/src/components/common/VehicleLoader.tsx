import React, { useEffect, useState } from 'react';
import { Bike, Car, Bus, Train, Plane, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VehicleLoader() {
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const vehicles = [
    { Icon: Bike, color: 'text-blue-600', name: 'Bike', bg: 'from-blue-50 to-blue-100', darkBg: 'from-blue-900/20 to-blue-800/20', border: 'border-blue-200 dark:border-blue-800' },
    { Icon: Car, color: 'text-red-600', name: 'Car', bg: 'from-red-50 to-red-100', darkBg: 'from-red-900/20 to-red-800/20', border: 'border-red-200 dark:border-red-800' },
    { Icon: Bus, color: 'text-yellow-600', name: 'Bus', bg: 'from-yellow-50 to-yellow-100', darkBg: 'from-yellow-900/20 to-yellow-800/20', border: 'border-yellow-200 dark:border-yellow-800' },
    { Icon: Train, color: 'text-green-600', name: 'Train', bg: 'from-green-50 to-green-100', darkBg: 'from-green-900/20 to-green-800/20', border: 'border-green-200 dark:border-green-800' },
    { Icon: Plane, color: 'text-indigo-600', name: 'Flight', bg: 'from-indigo-50 to-indigo-100', darkBg: 'from-indigo-900/20 to-indigo-800/20', border: 'border-indigo-200 dark:border-indigo-800' }
  ];

  useEffect(() => {
    // Cycle through vehicles
    const vehicleInterval = setInterval(() => {
      setVehicleIndex((prev) => (prev + 1) % vehicles.length);
    }, 1200);

    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0; // Reset loop
        return prev + 2; 
      });
    }, 50);

    return () => {
      clearInterval(vehicleInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const CurrentVehicle = vehicles[vehicleIndex].Icon;
  const currentData = vehicles[vehicleIndex];

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-700 overflow-hidden relative">
      
      {/* Background Decorative Blobs */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className={`absolute top-[-10%] left-[-10%] w-96 h-96 bg-gradient-to-r ${currentData.bg} rounded-full blur-3xl opacity-30 dark:opacity-10`}
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className={`absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-gradient-to-l ${currentData.bg} rounded-full blur-3xl opacity-30 dark:opacity-10`}
      />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Animated Icon Card */}
        <div className="relative mb-8">
          {/* Glow Effect behind icon */}
          <motion.div 
            initial={{ opacity: 0.5, scale: 0.8 }}
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 rounded-full blur-xl bg-gradient-to-tr ${currentData.bg}`}
          />

          {/* The Icon Box */}
          <motion.div
            key={vehicleIndex} // Triggers animation on change
            initial={{ y: 20, opacity: 0, rotate: -10 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`relative p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border ${currentData.border} backdrop-blur-sm`}
          >
            <CurrentVehicle size={64} className={`${currentData.color} drop-shadow-sm`} strokeWidth={1.5} />
            
            {/* Small badge indicating mode */}
            <div className="absolute -top-3 -right-3 bg-white dark:bg-slate-700 rounded-full p-1.5 shadow-lg border border-slate-100 dark:border-slate-600">
              <MapPin size={16} className="text-slate-400" />
            </div>
          </motion.div>
        </div>

        {/* Text Section */}
        <div className="text-center space-y-2">
          <motion.h2 
            key={vehicleIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight"
          >
            Nam Payanam
          </motion.h2>
          
          <motion.p 
            key={vehicleIndex + "status"}
            initial={{ opacity: 0 }}            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-2"
          >
            <span className={`w-2 h-2 rounded-full ${currentData.color.replace('text-', 'bg-')} animate-pulse`} />
            Preparing your <span className={`font-bold ${currentData.color}`}>{currentData.name}</span> journey...
          </motion.p>
        </div>

        {/* Professional Progress Bar (Road Style) */}
        <div className="mt-10 w-64 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
          <motion.div 
            className={`h-full bg-gradient-to-r ${currentData.bg.replace('from-', 'from-').replace('to-', 'to-')}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
          {/* Moving stripes effect on the bar */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xIDNoMXYxSDFWM3ptMiAxaDF2MUgzVjR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvc3ZnPg==')] opacity-30 animate-[spin_1s_linear_infinite]" style={{ backgroundSize: '4px 4px' }}></div>
        </div>
        
        <p className="mt-2 text-xs text-slate-400 font-mono">{progress}% Loaded</p>
      </div>
    </div>
  );
}