import { useState, useRef, useEffect } from 'react';
import { geocodeLocation } from '../../utils/api';

export default function LocationInput({ label, placeholder, value, onSelect, icon = '📍' }) {
  const [query, setQuery] = useState(value?.short_name || value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (value?.short_name) setQuery(value.short_name);
    else if (typeof value === 'string') setQuery(value);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const res = await geocodeLocation(q);
      setResults(res);
      setLoading(false);
    }, 400);
  }

  function handleSelect(item) {
    setQuery(item.short_name);
    setResults([]);
    setOpen(false);
    onSelect(item);
  }

  return (
    <div ref={wrapRef} className="relative">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">{icon}</span>
        <input
          className="input pl-10 pr-10"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="location-dropdown">
          {results.map((r, i) => (
            <div key={i} className="location-item" onClick={() => handleSelect(r)}>
              <span className="text-[#FF6B35] text-lg flex-shrink-0">📍</span>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 text-sm truncate">{r.short_name}</div>
                <div className="text-xs text-slate-400 truncate">{r.display_name.split(',').slice(2, 4).join(',')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
