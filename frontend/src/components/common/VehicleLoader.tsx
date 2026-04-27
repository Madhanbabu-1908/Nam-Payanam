import React, { useEffect, useState } from 'react';
import { Bike, Car, Bus, Train, Plane } from 'lucide-react';

export default function VehicleLoader() {
  const [vehicleIndex, setVehicleIndex] = useState(0);
  
  const vehicles = [
    { Icon: Bike, color: 'text-blue-600', name: 'Bike', bg: 'bg-blue-50' },
    { Icon: Car, color: 'text-red-600', name: 'Car', bg: 'bg-red-50' },
    { Icon: Bus, color: 'text-yellow-600', name: 'Bus', bg: 'bg-yellow-50' },
    { Icon: Train, color: 'text-green-600', name: 'Train', bg: 'bg-green-50' },
    { Icon: Plane, color: 'text-indigo-600', name: 'Flight', bg: 'bg-indigo-50' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setVehicleIndex((prev) => (prev + 1) % vehicles.length);
    }, 1000); // Slower change for better visibility
    return () => clearInterval(interval);
  }, []);

  const CurrentVehicle = vehicles[vehicleIndex].Icon;
  const currentColor = vehicles[vehicleIndex].color;
  const currentName = vehicles[vehicleIndex].name;
  const currentBg = vehicles[vehicleIndex].bg;

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 transition-colors duration-500">
      
      {/* Animated Container */}
      <div className="relative mb-8">
        {/* Pulsing Ring */}
        <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-indigo-400"></div>
        
        {/* Vehicle Card */}
        <div className={`relative z-10 p-6 ${currentBg} dark:bg-slate-800 rounded-3xl shadow-2xl border-4 border-white dark:border-slate-700 transform transition-all duration-500 hover:scale-105`}>
          <CurrentVehicle size={72} className={`${currentColor}`} />
        </div>
      </div>
      
      {/* Text */}
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
        Loading your adventure...
      </h2>
      <p className="text-base text-slate-600 dark:text-slate-300 font-medium">
        Preparing your <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentName}</span> 🚀
      </p>

      {/* Progress Dots */}
      <div className="flex gap-2 mt-8">
        {vehicles.map((_, idx) => (
          <div 
            key={idx} 
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              idx === vehicleIndex ? 'bg-indigo-600 scale-125' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}