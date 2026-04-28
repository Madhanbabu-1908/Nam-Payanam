import React from 'react';
import { motion } from 'framer-motion';

interface VehicleLoaderProps {
  message?: string;
}

export default function VehicleLoader({
  message = 'Preparing your journey...',
}: VehicleLoaderProps) {
  const stroke = '#d85a4a';
  const bg = '#efefef';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ backgroundColor: bg }}>
      <div className="relative flex flex-col items-center">
        {/* Whole illustration */}
        <motion.div
          className="relative"
          animate={{ x: [0, 8, 0], y: [0, -1, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Rear speed lines */}
          <motion.div
            className="absolute left-[-70px] top-[40px] h-[4px] w-[42px] rounded-full"
            style={{ backgroundColor: stroke }}
            animate={{ x: [0, -18], opacity: [1, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute left-[-105px] top-[42px] h-[4px] w-[10px] rounded-full"
            style={{ backgroundColor: stroke }}
            animate={{ x: [0, -12], opacity: [0.8, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear', delay: 0.15 }}
          />
          <motion.div
            className="absolute left-[-62px] top-[96px] h-[4px] w-[48px] rounded-full"
            style={{ backgroundColor: stroke }}
            animate={{ x: [0, -20], opacity: [1, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear', delay: 0.1 }}
          />
          <motion.div
            className="absolute left-[-92px] top-[98px] h-[4px] w-[8px] rounded-full"
            style={{ backgroundColor: stroke }}
            animate={{ x: [0, -14], opacity: [0.8, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear', delay: 0.25 }}
          />

          {/* Plane */}
          <svg
            width="320"
            height="170"
            viewBox="0 0 320 170"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
          >
            {/* Main body */}
            <motion.path
              d="M74 91L98 68C101 64 107 63 112 63H153L191 63C196 63 200 65 204 68L230 88H245C253 88 259 94 259 102C259 110 253 116 245 116H177L135 150C132 153 127 153 123 153H117C113 153 111 149 114 146L146 116H107C101 116 96 113 93 108L84 95H77C74 95 72 93 74 91Z"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />

            {/* Top wings */}
            <motion.path
              d="M130 63L170 63L202 88"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.15, duration: 0.7 }}
            />

            <motion.path
              d="M115 63L146 88"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            />

            {/* Tail cut */}
            <motion.path
              d="M88 95L117 95"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            />

            {/* Window dash */}
            <motion.path
              d="M206 100H230"
              stroke={stroke}
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.45, duration: 0.35 }}
            />
          </svg>

          {/* Cloud top */}
          <motion.svg
            className="absolute right-[-8px] top-[14px]"
            width="46"
            height="28"
            viewBox="0 0 46 28"
            fill="none"
            animate={{ y: [0, -4, 0], opacity: [0.95, 1, 0.95] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path
              d="M14 22H31C36 22 40 18.5 40 14C40 9.8 36.7 6.6 32.5 6.4C31.5 3.6 28.7 1.7 25.4 1.7C21.3 1.7 18 4.3 17.1 8C16.4 7.6 15.5 7.4 14.6 7.4C10.6 7.4 7.5 10.4 7.5 14.2C7.5 18.5 10.2 22 14 22Z"
              stroke={stroke}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>

          {/* Cloud bottom */}
          <motion.svg
            className="absolute right-[28px] bottom-[8px]"
            width="52"
            height="30"
            viewBox="0 0 52 30"
            fill="none"
            animate={{ y: [0, 4, 0], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          >
            <path
              d="M15 24H36C41.2 24 45.5 20.1 45.5 15.3C45.5 10.9 42 7.5 37.5 7.2C36.4 4.2 33.2 2.1 29.4 2.1C24.8 2.1 21 5.2 20 9.4C19.2 8.9 18.2 8.6 17.1 8.6C12.5 8.6 8.8 12.1 8.8 16.4C8.8 20.6 11.7 24 15 24Z"
              stroke={stroke}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.div>

        {/* Text */}
        <motion.p
          className="mt-6 text-sm font-medium tracking-[0.08em]"
          style={{ color: stroke }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}