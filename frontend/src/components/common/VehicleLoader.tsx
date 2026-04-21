import React, { useEffect, useState } from 'react';
import { Bike, Car, Bus, Train, Plane } from 'lucide-react';

export default function VehicleLoader() {
  const [vehicleIndex, setVehicleIndex] = useState(0);
  
  const vehicles = [
    { Icon: Bike, color: 'text-blue-500', name: 'Bike' },
    { Icon: Car, color: 'text-red-500', name: 'Car' },
    { Icon: Bus, color: 'text-yellow-600', name: 'Bus' },
    { Icon: Train, color: 'text-green-600', name: 'Train' },
    { Icon: Plane, color: 'text-indigo-600', name: 'Flight' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setVehicleIndex((prev) => (prev + 1) % vehicles.length);
    }, 800); // Change every 800ms
    return () => clearInterval(interval);
  }, []);

  const CurrentVehicle = vehicles[vehicleIndex].Icon;
  const currentColor = vehicles[vehicleIndex].color;
  const currentName = vehicles[vehicleIndex].name;

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="relative mb-8">
        {/* Pulsing Background */}
        <div className="absolute inset-0 bg-indigo-200 dark:bg-indigo-900/40 rounded-full animate-ping opacity-30"></div>
        
        {/* Vehicle Icon Container */}
        <div className="relative z-10 p-8 bg-white dark:bg-slate-800 rounded-full shadow-2xl border-4 border-slate-100 dark:border-slate-700 transform transition-all duration-500 hover:scale-110">
          <CurrentVehicle size={64} className={`${currentColor}`} />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 animate-pulse">
        Loading your adventure...
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Preparing your {currentName} 🚀
      </p>
    </div>
  );
}