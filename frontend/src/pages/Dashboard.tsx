import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { 
  MapPin, DollarSign, Users, Settings, ArrowLeft, Calendar, 
  Wallet, ClipboardCheck, PieChart 
} from 'lucide-react';
import { Trip } from '../types';

export default function Dashboard() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ spent: 0, members: 1, daysLeft: 0 });

  useEffect(() => {
    if (!tripId) return;
    
    const fetchData = async () => {
      try {
        const [tripRes, expenseRes] = await Promise.all([
          api.get(`/trips/${tripId}`),
          api.get(`/expenses/${tripId}`).catch(() => ({ data: { success: true, data: [] } }))
        ]);

        if (tripRes.data.success && tripRes.data.data) {
          const t = tripRes.data.data;
          setTrip(t);

          // Calculate Stats
          const totalSpent = expenseRes.data.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;
          
          // Calculate Days Left
          const start = new Date(t.start_date).getTime();
          const end = new Date(t.end_date).getTime();
          const now = new Date().getTime();
          const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

          setStats({ spent: totalSpent, members: 1, daysLeft }); // Members count mock for now
        }
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tripId]);
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="text-center animate-pulse">
          <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center transition-colors duration-300">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Trip Not Found</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">This trip might have been deleted.</p>
          <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { title: 'Itinerary', icon: MapPin, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', path: 'itinerary', desc: 'Daily plans' },
    { title: 'Expenses', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', path: 'expenses', desc: 'Track costs' },
    { title: 'Settlements', icon: PieChart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', path: 'settlements', desc: 'Who owes whom' }, // ✅ New
    { title: 'Check-in', icon: ClipboardCheck, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', path: 'checkin', desc: 'Safety status' }, // ✅ New
    { title: 'Members', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', path: 'members', desc: 'Group info' },
    { title: 'Settings', icon: Settings, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', path: 'settings', desc: 'Options' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10 transition-colors duration-300">
      {/* Glass Header */}
      <header className="sticky top-0 z-20 glass bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition text-slate-600 dark:text-slate-300">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{trip.name}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin size={12} /> {trip.destination}
              </p>
            </div>          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            trip.mode === 'AI' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {trip.mode}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in">
        
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-colors">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-full text-emerald-600 dark:text-emerald-400 mb-2">
              <Wallet size={20} />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Spent</span>
            <span className="font-bold text-slate-800 dark:text-white">₹{stats.spent.toLocaleString()}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-colors">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-full text-blue-600 dark:text-blue-400 mb-2">
              <Users size={20} />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Members</span>
            <span className="font-bold text-slate-800 dark:text-white">{stats.members}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-colors">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-full text-orange-600 dark:text-orange-400 mb-2">
              <Calendar size={20} />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Days Left</span>
            <span className="font-bold text-slate-800 dark:text-white">{stats.daysLeft}</span>
          </div>
        </div>

        {/* Main Info Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-1">{trip.destination}</h2>
            <p className="text-indigo-100 text-sm mb-4 flex items-center gap-2">
              <Calendar size={14} /> 
              {new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}
            </p>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium">
              Budget: ₹{trip.budget.toLocaleString()}
            </div>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -right-10 -top-10 h-40 w-40 bg-white/10 rounded-full blur-2xl"></div>        </div>

        {/* Action Grid */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 px-1">Manage Trip</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(`/dashboard/${tripId}/${item.path}`)}
                className="group bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 text-left flex items-center gap-4"
              >
                <div className={`h-12 w-12 ${item.bg} rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}