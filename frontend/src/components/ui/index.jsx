// ─────────────────────────────────────────────────────────────────────────────
// Nam Payanam — Shared UI Components (Deep Indigo + Saffron Theme)
// ─────────────────────────────────────────────────────────────────────────────

export function Spinner({ size='md', color='saffron' }) {
  const s = { sm:'w-4 h-4 border-2', md:'w-6 h-6 border-2', lg:'w-9 h-9 border-[3px]' }[size];
  const c = { saffron:'border-saffron-500', white:'border-white', indigo:'border-indigo-500' }[color];
  return <div className={`${s} ${c} border-t-transparent rounded-full animate-spin`}/>;
}

export function PageHeader({ title, subtitle, action, back, dark=false }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${dark ? 'text-white' : ''}`}>
      <div className="flex items-center gap-3">
        {back && (
          <button onClick={back} className={`btn-icon ${dark ? 'bg-white/15 active:bg-white/25' : 'bg-slate-100 active:bg-slate-200'}`}>
            <svg className={`w-5 h-5 ${dark ? 'text-white' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <div>
          <h1 className={`font-display font-bold text-lg leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
          {subtitle && <p className={`text-xs mt-0.5 ${dark ? 'text-white/70' : 'text-slate-500'}`}>{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="text-5xl mb-4 animate-bounce-in">{icon}</div>
      <h3 className="font-display font-bold text-slate-700 text-base mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-5 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-4 w-2/3"/>
      <div className="skeleton h-3 w-full"/>
      <div className="skeleton h-3 w-4/5"/>
      <div className="flex gap-2 pt-1"><div className="skeleton h-6 w-16 rounded-full"/><div className="skeleton h-6 w-20 rounded-full"/></div>
    </div>
  );
}

export function BottomSheet({ isOpen, onClose, title, children, fullscreen=false }) {
  if (!isOpen) return null;
  return (
    <>
      <div className="sheet-overlay" onClick={onClose}/>
      <div className={`sheet-content ${fullscreen ? 'max-h-[98vh]' : ''}`}>
        <div className="sheet-handle"/>
        {title && (
          <div className="sheet-header">
            <h2 className="font-display font-bold text-slate-900 text-lg">{title}</h2>
            <button onClick={onClose} className="btn-icon bg-slate-100 active:bg-slate-200">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </>
  );
}

export function TripCodeBadge({ code, onCopy }) {
  return (
    <button onClick={onCopy}
      className="flex items-center gap-3 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-2xl px-5 py-3.5 w-full justify-center active:bg-indigo-100 transition-colors">
      <span className="font-display font-extrabold text-indigo-700 text-2xl tracking-[0.3em]">{code}</span>
      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>
  );
}

export function ProgressBar({ percent, label='Trip Progress' }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-slate-500">{label}</span>
        <span className="text-indigo-600">{percent}%</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-saffron-gradient rounded-full transition-all duration-700 shadow-saffron"
          style={{width:`${Math.max(2,percent)}%`}}/>
      </div>
    </div>
  );
}

export function MemberAvatar({ nickname, isOrganizer, size='md' }) {
  const palette = ['bg-indigo-100 text-indigo-700','bg-saffron-100 text-saffron-700','bg-purple-100 text-purple-700',
    'bg-emerald-100 text-emerald-700','bg-pink-100 text-pink-700','bg-amber-100 text-amber-700'];
  const ci = (nickname?.charCodeAt(0)||0) % palette.length;
  const sz = { sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-12 h-12 text-base' }[size];
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} ${palette[ci]} rounded-xl flex items-center justify-center font-black uppercase`}>
        {nickname?.[0]||'?'}
      </div>
      {isOrganizer && <div className="absolute -top-1 -right-1 w-4 h-4 bg-saffron-500 rounded-full flex items-center justify-center shadow-sm"><span className="text-white text-[8px]">★</span></div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const cfg = { planning:{cls:'status-planning',icon:'📋',label:'Planning'}, active:{cls:'status-active',icon:'🟢',label:'Live'}, completed:{cls:'status-completed',icon:'✅',label:'Completed'} };
  const { cls, icon, label } = cfg[status] || cfg.planning;
  return <span className={cls}>{icon} {label}</span>;
}

export function CategoryIcon({ category, size='md' }) {
  const icons = { food:'🍽️',transport:'🚗',stay:'🏨',activity:'🎯',shopping:'🛍️',fuel:'⛽',medical:'💊',other:'📌' };
  const clss  = { food:'cat-food',transport:'cat-transport',stay:'cat-stay',activity:'cat-activity',shopping:'cat-shopping',fuel:'cat-fuel',medical:'cat-medical',other:'cat-other' };
  const sz = { sm:'w-8 h-8 text-sm', md:'w-10 h-10 text-base', lg:'w-12 h-12 text-lg' }[size];
  return <div className={`${sz} ${clss[category]||'cat-other'} rounded-xl flex items-center justify-center`}>{icons[category]||'📌'}</div>;
}

export function BreakTypeIcon({ type }) {
  const icons = { food:'🍽️',fuel:'⛽',rest:'☕',attraction:'🎯',hotel:'🏨',medical:'💊',viewpoint:'🏔️',shopping:'🛍️',other:'📍' };
  return <span>{icons[type]||'📍'}</span>;
}

export function formatCurrency(amount) {
  const n = parseFloat(amount)||0;
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}

export function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
}

export function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes/60), m = minutes%60;
  return h>0 ? `${h}h ${m}m` : `${m} min`;
}
