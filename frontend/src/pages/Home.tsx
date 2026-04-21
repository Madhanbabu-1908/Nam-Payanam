import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { PlusCircle, MapPin, LogOut, User } from 'lucide-react';
import { Trip } from '../types';

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        // Fetch trips where the user is a member or organizer
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
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <span 
          className="text-xl font-bold text-indigo-600 flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          🚌 Nam-Payanam
        </span>
        
        <div className="flex items-center gap-4">
          {/* Display User Email on Desktop */}
          {user?.email && (
            <span className="text-sm text-gray-600 hidden sm:block truncate max-w-[150px]">
              {user.email}
            </span>
          )}          
          {/* Profile Button */}
          <button 
            onClick={() => navigate('/profile')} 
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
            title="My Profile"
          >
            <User size={20} />
          </button>

          {/* Logout Button */}
          <button 
            onClick={() => signOut()} 
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Trips</h1>
            <p className="text-gray-500 mt-1">Manage your upcoming adventures</p>
          </div>
          <button 
            onClick={() => navigate('/create-trip')} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 shadow-md transition transform hover:scale-105"
          >
            <PlusCircle className="h-5 w-5 mr-2" /> Create Trip
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p>Loading your trips...</p>
          </div>
        ) : trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-10 w-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No trips yet</h3>            <p className="text-gray-500 mt-1 mb-6">Get started by creating your first trip!</p>
            <button 
              onClick={() => navigate('/create-trip')}
              className="text-indigo-600 font-medium hover:underline"
            >
              Create a Trip &rarr;
            </button>
          </div>
        ) : (
          /* Trips Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <div 
                key={trip.id} 
                onClick={() => navigate(`/dashboard/${trip.id}`)} 
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md cursor-pointer border border-gray-100 transition group transform hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition line-clamp-1">
                    {trip.name}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    trip.mode === 'AI' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {trip.mode}
                  </span>
                </div>
                
                <p className="text-gray-500 text-sm flex items-center gap-1 mb-2">
                  <MapPin size={14} /> 
                  <span className="truncate">{trip.destination}</span>
                </p>
                
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                  <span>{new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span>&rarr;</span>
                  <span>{new Date(trip.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}