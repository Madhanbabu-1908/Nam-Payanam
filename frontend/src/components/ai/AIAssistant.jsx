import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../utils/api';
import { Spinner } from '../ui/index.jsx';

const QUICK_QUESTIONS = [
  '🌦️ What to pack for this trip?',
  '💊 Medical kit essentials?',
  '🍽️ Local food I must try?',
  '🔒 Safety tips for this route?',
  '📸 Best photography spots?',
  '💡 How to save money?',
];

export default function AIAssistant({ trip, session }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Vanakkam! 🙏 I'm your AI travel companion for **${trip?.title || 'this trip'}**.\n\nI can help with packing tips, local food suggestions, safety advice, budget tips, and more. What would you like to know?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await aiAPI.chat(msg, trip?.id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Sorry, I had trouble responding. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 220px)' }}>
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-4">
        {/* AI header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-saffron-500 to-orange-600 rounded-xl flex items-center justify-center text-sm">🤖</div>
          <div>
            <div className="text-xs font-bold text-slate-700">AI Travel Assistant</div>
            <div className="text-[10px] text-slate-400">Powered by Groq LLaMA 3.1</div>
          </div>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-saffron-500 text-white rounded-br-sm'
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-sm'}`}>
              {formatMessage(msg.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Spinner size="sm" color="saffron" />
                <span className="text-xs text-slate-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick questions */}
        {messages.length === 1 && !loading && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-3">Quick Questions</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q.replace(/^[^\s]+\s/, ''))}
                  className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-2 rounded-xl 
                             active:bg-slate-50 transition-colors shadow-sm font-medium">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 bg-white px-4 py-3 pb-safe">
        <div className="flex gap-2 items-end">
          <textarea
            className="input flex-1 resize-none text-sm"
            placeholder="Ask anything about your trip..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
            rows={1}
            style={{ maxHeight: 80 }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-saffron-500 rounded-xl flex items-center justify-center flex-shrink-0
                       disabled:opacity-40 active:scale-90 transition-all"
          >
            {loading ? <Spinner size="sm" color="white" /> : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Format markdown-like message
function formatMessage(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const formatted = line.replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}
