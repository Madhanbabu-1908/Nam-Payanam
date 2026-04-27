import { useEffect, useState } from 'react';

const ANIMATIONS = [
  { emoji: '🚗', label: 'Loading…', color: '#FF6B35' },
  { emoji: '🚌', label: 'On the way…', color: '#0EA5E9' },
  { emoji: '🏍️', label: 'Revving up…', color: '#10B981' },
  { emoji: '🚆', label: 'All aboard…', color: '#8B5CF6' },
  { emoji: '✈️', label: 'Taking off…', color: '#F59E0B' },
];

export default function LoadingScreen({ message }: { message?: string }) {
  const [anim] = useState(() => ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)]);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--bg)] z-50">
      {/* Road */}
      <div className="relative w-64 h-24 mb-6 overflow-hidden">
        {/* Road surface */}
        <div className="absolute bottom-0 left-0 right-0 h-10 rounded-xl"
          style={{ background: 'linear-gradient(180deg, #374151 0%, #1F2937 100%)' }}/>
        {/* Center dashes */}
        <div className="absolute bottom-4 left-0 right-0 flex gap-3 items-center px-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-1.5 w-6 rounded-full bg-amber-400 opacity-80 animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}/>
          ))}
        </div>
        {/* Vehicle */}
        <div className="absolute bottom-8 animate-[drive_1.5s_ease-in-out_infinite]"
          style={{ fontSize: 36, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
          {anim.emoji}
        </div>
        {/* Trees */}
        <div className="absolute bottom-10 right-4 text-2xl opacity-60">🌴</div>
        <div className="absolute bottom-10 right-16 text-lg opacity-40">🌳</div>
      </div>

      <p className="font-display font-black text-xl" style={{ color: anim.color }}>
        Nam Payanam
      </p>
      <p className="text-[var(--muted)] text-sm mt-1 font-mono">
        {message || anim.label}{dots}
      </p>

      <style>{`
        @keyframes drive {
          0%   { left: -10%; }
          50%  { left: 42%; }
          100% { left: -10%; }
        }
      `}</style>
    </div>
  );
}
