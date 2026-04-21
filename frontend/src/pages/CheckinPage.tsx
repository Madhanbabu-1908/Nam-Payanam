import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, MapPin, CheckCircle, Clock, Users } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function CheckinPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!tripId) return;
    fetchCheckins();
  }, [tripId]);

  const fetchCheckins = () => {
    api.get(`/checkins/trip/${tripId}`).then(res => {
      if (res.data.success) setCheckins(res.data.data);
      setLoading(false);
    }).catch(console.error);
  };

  const handleCheckIn = async () => {
    if (!location) return alert('Enter location');
    try {
      await api.post('/checkins', { tripId, locationName: location, status: 'PRESENT' });
      setLocation('');
      fetchCheckins();
      alert('Checked in successfully! ✅');
    } catch (e) { alert('Failed to check in'); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 transition-colors duration-300">
      <header className="glass sticky top-0 z-20 px-6 py-4 flex items-center gap-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ArrowLeft className="text-slate-600 dark:text-slate-300"/></button>
        <h1 className="font-bold text-lg text-slate-800 dark:text-white">Safety Check-in</h1>
      </header>

      <main className="p-6 space-y-6 animate-fade-in">
        {/* Input Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <MapPin className="text-indigo-600"/> Where are you?
          </h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g., Hotel Lobby, Bus Stop" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
            <Button onClick={handleCheckIn} className="whitespace-nowrap">Check In</Button>
          </div>
        </div>

        {/* Status List */}
        <div>
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Users size={20}/> Group Status
          </h3>
          {loading ? <p className="text-slate-400">Loading...</p> : checkins.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No check-ins yet.</p>
          ) : (
            <div className="space-y-3">
              {checkins.map((c) => (
                <div key={c.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${c.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {c.status === 'PRESENT' ? <CheckCircle size={20}/> : <Clock size={20}/>}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{c.user?.email || 'User'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin size={12}/> {c.location_name} • {new Date(c.checked_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}