import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../utils/api';
import { Spinner } from '../ui/index.jsx';

const ACTIONS = [
  { id:'food',     icon:'🍽️', label:'Suggest food stops',   ta:'உணவு இடங்கள்',   prompt:'Suggest the best local food stops and restaurants for this trip route. Be specific with names.' },
  { id:'cost',     icon:'💰', label:'Reduce trip cost',      ta:'செலவு குறை',     prompt:'How can we reduce the total trip cost? Give 5 specific actionable tips for this route.' },
  { id:'day2',     icon:'📅', label:'Optimise Day 2',        ta:'2ம் நாள் மேம்படு', prompt:'How can we optimise Day 2 of our itinerary? Suggest better timing and must-see spots.' },
  { id:'hotel',    icon:'🏨', label:'Best hotels on route',  ta:'சிறந்த ஹோட்டல்கள்', prompt:'Recommend the best hotels along this route with approximate price ranges. Be specific.' },
  { id:'weather',  icon:'🌦️', label:'Weather tips',          ta:'வானிலை குறிப்புகள்', prompt:'What weather conditions should we expect and what should we pack for this route?' },
  { id:'fuel',     icon:'⛽', label:'Fuel stop locations',   ta:'எரிபொருள் நிலையங்கள்', prompt:'Where are the best petrol bunks / fuel stops along this route? Any 24hr stations?' },
  { id:'emergency',icon:'🚑', label:'Emergency contacts',    ta:'அவசர தொடர்பு',   prompt:'What are the key emergency contacts, hospitals and police stations along this route?' },
  { id:'tips',     icon:'💡', label:'Local insider tips',    ta:'உள்ளூர் குறிப்புகள்', prompt:'Give us insider tips for this trip that most tourists miss. Local food, timings, hidden gems.' },
];

function formatMsg(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/\n/g,'<br/>');
}

export default function AIAssistant({ trip, session, lang='en' }) {
  const [messages, setMessages] = useState([{
    role:'assistant',
    content: lang==='ta'
      ? `வணக்கம்! 🙏 நான் உங்கள் AI பயண உதவியாளர். "${trip?.title||'இந்த பயணம்'}" பற்றி எதாவது கேளுங்கள்!`
      : `Vanakkam! 🙏 I'm your AI travel companion for **${trip?.title||'this trip'}**.\n\nTap a quick action or ask me anything — food, hotels, costs, safety!`,
  }]);
  const [input, setInput]   = useState('');
  const [loading, setLoad]  = useState(null); // null | actionId | 'custom'
  const bottomRef = useRef(null);
  
  // Ref for the horizontal scroll container to auto-scroll right when an item is clicked
  const actionsScrollRef = useRef(null);

  useEffect(()=>{ 
    bottomRef.current?.scrollIntoView({ behavior:'smooth' }); 
  }, [messages]);

  async function send(prompt, actionId=null) {
    const msg = prompt || input.trim();
    if (!msg || loading) return;
    
    setInput('');
    setLoad(actionId||'custom');
    setMessages(p=>[...p, { role:'user', content:msg }]);
    
    try {
      const res = await aiAPI.chat(msg, trip?.id);
      setMessages(p=>[...p, { role:'assistant', content:res.response }]);
    } catch {
      setMessages(p=>[...p, { role:'assistant', content:'⚠️ Could not respond. Please try again.' }]);
    } finally { 
      setLoad(null); 
    }
  }

  return (
    <div className="flex flex-col h-full relative bg-slate-50">

      {/* 1. Header - Fixed at top */}
      <div className="px-4 pt-3 pb-2 bg-white z-10 shadow-sm">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-2xl p-4 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">🤖</div>
          <div className="flex-1">
            <div className="font-display font-black text-white text-sm tracking-wide">
              {lang==='ta'?'AI பயண உதவியாளர்':'AI Travel Companion'}
            </div>
            <div className="text-indigo-200 text-[10px] font-medium opacity-80">Groq · LLaMA 3.3 · Context-aware</div>
          </div>
          <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
            <span className="text-white text-[10px] font-bold uppercase tracking-wider">Online</span>
          </div>
        </div>
      </div>

      {/* 2. Chat Messages Area - Takes all available space */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide bg-slate-50/50">
        {messages.map((msg,i)=>(
          <div key={i} className={`flex ${msg.role==='user'?'justify-end':'justify-start'} animate-fade-in-up`}>
            {msg.role==='assistant' && (
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0 shadow-sm border border-indigo-500">
                🤖
              </div>
            )}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm
              ${msg.role==='user'
                ? 'bg-indigo-600 text-white rounded-br-none'
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'}`}
              dangerouslySetInnerHTML={{__html: formatMsg(msg.content)}}
            />
          </div>
        ))}
        
        {/* Loading Indicator inside chat flow */}
        {loading==='custom' && (
          <div className="flex items-start gap-2 animate-pulse">
             <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-sm flex-shrink-0">🤖</div>
             <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
               <div className="flex gap-1.5 items-center h-4">
                 {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
               </div>
             </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* 3. Input Area & Horizontal Quick Actions - Fixed at bottom */}
      <div className="bg-white border-t border-slate-200 pb-safe pt-2 px-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        
        {/* Input Field */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-100 border border-transparent focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl px-3 py-2 transition-all duration-200">
            <input 
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none py-1"
              placeholder={lang==='ta'?'ஏதாவது கேளுங்கள்...':'Ask anything about your trip...'}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!loading&&send()}
            />
            <button onClick={()=>send()} disabled={!input.trim()||!!loading}
              className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-sm hover:bg-indigo-700">
              {loading==='custom'?<Spinner size="sm" color="white"/>:(
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Horizontal Scrolling Quick Actions */}
        <div 
          ref={actionsScrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x"
          style={{ WebkitOverflowScrolling: 'touch' }} // Smooth iOS scrolling
        >
          {ACTIONS.map(a => (
            <button 
              key={a.id} 
              onClick={() => send(a.prompt, a.id)}
              disabled={!!loading}
              className="snap-start flex-shrink-0 group relative overflow-hidden bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl px-3 py-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg filter drop-shadow-sm">{a.icon}</span>
                <div className="flex flex-col items-start">
                   <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 whitespace-nowrap">
                     {lang==='ta' ? a.ta : a.label}
                   </span>
                </div>
              </div>
              
              {/* Loading State Overlay for specific button */}
              {loading === a.id && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                   <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"/>
                </div>
              )}
            </button>
          ))}
          
          {/* Spacer for right padding in scroll view */}
          <div className="w-2 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
