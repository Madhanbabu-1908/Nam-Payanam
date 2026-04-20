import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { EmptyStateItinerary } from '../components/itinerary/EmptyStateItinerary';
import { ArrowLeft, Plus } from 'lucide-react';
import { ItineraryItem, Trip } from '../types';

export default function ItineraryPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [tripMode, setTripMode] = useState<'AI' | 'MANUAL'>('MANUAL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      api.get(`/trips/${tripId}`),
      api.get(`/itinerary/trip/${tripId}`)
    ]).then(([tripRes, itemRes]) => {
      setTripMode(tripRes.data.data.mode);
      setItems(itemRes.data.data || []);
      setLoading(false);
    }).catch(console.error);
  }, [tripId]);

  const handleAdd = () => alert("Open Modal to Add Stop");
  const handleTemplate = () => alert("Load Template Logic");

  if (loading) return <div>Loading...</div>;

  if (items.length === 0 && tripMode === 'MANUAL') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white p-4 shadow"><button onClick={() => navigate(-1)}><ArrowLeft/></button></header>
        <EmptyStateItinerary onAddLocation={handleAdd} onUseTemplate={handleTemplate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 shadow flex justify-between items-center sticky top-0">
        <button onClick={() => navigate(-1)}><ArrowLeft/></button>
        <h1 className="font-bold">Itinerary</h1>
        <button onClick={handleAdd} className="bg-primary text-white p-2 rounded-full"><Plus/></button>
      </header>
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded shadow">
            <div className="text-xs text-primary font-bold">Day {item.day_number} • {item.time_slot}</div>
            <h3 className="font-bold text-lg">{item.location_name}</h3>
            <p className="text-gray-600">{item.description}</p>
          </div>
        ))}
      </main>
    </div>
  );
}