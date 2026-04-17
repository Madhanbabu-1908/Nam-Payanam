import { useState, useRef, useEffect } from 'react';
import { aiAPI } from '../../utils/api';
import { Spinner } from '../ui/index.jsx';

const QUICK = ['🌦️ What to pack?','🍽️ Local food to try?','🔒 Safety tips?','💡 Save money how?','⛽ Fuel stops?','🏨 Best stays?'];

export default function AIAssistant({ trip, session }) {
  const [msgs, setMsgs] = useState([{
    role:'assistant',
    content:`Vanakkam! 🙏 I'm your AI travel companion for **${trip?.title||'this trip'}**.\n\nAsk me anything — packing tips, local food, route advice, safety, or budget hacks!`
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  async function send(text) {
    const msg = text||input.trim();
    if (!msg) return;
    setInput('');
    setMsgs(p=>[...p,{role:'user',content:msg}]);
    setLoading(true);
    try {
      const res = await aiAPI.chat(msg, trip?.id);
      setMsgs(p=>[...p,{role:'assistant',content:res.response}]);
    } catch {
      setMsgs(p=>[...p,{role:'assistant',content:'⚠️ AI is busy right now. Please try in a moment.'}]);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col animate-fade-in" style={{height:'calc(100vh - 220px)'}}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
        <div className="w-9 h-9 bg-saffron-gradient rounded-xl flex items-center justify-center text-lg shadow-saffron">🤖</div>
        <div><div className="font-display font-bold text-slate-800 text-sm">AI Travel Assistant</div>
          <div className="text-[11px] text-slate-400">Groq LLaMA · Smart fallback enabled</div></div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {msgs.map((msg,i)=>(
          <div key={i} className={`flex ${msg.role==='user'?'justify-end':'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role==='user'?'bg-indigo-600 text-white rounded-br-sm shadow-indigo':'bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-sm'}`}>
              {msg.content.split('\n').map((line,j)=>(
                <span key={j}>
                  <span dangerouslySetInnerHTML={{__html:line.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}}/>
                  {j<msg.content.split('\n').length-1&&<br/>}
                </span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
              <Spinner size="sm" color="indigo"/>
              <span className="text-xs text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
        {msgs.length===1 && !loading && (
          <div className="pt-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Quick Ask</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q,i)=>(
                <button key={i} onClick={()=>send(q.replace(/^[^\s]+\s/,''))}
                  className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-2 rounded-xl active:bg-indigo-50 transition-colors font-semibold shadow-sm">{q}</button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 bg-white px-4 py-3 pb-safe">
        <div className="flex gap-2 items-end">
          <textarea className="input flex-1 resize-none text-sm" placeholder="Ask anything about your trip..." value={input}
            onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            rows={1} style={{maxHeight:80}}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()}
            className="w-11 h-11 bg-saffron-500 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all shadow-saffron">
            {loading?<Spinner size="sm" color="white"/>:(
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
