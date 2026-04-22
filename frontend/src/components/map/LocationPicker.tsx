import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix Leaflet Icon
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  onSelect: (lat: number, lng: number, name: string) => void;
  initialLat?: number;
  initialLng?: number;
  label: string;
}

// Component to handle Map Clicks
function LocationMarker({ onSelect }: { onSelect: (lat: number, lng: number, name: string) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      // Reverse geocoding could go here, but for now we just pass coords
      onSelect(e.latlng.lat, e.latlng.lng, `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
    },
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={defaultIcon}></Marker>
  );
}

export default function LocationPicker({ onSelect, initialLat, initialLng, label }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const center: [number, number] = initialLat && initialLng ? [initialLat, initialLng] : [20.5937, 78.9629]; // India Center

  // Handle Search via Nominatim API  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err) {
      console.error(err);
    }
  };

  const selectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const name = item.display_name.split(',')[0]; // Get short name
    
    onSelect(lat, lng, name);
    setSearchQuery(name);
    setSuggestions([]);
  };

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
      
      {/* Search Bar Overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md flex items-center p-2">
          <input 
            type="text" 
            placeholder={`Search for ${label}...`} 
            value={searchQuery}
            onChange={handleSearch}
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-white px-2"
          />
          {searchQuery && (
            <button onClick={() => {setSearchQuery(''); setSuggestions([])}} className="p-2 text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>
        
        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="bg-white dark:bg-slate-800 mt-2 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((item, idx) => (              <button 
                key={idx} 
                onClick={() => selectSuggestion(item)}
                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <p className="font-bold text-sm text-slate-800 dark:text-white">{item.display_name.split(',')[0]}</p>
                <p className="text-xs text-slate-500 truncate">{item.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The Map */}
      <MapContainer center={center} zoom={5} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}