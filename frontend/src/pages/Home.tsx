import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { PlusCircle, MapPin } from 'lucide-react';
import { Trip } from '../types';

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch from /api/trips/my-trips
    // For now, we mock or fetch all if endpoint exists
    const fetchTrips = async () => {
      try {
        // Assuming you have an endpoint that returns trips for the user
        // const res = await api.get('/trips'); 
        // setTrips(res.data.data);
        setTrips([]); // Placeholder
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchTrips();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold text-primary">Nam-Payanam 🚌</span>
        <button onClick={() => signOut()} className="text-sm text-gray-600 hover:text-gray-900">Logout</button>
      </nav>
      
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Trips</h1>
          <button onClick={() => navigate('/create-trip')} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700">
            <PlusCircle className="h-5 w-5 mr-2" /> Create Trip
          </button>
        </div>

        {loading ? <p>Loading...</p> : trips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No trips yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <div key={trip.id} onClick={() => navigate(`/dashboard/${trip.id}`)} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer border">
                <h3 className="font-bold text-lg">{trip.name}</h3>
                <p className="text-gray-500 text-sm">{trip.destination}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}