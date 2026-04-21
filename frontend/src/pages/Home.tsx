import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { PlusCircle, MapPin, LogOut } from 'lucide-react';
import { Trip } from '../types';

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        // ✅ CHANGED: Call the new '/trips/my' endpoint
        const res = await api.get('/trips/my'); 
        
        if (res.data.success && Array.isArray(res.data.data)) {
           setTrips(res.data.data);
        } else if (Array.isArray(res.data)) {
           setTrips(res.data);
        }
      } catch (e) { 
        console.error("Fetch error", e); 
        setTrips([]); 
      } finally { setLoading(false); }
    };
    fetchTrips();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <span className="text-xl font-bold text-indigo-600 flex items-center gap-2">🚌 Nam-Payanam</span>
        <div className="flex items-center gap-4">
          {user?.email && <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>}
          <button onClick={() => signOut()} className="text-gray-500 hover:text-red-600 transition"><LogOut size={20}/></button>
        </div>
      </nav>
      
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Trips</h1>
            <p className="text-gray-500 mt-1">Manage your upcoming adventures</p>
          </div>
          <button onClick={() => navigate('/create-trip')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 shadow-md transition">
            <PlusCircle className="h-5 w-5 mr-2" /> Create Trip
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading your trips...</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No trips yet</h3>
            <p className="text-gray-500 mt-1">Get started by creating your first trip!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <div key={trip.id} onClick={() => navigate(`/dashboard/${trip.id}`)} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer border border-gray-100 transition group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition">{trip.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${trip.mode === 'AI' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{trip.mode}</span>
                </div>
                <p className="text-gray-500 text-sm flex items-center gap-1"><MapPin size={14}/> {trip.destination}</p>
                <p className="text-gray-400 text-xs mt-2">{new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}