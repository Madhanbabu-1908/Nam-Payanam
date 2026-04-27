import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const ANIMATIONS = [
  { emoji: "🚗", label: "Loading", color: "#FF6B35" },
  { emoji: "🚌", label: "On the way", color: "#0EA5E9" },
  { emoji: "🏍️", label: "Revving up", color: "#10B981" },
  { emoji: "🚆", label: "All aboard", color: "#8B5CF6" },
  { emoji: "✈️", label: "Taking off", color: "#F59E0B" },
];

export default function LoadingScreen({ message }: { message?: string }) {
  const [anim] = useState(
    () => ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)]
  );
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white z-50 overflow-hidden">
      
      {/* 🌌 Background gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-black to-purple-900/30 blur-2xl opacity-60" />

      {/* 🚗 Moving vehicle */}
      <div className="relative w-72 h-28 mb-10 overflow-hidden">
        
        {/* Road */}
        <div className="absolute bottom-0 w-full h-12 rounded-xl bg-gradient-to-b from-gray-700 to-gray-900 shadow-inner" />

        {/* Road dashes */}
        <motion.div
          className="absolute bottom-5 left-0 right-0 flex gap-4 px-2"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-8 h-1.5 bg-yellow-400 rounded-full opacity-80" />
          ))}
        </motion.div>

        {/* Vehicle */}
        <motion.div
          initial={{ x: "-20%" }}
          animate={{ x: "120%" }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
          className="absolute bottom-8 text-4xl"
          style={{
            filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))",
          }}
        >
          {anim.emoji}
        </motion.div>

        {/* Floating elements */}
        <motion.div
          className="absolute bottom-12 right-6 text-xl opacity-50"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          🌴
        </motion.div>

        <motion.div
          className="absolute bottom-14 right-16 text-lg opacity-40"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          🌳
        </motion.div>
      </div>

      {/* ✨ Brand */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold tracking-wide"
        style={{ color: anim.color }}
      >
        Nam Payanam
      </motion.h1>

      {/* 💬 Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-gray-400 mt-2 font-mono"
      >
        {message || anim.label}
        {dots}
      </motion.p>
    </div>
  );
}