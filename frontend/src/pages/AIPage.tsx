import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, Send, Sparkles, TrendingUp, RefreshCw, Wallet } from 'lucide-react';

const QUICK = [
  { icon:'🍽️', label:'Best food stops', q:'What are the best local food stops and restaurants on this route?' },
  { icon:'🏨', label:'Hotel options', q:'Suggest hotels at the destination for different budget levels.' },
  { icon:'💡', label:'Budget tips', q:'How can we reduce our trip cost? Give 5 specific tips for this route.' },
  { icon:'⛽', label:'Fuel stops', q:'Where are the best fuel stops and rest areas on this route?' },
  { icon:'🌦️', label:'What to pack', q:'What should we pack for this trip? Weather and activity tips.' },
  { icon:'🚨', label:'Emergency info', q:'What are key hospitals, police stations, and emergency contacts along this route?' },
];

function formatMsg(t: string) {
  return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/\n/g,'<br/>');
}

export default function AIPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [budgetData, setBudget] = useState<any>(null);
  const [loadingBudget, setLB]  = useState(false);
  const [tab, setTab]           = useState<'chat'|'budget'>('chat');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chat history
    api.get(`/ai/trips/${tripId}/chat`).then(r => {
      setMessages(r.data.data || []);
    }).catch(() => {
      setMessages([{ role:'assistant', content:'Vanakkam! 🙏 I\'m your Nam Payanam AI companion.\n\nAsk me anything about your trip — food stops, hotels, costs, safety tips, or local secrets!', created_at: new Date() }]);
    });
  }, [tripId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role:'user', content:msg }]);
    setLoading(true);
    try {
      const res = await api.post(`/ai/trips/${tripId}/chat`, { message: msg });
      setMessages(p => [...p, { role:'assistant', content: res.data.data?.response || 'No response' }]);
    } catch {
      setMessages(p => [...p, { role:'assistant', content:'⚠️ I had trouble responding. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const loadBudget = async () => {
    setLB(true);
    try {
      const r = await api.get(`/ai/trips/${tripId}/budget`);
      setBudget(r.data.data);
    } catch { alert('Failed to analyze budget'); }
    finally { setLB(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] pt-safe">
      <header className="glass z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]">
            <ArrowLeft size={20} className="text-[var(--muted)]"/>
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-[var(--text)] flex items-center gap-2">
              <Sparkles size={18} className="text-violet-500"/> AI Companion
            </h1>
            <p className="text-[var(--muted)] text-xs">Powered by LLaMA 3.3</p>
          </div>
          <div className="flex gap-1">
            {(['chat','budget'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); if(t==='budget'&&!budgetData) loadBudget(); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${tab===t?'bg-brand text-white':'bg-[var(--bg)] text-[var(--muted)]'}`}>
                {t==='chat'?'💬 Chat':'💰 Budget'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full scrollbar-hide">
            {messages.map((m,i) => (
              <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'} animate-fade-in`}>
                {m.role==='assistant' && (
                  <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <Sparkles size={14} className="text-violet-600"/>
                  </div>
                )}
                <div className={m.role==='user'?'chat-bubble-user':'chat-bubble-ai'}
                  dangerouslySetInnerHTML={{__html:formatMsg(m.content)}}/>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles size={14} className="text-violet-600 animate-pulse"/>
                </div>
                <div className="chat-bubble-ai">
                  <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick actions */}
          <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {QUICK.map((q,i) => (
                <button key={i} onClick={() => send(q.q)}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:border-brand hover:text-brand transition-all active:scale-95">
                  <span>{q.icon}</span>{q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-4 pb-safe max-w-2xl mx-auto w-full">
            <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-3 py-2 focus-within:border-brand transition-all">
              <input className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none py-1"
                placeholder="Ask about your trip…" value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!loading&&send()}/>
              <button onClick={() => send()} disabled={!input.trim()||loading}
                className="w-9 h-9 bg-brand text-white rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0">
                <Send size={15}/>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl mx-auto w-full">
          {loadingBudget ? (
            <div className="flex flex-col items-center pt-16 gap-3">
              <RefreshCw size={32} className="text-brand animate-spin"/>
              <p className="text-[var(--muted)] text-sm">Analyzing your budget…</p>
            </div>
          ) : !budgetData ? (
            <div className="card p-6 text-center">
              <Wallet size={40} className="text-[var(--muted)] mx-auto mb-3 opacity-40"/>
              <p className="font-bold text-[var(--text)]">Budget Analysis</p>
              <button onClick={loadBudget} className="btn-primary mx-auto mt-4 w-fit">Analyze My Budget</button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {budgetData.warning && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-sm font-semibold">
                  ⚠️ {budgetData.warning}
                </div>
              )}
              <div className="card p-4">
                <p className="text-[var(--muted)] text-xs font-bold uppercase mb-3">Budget Breakdown</p>
                <div className="space-y-3">
                  {Object.entries(budgetData.breakdown||{}).map(([k,v]:any) => {
                    const total = Object.values(budgetData.breakdown||{}).reduce((s:any,x:any)=>s+x,0) as number;
                    const pct = total>0?Math.round((v/total)*100):0;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-[var(--text)] capitalize">{k.replace('_',' ')}</span>
                          <span className="font-bold text-[var(--text)]">₹{v?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Per day</span>
                  <span className="font-black text-brand">₹{budgetData.perDayBudget?.toLocaleString('en-IN')}</span>
                </div>
              </div>
              {budgetData.tips?.length > 0 && (
                <div className="card p-4">
                  <p className="text-[var(--muted)] text-xs font-bold uppercase mb-3">💡 Money-Saving Tips</p>
                  <div className="space-y-2">
                    {budgetData.tips.map((tip:string,i:number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
                        <span className="text-brand font-bold mt-0.5">→</span>{tip}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={loadBudget} className="btn-ghost w-full border border-[var(--border)]">
                <RefreshCw size={14}/> Refresh Analysis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
