import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, MapPin, Clock, Sun, Moon, Coffee, Download } from 'lucide-react';
import { exportItineraryToPDF } from '../utils/exportPDF';
import { Trip } from '../types';

const getIcon = (time: string) => {
  if (time.toLowerCase().includes('morning')) return <Coffee size={18} />;
  if (time.toLowerCase().includes('afternoon')) return <Sun size={18} />;
  if (time.toLowerCase().includes('evening') || time.toLowerCase().includes('night')) return <Moon size={18} />;
  return <Clock size={18} />;
};

export default function ItineraryPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    
    Promise.all([
      api.get(`/trips/${tripId}`),
      api.get(`/itinerary/trip/${tripId}`).catch(() => ({  { success: true,  [] } }))
    ]).then(([tripRes, itemRes]) => {
      setTrip(tripRes.data.data);
      setItems(itemRes.data.data || []);
      setLoading(false);
    }).catch(console.error);
  }, [tripId]);

  const handleExportPDF = () => {
    if (trip) {
      exportItineraryToPDF(trip.name, trip.destination, items);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div></div>;

  // Group items by day
  const grouped = items.reduce((acc, item) => {
    const day = item.day_number || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<number, any[]>);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><ArrowLeft/></button>
          <h1 className="font-bold text-lg text-slate-800 dark:text-white">Itinerary</h1>
        </div>
        <button 
          onClick={handleExportPDF}
          className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-lg flex items-center gap-2 px-3"
          title="Download PDF"
        >
          <Download size={18} /> <span className="text-sm font-bold hidden sm:inline">PDF</span>
        </button>
      </header>

      <main className="p-4 space-y-6">
        <div id="itinerary-print-area" className="space-y-6">
          
          {/* Trip Info Header */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{trip?.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
              <MapPin size={16}/> {trip?.destination} • {new Date(trip?.start_date || '').toLocaleDateString()} - {new Date(trip?.end_date || '').toLocaleDateString()}
            </p>
          </div>

          {/* Empty State */}
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No itinerary items yet.</p>
            </div>
          ) : (
            /* Itinerary List */
            Object.entries(grouped).map(([day, dayItems]: [string, any[]]) => (
              <div key={day} className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                    {day}
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Day {day}</h2>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                </div>
                
                <div className="space-y-3 relative pl-4 border-l-2 border-indigo-100 dark:border-indigo-900 ml-4">
                  {dayItems.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="relative bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition">
                      <div className="absolute -left-[21px] top-4 w-3 h-3 bg-indigo-400 rounded-full border-2 border-white dark:border-slate-800"></div>
                      <div className="flex justify-between items-start mb-2">                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded flex items-center gap-1">
                          {getIcon(item.time_slot)} {item.time_slot}
                        </span>
                        {item.estimated_cost && <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">₹{item.estimated_cost}</span>}
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <MapPin size={16} className="text-slate-400"/> {item.location_name}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}