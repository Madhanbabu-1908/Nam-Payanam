import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { MapPin, DollarSign, Users, Settings, ArrowLeft, Calendar } from 'lucide-react';
import { Trip } from '../types';

export default function Dashboard() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/${tripId}`);
        if (res.data.success && res.data.data) {
          setTrip(res.data.data);
        } else {
          throw new Error('Trip not found');
        }
      } catch (err: any) {
        console.error("Failed to load trip:", err);
        setError("Could not load trip details. It may have been deleted.");
        // Optional: Redirect to home after 2 seconds if error persists
        // setTimeout(() => navigate('/'), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (      <div className="h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error || "Trip not found."}</p>
          <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { title: 'Itinerary', icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-50', path: 'itinerary' },
    { title: 'Expenses', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', path: 'expenses' },
    { title: 'Members', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', path: 'members' },
    { title: 'Settings', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-50', path: 'settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft /></button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{trip.name}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14}/> {trip.destination}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-6 justify-between">
          <div>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Calendar size={14}/> Dates</p>
            <p className="font-semibold">{new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 flex items-center gap-1"><DollarSign size={14}/> Budget</p>
            <p className="font-semibold">₹{trip.budget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Mode</p>
            <span className={`px-2 py-1 rounded text-xs font-bold ${trip.mode === 'AI' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{trip.mode}</span>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-4">Trip Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (            <div key={card.title} onClick={() => navigate(`/dashboard/${tripId}/${card.path}`)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 cursor-pointer transition group">
              <div className={`h-12 w-12 ${card.bg} rounded-lg flex items-center justify-center ${card.color} mb-4 group-hover:scale-110 transition`}>
                <card.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
              <p className="text-gray-500 text-sm mt-1">Manage {card.title.toLowerCase()}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}