import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../config/api";
import { motion } from "framer-motion";

// ✅ UPDATE TYPE TO MATCH BACKEND RESPONSE
type Activity = {
  id: string;
  time_slot: string;      // Backend uses 'time_slot'
  location_name: string;  // Backend uses 'location_name'
  description?: string;   // Backend uses 'description' for notes
  day_number: number;     // Backend uses 'day_number'
};

export default function ItineraryPage() {
  const { tripId } = useParams();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        const res = await api.get(`/itinerary/${tripId}`);

        if (res.data?.data) {
          setActivities(res.data.data);
        } else {
          setActivities([]);
        }
      } catch (err) {
        console.error("Failed to fetch itinerary", err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    if (tripId) fetchItinerary();
  }, [tripId]);

  // 🧠 Group by day_number
  const grouped = activities.reduce((acc: any, item) => {
    // Use day_number instead of day
    if (!acc[item.day_number]) acc[item.day_number] = [];
    acc[item.day_number].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        <motion.div
          animate={{ x: [0, 100, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-4xl"
        >
          🗺️🚗
        </motion.div>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-400">
        No itinerary found. Try generating one.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map((day) => (
        <motion.div
          key={day}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow-lg rounded-2xl p-4"
        >
          <h2 className="text-xl font-bold mb-3">Day {day}</h2>

          <div className="space-y-3">
            {grouped[day].map((act: Activity, i: number) => (
              <div
                key={i}
                className="border-l-4 border-blue-500 pl-3"
              >
                {/* ✅ USE CORRECT FIELD NAMES */}
                <p className="font-semibold">{act.time_slot || '--:--'}</p>
                <p className="text-lg">{act.location_name || 'Unknown Location'}</p>
                
                {/* Use description for notes if available */}
                {act.description && (
                  <p className="text-sm text-gray-500">{act.description}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
