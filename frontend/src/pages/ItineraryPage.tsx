import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../config/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Clock, Calendar, Sparkles, 
  Coffee, Utensils, Camera, Car, Footprints, 
  PlusCircle, AlertCircle
} from "lucide-react";

// ✅ Type matches backend response
type Activity = {
  id: string;
  time_slot: string;
  location_name: string;
  description?: string;
  day_number: number;
  latitude?: number;
  longitude?: number;
};

// Helper to get icon based on description or time
const getActivityIcon = (time: string, desc?: string) => {
  const t = time.toLowerCase();
  const d = (desc || "").toLowerCase();
  
  if (t.includes('breakfast') || t.includes('morning')) return <Coffee size={18} className="text-orange-500"/>;
  if (t.includes('lunch') || d.includes('food') || d.includes('restaurant')) return <Utensils size={18} className="text-rose-500"/>;
  if (t.includes('sightseeing') || d.includes('temple') || d.includes('museum')) return <Camera size={18} className="text-blue-500"/>;
  if (t.includes('drive') || t.includes('travel') || d.includes('km')) return <Car size={18} className="text-indigo-500"/>;
  return <Footprints size={18} className="text-emerald-500"/>;
};

export default function ItineraryPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        const res = await api.get(`/itinerary/${tripId}`);
        setActivities(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch itinerary", err);
        setActivities([]);
      } finally {
        setLoading(false);      }
    };

    if (tripId) fetchItinerary();
  }, [tripId]);

  // 🧠 Group by day_number
  const grouped = activities.reduce((acc: any, item) => {
    if (!acc[item.day_number]) acc[item.day_number] = [];
    acc[item.day_number].push(item);
    return acc;
  }, {});

  const days = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-brand/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-[var(--muted)] font-medium animate-pulse">Loading your plan...</p>
      </div>
    );
  }

  // --- Empty State ---
  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-brand/5 rounded-full flex items-center justify-center mb-6">
          <Calendar size={40} className="text-brand opacity-50"/>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-2">No Itinerary Yet</h2>
        <p className="text-[var(--muted)] max-w-md mb-8">
          Your trip is waiting to be planned. Use our AI assistant to generate a perfect day-by-day schedule in seconds.
        </p>
        <button 
          onClick={() => navigate(`/dashboard/${tripId}/ai`)}
          className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 transition-all"
        >
          <Sparkles size={20}/> Generate AI Itinerary
        </button>
      </div>
    );
  }

  return (    <div className="max-w-4xl mx-auto p-4 pb-20">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-[var(--text)]">Your Itinerary</h1>
          <p className="text-[var(--muted)] mt-1">{days.length} Days of Adventure</p>
        </div>
        <button 
           onClick={() => navigate(`/dashboard/${tripId}/ai`)}
           className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Sparkles size={16}/> Edit with AI
        </button>
      </header>

      <div className="space-y-10">
        {days.map((day, index) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative"
          >
            {/* Day Header */}
            <div className="sticky top-20 z-10 bg-[var(--bg)]/95 backdrop-blur-sm py-2 mb-4 border-b border-[var(--border)] flex items-center gap-3">
              <span className="bg-brand text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-md shadow-brand/20">
                {day}
              </span>
              <h2 className="text-lg font-bold text-[var(--text)]">Day {day}</h2>
              <span className="text-xs font-medium text-[var(--muted)] bg-[var(--surface)] px-2 py-1 rounded-md border border-[var(--border)]">
                {grouped[day].length} Activities
              </span>
            </div>

            {/* Timeline Container */}
            <div className="relative pl-4 md:pl-8 space-y-6">
              {/* Vertical Line */}
              <div className="absolute left-[19px] md:left-[27px] top-2 bottom-4 w-0.5 bg-[var(--border)] -z-10"/>

              {grouped[day].map((act: Activity, i: number) => (
                <motion.div
                  key={act.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="relative group"
                >
                  {/* Timeline Dot */}                  <div className="absolute -left-[5px] md:-left-[1px] top-4 w-3 h-3 rounded-full bg-brand border-2 border-white shadow-sm ring-1 ring-[var(--border)] z-10 group-hover:scale-125 transition-transform"/>

                  {/* Card */}
                  <div className="ml-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      {/* Icon Box */}
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 group-hover:bg-brand/5 group-hover:border-brand/20 transition-colors">
                        {getActivityIcon(act.time_slot, act.description)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                            <Clock size={12}/> {act.time_slot || '--:--'}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-[var(--text)] text-base leading-tight mb-1">
                          {act.location_name || 'Unknown Location'}
                        </h3>
                        
                        {act.description && (
                          <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-2">
                            {act.description}
                          </p>
                        )}
                        
                        {/* Optional: Map Link if coords exist */}
                        {act.latitude && act.longitude && (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${act.latitude},${act.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium mt-2 hover:underline"
                          >
                            <MapPin size={12}/> View on Map
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* End of Day Marker */}
              <div className="relative h-4">
                 <div className="absolute -left-[5px] md:-left-[1px] top-0 w-3 h-3 rounded-full bg-[var(--border)] border-2 border-white z-10"/>
              </div>
            </div>          </motion.div>
        ))}
      </div>
      
      {/* Floating Action Button for Adding Manual Stop (Optional) */}
      <button 
        onClick={() => navigate(`/dashboard/${tripId}/itinerary/add`)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-lg shadow-brand/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <PlusCircle size={24}/>
      </button>
    </div>
  );
}