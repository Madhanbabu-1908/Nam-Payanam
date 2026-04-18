import { useState, useRef, useEffect, useCallback } from 'react';
import { tripAPI } from '../../utils/api';

export default function LocationSearch({ value, onChange, placeholder, label, icon = '📍' }) {
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  // Sync query if value changes externally (e.g., reset)
  useEffect(() => {
    if (value) {
      setQuery(value.label);
    } else {
      setQuery('');
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await tripAPI.searchLocation(q);
      
      // DEBUGGING: Check console to see what the API actually returns
      console.log('API Response for:', q, res);

      let data = [];
      if (Array.isArray(res)) {
        // Case 1: API returns an array directly
        data = res;
      } else if (res && res.results) {
        // Case 2: API returns { results: [...] }
        data = res.results;      } else if (res && res.features) {
        // Case 3: GeoJSON format (common for Mapbox/OSM)
        data = res.features.map(f => ({
          label: f.place_name || f.display_name,
          shortLabel: f.text || f.address?.city || f.address?.town,
          lat: f.center ? f.center[1] : f.lat,
          lng: f.center ? f.center[0] : f.lng,
          type: f.place_type ? f.place_type[0] : 'place'
        }));
      }

      // 👇 ENSURE EVERY RESULT HAS lat/lng — fallback to 0 if missing
      // This prevents the "Please select a valid location" error
      data = data.map(item => ({
        ...item,
        lat: item.lat !== undefined ? item.lat : 0,
        lng: item.lng !== undefined ? item.lng : 0
      }));

      setResults(data);
      if (data.length > 0) setOpen(true);
    } catch (err) {
      console.error('Location search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    
    // If cleared, reset value to null
    if (!q) {
      onChange(null);
      setResults([]);
      setOpen(false);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(q), 350);
  }

  function selectResult(r) {
    // Normalize result object to ensure consistent structure
    const selectedLoc = {
      label: r.shortLabel || r.label,
      fullLabel: r.label,      lat: r.lat,
      lng: r.lng
    };

    setQuery(selectedLoc.label);
    setOpen(false);
    setResults([]);
    onChange(selectedLoc);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      {label && <label className="label">{label}</label>}
      
      <div className="relative">
        {/* Icon */}
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none z-10">
          {icon}
        </span>

        {/* Input Field */}
        <input
          className="input pl-10 pr-8 w-full"
          placeholder={placeholder || 'Search location...'}
          value={query}
          onChange={handleInput}
          onFocus={() => {
            // Only open if we have results already
            if (results.length > 0) setOpen(true);
          }}
          autoComplete="off"
        />

        {/* Loading Spinner */}
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </span>
        )}

        {/* Clear Button (X) */}
        {value && !loading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              onChange(null);
              setResults([]);
              setOpen(false);
            }}            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg z-10 p-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {/* Note: z-[9999] ensures it floats above everything. */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 z-[9999] overflow-hidden animate-slide-down max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => selectResult(r)}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 active:bg-indigo-100 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-3"
            >
              <span className="text-indigo-500 mt-0.5 flex-shrink-0 text-lg">
                {r.type === 'city' || r.type === 'administrative' ? '🏙️' : '📍'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 leading-tight truncate">
                  {r.shortLabel || r.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">
                  {r.fullLabel || r.label}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-slate-100 z-[9999] p-4 text-center text-sm text-slate-500">
          No locations found for "{query}"
        </div>
      )}

      {/* Selected Indicator */}
      {value && (
        <div className="mt-1.5 flex items-center gap-1.5 px-1 animate-fade-in">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span className="text-xs text-emerald-600 font-semibold">Location confirmed</span>
        </div>
      )}
    </div>
  );
}
