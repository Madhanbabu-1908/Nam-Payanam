import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, MapPin, CheckCircle, Clock, Users, Send } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function CheckinPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (!tripId) return;

    fetchCheckins();

    const interval = setInterval(fetchCheckins, 30000);
    return () => clearInterval(interval);
  }, [tripId]);

  const fetchCheckins = async () => {
    try {
      const res = await api.get(`/checkins/trip/${tripId}`);
      if (res.data.success) {
        setCheckins(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load check-ins", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!location.trim()) {
      alert("Please enter your location");
      return;
    }

    setCheckingIn(true);
    try {
      await api.post('/checkins', {
        tripId,
        locationName: location,
        status: 'PRESENT'
      });

      setLocation('');
      await fetchCheckins();
      alert("✅ Checked in successfully!");
    } catch (e: any) {
      alert("❌ Failed to check in: " + (e.response?.data?.error || e.message));
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300">

      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 flex items-center gap-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
        >
          <ArrowLeft className="text-slate-600 dark:text-slate-300" />
        </button>

        <h1 className="font-bold text-lg text-slate-800 dark:text-white">
          Safety Check-in
        </h1>
      </header>

      <main className="p-6 space-y-6 max-w-3xl mx-auto">

        {/* Check-in Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">

          <h2 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-lg">
            <MapPin className="text-indigo-600" />
            Where are you right now?
          </h2>

          {/* ✅ FIXED MOBILE LAYOUT */}
          <div className="flex flex-col gap-3">

            <input
              type="text"
              placeholder="e.g., Hotel Lobby, Bus Stop, Trekking Point"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={checkingIn}
              className="w-full p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-slate-400"
            />

            <Button
              onClick={handleCheckIn}
              isLoading={checkingIn}
              disabled={checkingIn || !location.trim()}
              className="w-full sm:w-auto px-6 py-3 flex items-center justify-center gap-2 text-lg font-semibold rounded-xl"
            >
              <Send size={18} />
              Check In
            </Button>

          </div>
        </div>

        {/* Group Status */}
        <div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 text-lg">
              <Users size={20} />
              Group Status
            </h3>

            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
              {checkins.length} Members Active
            </span>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-3"></div>
              <p className="text-slate-400">Loading group status...</p>
            </div>
          ) : checkins.length === 0 ? (

            /* Empty State */
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center border border-dashed border-slate-300 dark:border-slate-700">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                No one has checked in yet.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Be the first to share your location!
              </p>
            </div>

          ) : (

            /* List */
            <div className="space-y-3">
              {checkins.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center hover:shadow-md transition"
                >

                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      c.status === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {c.status === 'PRESENT'
                        ? <CheckCircle size={24} />
                        : <Clock size={24} />}
                    </div>

                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-base">
                        {c.user?.email?.split('@')[0] || c.user?.full_name || 'Member'}
                      </p>

                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={14} />
                        {c.location_name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full block mb-1 ${
                      c.status === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {c.status}
                    </span>

                    <p className="text-xs text-slate-400">
                      {new Date(c.checked_in_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                </div>
              ))}
            </div>

          )}

        </div>

      </main>
    </div>
  );
}