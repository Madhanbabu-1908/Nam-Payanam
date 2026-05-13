import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../config/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Clock, Calendar, Sparkles, 
  Coffee, Utensils, Camera, Car, Footprints, 
  PlusCircle, X, Save, PenLine, Trash2
} from "lucide-react";
import toast from "react-hot-toast";

type Activity = {
  id: string;
  time_slot: string;
  location_name: string;
  description?: string;
  day_number: number;
  latitude?: number;
  longitude?: number;
};

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
  
  // ✅ State for Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Activity | null>(null);
  const [formData, setFormData] = useState({
    day_number: 1,
    time_slot: '',
    location_name: '',
    description: ''
  });

  const fetchItinerary = async () => {
    try {      const res = await api.get(`/itinerary/${tripId}`);
      setActivities(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch itinerary", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) fetchItinerary();
  }, [tripId]);

  // ✅ Open Modal for Adding
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ day_number: 1, time_slot: '', location_name: '', description: '' });
    setIsModalOpen(true);
  };

  // ✅ Open Modal for Editing
  const handleOpenEdit = (item: Activity) => {
    setEditingItem(item);
    setFormData({
      day_number: item.day_number,
      time_slot: item.time_slot,
      location_name: item.location_name,
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  // ✅ Handle Save (Add or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // Update Existing
        await api.put(`/itinerary/${editingItem.id}`, formData);
        toast.success("Stop updated!");
      } else {
        // Create New
        await api.post(`/itinerary/${tripId}`, formData);
        toast.success("Stop added!");
      }
      setIsModalOpen(false);
      fetchItinerary();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");    }
  };

  // ✅ Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stop?")) return;
    try {
      await api.delete(`/itinerary/${id}`);
      toast.success("Stop deleted");
      fetchItinerary();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  // 🧠 Group by day_number
  const grouped = activities.reduce((acc: any, item) => {
    if (!acc[item.day_number]) acc[item.day_number] = [];
    acc[item.day_number].push(item);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!activities.length) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <Calendar size={40} className="text-brand opacity-50 mb-4"/>
      <h2 className="text-xl font-bold text-[var(--text)]">No Itinerary Yet</h2>
      <button onClick={() => navigate(`/dashboard/${tripId}/ai`)} className="btn-primary mt-4">Generate AI Plan</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 relative">
      
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-[var(--text)]">Your Itinerary</h1>
          <p className="text-[var(--muted)] mt-1">{days.length} Days of Adventure</p>
        </div>
        <button onClick={() => navigate(`/dashboard/${tripId}/ai`)} className="btn-secondary flex items-center gap-2 text-sm">
          <Sparkles size={16}/> Edit with AI
        </button>
      </header>

      <div className="space-y-10">
        {days.map((day, index) => (
          <motion.div key={day} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative">
             <div className="sticky top-20 z-10 bg-[var(--bg)]/95 backdrop-blur-sm py-2 mb-4 border-b border-[var(--border)] flex items-center gap-3">
              <span className="bg-brand text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">{day}</span>              <h2 className="text-lg font-bold text-[var(--text)]">Day {day}</h2>
            </div>

            <div className="relative pl-4 md:pl-8 space-y-6">
              <div className="absolute left-[19px] md:left-[27px] top-2 bottom-4 w-0.5 bg-[var(--border)] -z-10"/>
              
              {grouped[day].map((act: Activity) => (
                <motion.div key={act.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} className="relative group">
                  <div className="absolute -left-[5px] md:-left-[1px] top-4 w-3 h-3 rounded-full bg-brand border-2 border-white shadow-sm z-10"/>
                  
                  {/* Card */}
                  <div className="ml-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                        {getActivityIcon(act.time_slot, act.description)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock size={12}/> {act.time_slot}
                          </span>
                          
                          {/* Edit/Delete Actions */}
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEdit(act)} className="text-[var(--muted)] hover:text-brand p-1"><PenLine size={14}/></button>
                            <button onClick={() => handleDelete(act.id)} className="text-[var(--muted)] hover:text-rose-500 p-1"><Trash2 size={14}/></button>
                          </div>
                        </div>

                        <h3 className="font-bold text-[var(--text)]">{act.location_name}</h3>
                        {act.description && <p className="text-sm text-[var(--muted)] mt-1">{act.description}</p>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ✅ Floating Action Button */}
      <button 
        onClick={handleOpenAdd}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-lg shadow-brand/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <PlusCircle size={24}/>
      </button>
      {/* ✅ Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--surface)] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[var(--border)]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-[var(--text)]">{editingItem ? 'Edit Stop' : 'Add Stop'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)]"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">Day</label>
                  <input type="number" min="1" className="input" value={formData.day_number} onChange={e => setFormData({...formData, day_number: parseInt(e.target.value)})} required />
                </div>
                <div>
                  <label className="label">Time</label>
                  <input type="text" placeholder="10:00 AM" className="input" value={formData.time_slot} onChange={e => setFormData({...formData, time_slot: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Location Name</label>
                  <input type="text" placeholder="Place Name" className="input" value={formData.location_name} onChange={e => setFormData({...formData, location_name: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Description (Optional)</label>
                  <textarea className="input h-20" placeholder="Notes..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                  <Save size={18}/> {editingItem ? 'Update Stop' : 'Add to Itinerary'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}