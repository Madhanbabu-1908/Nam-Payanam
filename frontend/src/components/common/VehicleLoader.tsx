import React from 'react';
import { motion } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

export default function VehicleLoader({ message = "Preparing your journey..." }: VehicleLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#efefef] overflow-hidden">
      <div className="relative flex flex-col items-center">
        {/* Speed lines */}
        <motion.div
          className="absolute left-[-90px] top-[38px] h-[4px] w-[48px] rounded-full bg-[#d85a4a]"
          animate={{ x: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
        <motion.div
          className="absolute left-[-80px] top-[95px] h-[4px] w-[60px] rounded-full bg-[#d85a4a]"
          animate={{ x: [0, -14, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />

        {/* Plane */}
        <motion.svg
          width="320"
          height="180"
          viewBox="0 0 320 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="overflow-visible"
        >
          <motion.path
            d="M78 92L104 66C108 62 114 62 119 64L150 82H234C244 82 252 89 252 98C252 107 244 114 234 114H176L136 147C132 150 126 150 122 147L120 145C117 142 117 137 120 134L145 114H109C104 114 100 111 98 106L89 92H78Z"
            stroke="#d85a4a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          <motion.path
            d="M121 64L165 64L198 91"
            stroke="#d85a4a"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.25, duration: 0.8 }}
          />

          <motion.path
            d="M98 106L123 106"
            stroke="#d85a4a"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          />

          <motion.path
            d="M202 96H225"
            stroke="#d85a4a"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          />
        </motion.svg>

        {/* Clouds */}
        <motion.svg
          className="absolute right-[-35px] top-[18px]"
          width="42"
          height="24"
          viewBox="0 0 42 24"
          fill="none"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
        >
          <path
            d="M10 19H30C34.5 19 38 15.8 38 11.8C38 8.2 35.2 5.3 31.5 5C30.4 2.6 27.9 1 25 1C21.4 1 18.4 3.4 17.6 6.6C17 6.2 16.1 6 15.2 6C11.2 6 8 9 8 12.8C8 16.2 10.7 19 14 19"
            stroke="#d85a4a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>

        <motion.svg
          className="absolute right-[10px] bottom-[28px]"
          width="50"
          height="28"
          viewBox="0 0 50 28"
          fill="none"
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 2.8 }}
        >
          <path
            d="M12 22H35C40 22 44 18.5 44 14C44 10 40.8 6.8 36.5 6.4C35.3 3.5 32.3 1.5 28.8 1.5C24.5 1.5 20.9 4.3 20 8.2C19.3 7.8 18.3 7.5 17.2 7.5C12.4 7.5 8.5 11.1 8.5 15.6C8.5 19.2 11.1 22 14.7 22"
            stroke="#d85a4a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>

        {/* Optional text */}
        <p className="mt-6 text-sm font-medium tracking-wide text-[#d85a4a]">
          {message}
        </p>
      </div>
    </div>
  );
}