// Reusable UI components for Nam Payanam

// ── Loading Spinner ──────────────────────────────────────────────────────────
export function Spinner({ size = 'md', color = 'saffron' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  const colors = { saffron: 'border-saffron-500', white: 'border-white', ocean: 'border-ocean-500' };
  return (
    <div className={`${sizes[size]} border-2 ${colors[color]} border-t-transparent rounded-full animate-spin`} />
  );
}

// ── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, back }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {back && (
          <button onClick={back} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200 transition-colors">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="font-display font-bold text-slate-900 text-lg leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-display font-bold text-slate-700 text-base mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-4">{description}</p>
      {action}
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ── Bottom Sheet ─────────────────────────────────────────────────────────────
export function BottomSheet({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-content">
        <div className="sheet-handle" />
        {title && (
          <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-100">
            <h2 className="font-display font-bold text-slate-900 text-lg">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </>
  );
}

// ── Trip Code Display ────────────────────────────────────────────────────────
export function TripCodeBadge({ code, onCopy }) {
  return (
    <button
      onClick={onCopy}
      className="flex items-center gap-2 bg-saffron-50 border-2 border-dashed border-saffron-300 
                 rounded-2xl px-5 py-3 transition-colors active:bg-saffron-100 w-full justify-center"
    >
      <span className="font-display font-extrabold text-saffron-600 text-2xl tracking-widest">{code}</span>
      <svg className="w-4 h-4 text-saffron-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ percent, color = 'saffron', showLabel = true }) {
  const colors = {
    saffron: 'bg-saffron-500',
    ocean: 'bg-ocean-500',
    green: 'bg-green-500',
  };
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold text-slate-500">
          <span>Trip Progress</span>
          <span>{percent}%</span>
        </div>
      )}
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} rounded-full transition-all duration-700`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ── Category Icon ────────────────────────────────────────────────────────────
export function CategoryIcon({ category, size = 'md' }) {
  const icons = {
    food: '🍽️', transport: '🚗', stay: '🏨',
    activity: '🎯', shopping: '🛍️', other: '📌'
  };
  const classes = {
    food: 'cat-food', transport: 'cat-transport', stay: 'cat-stay',
    activity: 'cat-activity', shopping: 'cat-shopping', other: 'cat-other'
  };
  const sizes = { sm: 'w-7 h-7 text-sm', md: 'w-9 h-9 text-base', lg: 'w-11 h-11 text-lg' };
  return (
    <div className={`${sizes[size]} ${classes[category] || 'cat-other'} rounded-xl flex items-center justify-center font-medium`}>
      {icons[category] || '📌'}
    </div>
  );
}

// ── Member Avatar ────────────────────────────────────────────────────────────
export function MemberAvatar({ nickname, isOrganizer, size = 'md' }) {
  const colors = [
    'bg-saffron-100 text-saffron-700',
    'bg-ocean-100 text-ocean-700',
    'bg-purple-100 text-purple-700',
    'bg-emerald-100 text-emerald-700',
    'bg-pink-100 text-pink-700',
    'bg-amber-100 text-amber-700',
  ];
  const colorIndex = nickname?.charCodeAt(0) % colors.length || 0;
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} ${colors[colorIndex]} rounded-xl flex items-center justify-center font-bold uppercase`}>
        {nickname?.[0] || '?'}
      </div>
      {isOrganizer && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-saffron-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[8px]">★</span>
        </div>
      )}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const config = {
    planning: { label: 'Planning', cls: 'badge-slate' },
    active: { label: '🟢 Active', cls: 'badge-green' },
    completed: { label: '✅ Completed', cls: 'badge-ocean' },
  };
  const { label, cls } = config[status] || config.planning;
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Currency Format ──────────────────────────────────────────────────────────
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// ── Date Format ─────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
