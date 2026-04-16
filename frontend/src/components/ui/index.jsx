// Reusable UI components — Nam Payanam Enhanced

export function Spinner({ size = 'md', color = 'brand' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  const colors = { brand: 'border-[#FF6B35]', white: 'border-white', ocean: 'border-[#0066CC]' };
  return <div className={`${sizes[size]} border-2 ${colors[color]} border-t-transparent rounded-full animate-spin`} />;
}

export function PageHeader({ title, subtitle, action, back }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {back && (
          <button onClick={back} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="font-display font-extrabold text-slate-900 text-lg leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-display font-bold text-slate-700 text-base mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-5">{description}</p>
      {action}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 space-y-3 border border-slate-100">
      <div className="skeleton h-4 w-2/3 rounded-lg" />
      <div className="skeleton h-3 w-full rounded-lg" />
      <div className="skeleton h-3 w-4/5 rounded-lg" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function BottomSheet({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-content">
        <div className="sheet-handle" />
        {title && (
          <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-100">
            <h2 className="font-display font-extrabold text-slate-900 text-lg">{title}</h2>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </>
  );
}

export function TripCodeBadge({ code, onCopy }) {
  return (
    <button onClick={onCopy}
      className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-dashed border-[#FF6B35]/40 rounded-2xl px-5 py-4 w-full justify-center active:scale-95 transition-all">
      <span className="font-display font-extrabold text-[#FF6B35] text-3xl tracking-[0.2em]">{code}</span>
      <div className="w-8 h-8 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center">
        <svg className="w-4 h-4 text-[#FF6B35]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
    </button>
  );
}

export function ProgressBar({ percent, showLabel = true }) {
  return (
    <div className="space-y-1.5">
      {showLabel && (
        <div className="flex justify-between text-xs font-bold text-slate-500">
          <span>Trip Progress</span>
          <span className="text-[#FF6B35]">{percent}%</span>
        </div>
      )}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FF4500] rounded-full transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function CategoryIcon({ category, size = 'md' }) {
  const icons = { food:'🍽️', transport:'🚗', stay:'🏨', activity:'🎯', shopping:'🛍️', other:'📌', break:'☕' };
  const classes = { food:'cat-food', transport:'cat-transport', stay:'cat-stay', activity:'cat-activity', shopping:'cat-shopping', other:'cat-other', break:'cat-break' };
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' };
  return (
    <div className={`${sizes[size]} ${classes[category] || 'cat-other'} rounded-xl flex items-center justify-center font-medium flex-shrink-0`}>
      {icons[category] || '📌'}
    </div>
  );
}

export function MemberAvatar({ nickname, isOrganizer, size = 'md' }) {
  const colors = [
    'bg-orange-100 text-orange-700', 'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700',
    'bg-pink-100 text-pink-700', 'bg-amber-100 text-amber-700',
  ];
  const colorIdx = nickname?.charCodeAt(0) % colors.length || 0;
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} ${colors[colorIdx]} rounded-xl flex items-center justify-center font-extrabold uppercase`}>
        {nickname?.[0] || '?'}
      </div>
      {isOrganizer && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#FF6B35] to-[#FF4500] rounded-full flex items-center justify-center">
          <span className="text-white text-[8px]">★</span>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const config = {
    planning: { label: 'Planning', cls: 'bg-amber-100 text-amber-700' },
    active: { label: '🟢 Live', cls: 'bg-emerald-100 text-emerald-700' },
    completed: { label: '✅ Done', cls: 'bg-slate-100 text-slate-600' },
  };
  const { label, cls } = config[status] || config.planning;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${cls}`}>{label}</span>;
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
