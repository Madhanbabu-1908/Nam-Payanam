import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../utils/api';
import { Spinner } from '../ui/index.jsx';

const QUICK_QUESTIONS = [
  '🌦️ What to pack?',
  '💊 Medical kit essentials?',
  '🍽️ Local food to try?',
  '🔒 Safety tips?',
  '📸 Best photo spots?',
  '💡 Save money how?',
  '⛽ Petrol stations en route?',
  '🏨 Best areas to stay?',
];

function formatMsg(text) {
  // Simple markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

export default function AIAssistant({ trip, session }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Vanakkam! 🙏 I'm your AI travel companion for **${trip?.title || 'this trip'}**.\n\nAsk me anything — packing tips, local food, safety advice, budget hacks, or route info!`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await aiAPI.chat(msg, trip?.id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ I had trouble responding. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: 'calc(100svh - 220px)' }}>
      {/* Chat header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl px-4 py-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🤖</div>
          <div>
            <div className="font-display font-extrabold text-white text-sm">AI Travel Companion</div>
            <div className="text-white/60 text-xs">Powered by Groq · LLaMA 3.3</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft" />
            <span className="text-white/70 text-xs font-semibold">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0">🤖</div>
            )}
            <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white rounded-br-sm'
                : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-sm'}`}
              dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }}
            />
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-sm flex-shrink-0">🤖</div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_QUESTIONS.map((q, i) => (
            <button key={i} onClick={() => send(q.replace(/^[^\s]+\s/, ''))}
              className="flex-shrink-0 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all active:scale-95">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-safe">
        <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-2xl px-3 py-2 focus-within:border-[#FF6B35] transition-all">
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none py-1"
            placeholder="Ask anything about your trip..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && send()}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 bg-gradient-to-r from-[#FF6B35] to-[#FF4500] text-white rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-95 flex-shrink-0"
          >
            {loading ? <Spinner size="sm" color="white" /> : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
