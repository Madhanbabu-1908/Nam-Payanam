import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from '../config/api'; ✅
import { motion } from "framer-motion";

export default function JoinTripPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Joining trip...");

  useEffect(() => {
    const joinTrip = async () => {
      try {
        const tripId = searchParams.get("tripId");

        if (!tripId) {
          setMessage("Invalid invite link");
          setLoading(false);
          return;
        }

        // 🔥 CALL BACKEND JOIN API
        const res = await api.post(`/trip/join/${tripId}`);

        if (res.data.success) {
          setMessage("Successfully joined! Redirecting...");

          // ⏳ small delay for UX
          setTimeout(() => {
            navigate(`/trip/${tripId}`);
          }, 1500);
        } else {
          setMessage(res.data.error || "Failed to join trip");
        }
      } catch (err: any) {
        console.error("Join error:", err);

        if (err.response?.data?.error) {
          setMessage(err.response.data.error);
        } else {
          setMessage("Something went wrong");
        }
      } finally {
        setLoading(false);
      }
    };

    joinTrip();
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        {/* 🚗 Animation */}
        {loading && (
          <motion.div
            animate={{ x: [0, 100, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-4xl"
          >
            🚗💨
          </motion.div>
        )}

        {/* 📝 Message */}
        <p className="text-lg font-semibold">{message}</p>
      </motion.div>
    </div>
  );
}