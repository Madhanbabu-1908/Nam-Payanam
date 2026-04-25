import React, { useEffect, useState } from 'react';

const VEHICLES = [
  { emoji: '🏍️', name: 'Bike',   color: '#3B82F6', msg: 'Fuelling up the bike…' },
  { emoji: '🚗', name: 'Car',    color: '#EF4444', msg: 'Loading your car…' },
  { emoji: '🚌', name: 'Bus',    color: '#F59E0B', msg: 'All aboard the bus…' },
  { emoji: '🚂', name: 'Train',  color: '#10B981', msg: 'Boarding the train…' },
  { emoji: '✈️', name: 'Flight', color: '#8B5CF6', msg: 'Taking off soon…' },
];

export default function VehicleLoader() {
  const [idx, setIdx] = useState(()=>Math.floor(Math.random()*VEHICLES.length));
  const v = VEHICLES[idx];

  useEffect(()=>{
    const t = setInterval(()=>setIdx(i=>(i+1)%VEHICLES.length), 1200);
    return ()=>clearInterval(t);
  },[]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[var(--bg)] overflow-hidden">
      <style>{`
        @keyframes drive { from{transform:translateX(-100px)} to{transform:translateX(100px)} }
        @keyframes road  { from{background-position:0 0} to{background-position:-80px 0} }
        @keyframes fadeSwap { 0%{opacity:0;transform:scale(.8)} 30%{opacity:1;transform:scale(1)} 80%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(.8)} }
        .vehicle-anim { animation: drive 1.2s ease-in-out infinite alternate; }
        .road-anim    { animation: road 0.5s linear infinite;
          background: repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,.3) 24px,rgba(255,255,255,.3) 40px);
          background-size: 80px 4px; }
        .swap-anim    { animation: fadeSwap 1.2s ease-in-out; }
      `}</style>

      {/* Vehicle stage */}
      <div className="relative w-64 mb-8">
        {/* Road */}
        <div className="w-full h-2 rounded-full mb-2" style={{background:v.color,opacity:.2}}>
          <div className="road-anim w-full h-full rounded-full" style={{background:'transparent'}}/>
        </div>
        {/* Vehicle */}
        <div className="flex justify-center vehicle-anim swap-anim" key={idx}>
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full blur-xl opacity-40" style={{background:v.color,transform:'scale(1.5)'}}/>
            {/* Card */}
            <div className="relative w-24 h-24 rounded-3xl border-4 border-white dark:border-slate-700 shadow-2xl flex items-center justify-center"
              style={{background:`${v.color}22`}}>
              <span className="text-5xl">{v.emoji}</span>
            </div>
          </div>
        </div>
        {/* Shadow */}
        <div className="w-16 h-2 rounded-full mx-auto mt-2 opacity-20" style={{background:v.color,filter:'blur(4px)'}}/>
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5 swap-anim" key={`txt-${idx}`}>
        <h2 className="text-xl font-display font-bold text-[var(--text)]">Loading your adventure</h2>
        <p className="text-sm text-[var(--muted)]">{v.msg}</p>
      </div>

      {/* Dot progress */}
      <div className="flex gap-2 mt-8">
        {VEHICLES.map((_,i)=>(
          <div key={i} className={`rounded-full transition-all duration-300 ${i===idx?'w-6 h-3':'w-3 h-3'}`}
            style={{background:i===idx?v.color:'var(--border)'}}/>
        ))}
      </div>

      {/* App name */}
      <p className="font-tamil text-[var(--muted)] text-xs mt-8">நம் பயணம் · Nam Payanam</p>
    </div>
  );
}
