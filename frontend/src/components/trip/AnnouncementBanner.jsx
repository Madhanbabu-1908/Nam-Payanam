import { useState } from 'react';
const TYPE_CFG = {
  info:      { bg:'bg-indigo-50 border-indigo-200', text:'text-indigo-800', icon:'ℹ️' },
  warning:   { bg:'bg-amber-50 border-amber-200',   text:'text-amber-800',  icon:'⚠️' },
  alert:     { bg:'bg-red-50 border-red-200',        text:'text-red-800',    icon:'🚨' },
  milestone: { bg:'bg-emerald-50 border-emerald-200',text:'text-emerald-800',icon:'🎉' },
};
export default function AnnouncementBanner({ announcement }) {
  const [dismissed, setDismissed] = useState(false);
  if (!announcement || dismissed) return null;
  const cfg = TYPE_CFG[announcement.type] || TYPE_CFG.info;
  return (
    <div className={`mx-4 mt-3 border rounded-2xl p-3 flex items-start gap-3 animate-slide-down ${cfg.bg}`}>
      <span className="text-xl flex-shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${cfg.text}`}>{announcement.posted_by} · Announcement</p>
        <p className={`text-sm mt-0.5 ${cfg.text}`}>{announcement.message}</p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">✕</button>
    </div>
  );
}
