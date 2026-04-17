import { useState, useRef, useEffect, useCallback } from 'react';
import { tripAPI } from '../../utils/api';

export default function LocationSearch({ value, onChange, placeholder, label, icon='📍' }) {
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (!wrapRef.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await tripAPI.searchLocation(q);
      setResults(res.results || []);
      setOpen(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    if (!q) { onChange(null); setResults([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(q), 350);
  }

  function selectResult(r) {
    setQuery(r.shortLabel || r.label);
    setOpen(false);
    setResults([]);
    onChange({ label: r.shortLabel || r.label, fullLabel: r.label, lat: r.lat, lng: r.lng });
  }

  return (
    <div ref={wrapRef} className="relative">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none">{icon}</span>
        <input
          className="input pl-10 pr-8"
          placeholder={placeholder || 'Search location...'}
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
          </span>
        )}
        {value && !loading && (
          <button onClick={() => { setQuery(''); onChange(null); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg">×</button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-glass border border-slate-100 z-50 overflow-hidden animate-slide-down max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} onClick={() => selectResult(r)}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 active:bg-indigo-100 transition-colors border-b border-slate-50 last:border-0">
              <div className="flex items-start gap-2.5">
                <span className="text-indigo-500 mt-0.5 flex-shrink-0">
                  {r.type==='city'||r.type==='administrative'?'🏙️':'📍'}
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-800 leading-tight">{r.shortLabel}</div>
                  <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.label}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected indicator */}
      {value && (
        <div className="mt-1.5 flex items-center gap-1.5 px-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>
          <span className="text-xs text-emerald-600 font-semibold">Location confirmed</span>
        </div>
      )}
    </div>
  );
}
