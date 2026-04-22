import React, { useState } from 'react';
import Map, { Marker } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, X } from 'lucide-react';

interface LocationPickerProps {
  onSelect: (lat: number, lng: number, name: string) => void;
  initialLat?: number;
  initialLng?: number;
  label: string;
}

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export default function LocationPicker({ onSelect, initialLat, initialLng, label }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // Initial View State
  const viewState = {
    longitude: initialLng || 78.9629,
    latitude: initialLat || 20.5937,
    zoom: 5
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&addressdetails=1`);
      const data = await res.json();
      setSuggestions(data);
    } catch (err) { console.error(err); }
  };

  const selectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const name = item.display_name.split(',')[0];
    
    setSelectedLoc({ lat, lng, name });
    setSearchQuery(name);
    setSuggestions([]);
    onSelect(lat, lng, name);  };

  const handleMapClick = (e: any) => {
    const { lng, lat } = e.lngLat;
    // Reverse Geocode for Name
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(res => res.json())
      .then(data => {
        const name = data.address.city || data.address.town || data.address.village || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        setSelectedLoc({ lat, lng, name });
        setSearchQuery(name);
        onSelect(lat, lng, name);
      })
      .catch(() => {
        setSelectedLoc({ lat, lng, name: `${lat.toFixed(2)}, ${lng.toFixed(2)}` });
        onSelect(lat, lng, `${lat.toFixed(2)}, ${lng.toFixed(2)}`);
      });
  };

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
      
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md flex items-center p-2">
          <Search className="text-slate-400 ml-2" size={20} />
          <input 
            type="text" 
            placeholder={`Search for ${label}...`} 
            value={searchQuery}
            onChange={handleSearch}
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-white px-2"
          />
          {searchQuery && <button onClick={() => {setSearchQuery(''); setSuggestions([])}}><X size={18} className="text-slate-400"/></button>}
        </div>
        
        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="bg-white dark:bg-slate-800 mt-2 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => selectSuggestion(item)}
                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <p className="font-bold text-sm text-slate-800 dark:text-white">{item.display_name.split(',')[0]}</p>
                <p className="text-xs text-slate-500 truncate">{item.display_name}</p>
              </button>
            ))}
          </div>        )}
      </div>

      {/* MapLibre Map */}
      <Map
        {...viewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        mapLib={maplibregl}
        onClick={handleMapClick}
      >
        {selectedLoc && (
          <Marker longitude={selectedLoc.lng} latitude={selectedLoc.lat} anchor="bottom">
            <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-lg cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}