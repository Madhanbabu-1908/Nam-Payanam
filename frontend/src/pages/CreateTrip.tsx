import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { Button } from '../components/common/Button';
import { ArrowLeft } from 'lucide-react';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
  const [formData, setFormData] = useState({ 
    name: '', destination: '', start_date: '', end_date: '', budget: '', interests: '', start_location: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;

    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        budget: parseFloat(formData.budget), 
        mode, 
        interests: formData.interests ? formData.interests.split(',').map((s: string) => s.trim()) : [] 
      };
      
      const res = await api.post('/trips', payload);
      
      if (res.data.success && res.data.data) {
        const tripId = res.data.data.id;
        // Small delay to ensure DB replication if any, then navigate
        setTimeout(() => {
          navigate(`/dashboard/${tripId}`, { replace: true });
        }, 500);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create trip. Please try again.');
      setLoading(false); // Only reset loading on error
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 mb-4">          <ArrowLeft className="h-4 w-4 mr-1"/> Back
        </button>
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Create New Trip</h2>
          <p className="text-gray-500 mb-6">Plan your next adventure with AI or manually.</p>
          
          <div className="flex mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button 
              type="button"
              onClick={() => setMode('AI')} 
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'AI' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
            >
              ✨ AI Plan
            </button>
            <button 
              type="button"
              onClick={() => setMode('MANUAL')} 
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${mode === 'MANUAL' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
            >
              📝 Manual
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
              <input required placeholder="e.g., Ooty Summer Ride" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                <input required placeholder="e.g., Ooty" className="w-full p-2 border rounded" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
              </div>
              {mode === 'AI' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Location</label>
                  <input required placeholder="e.g., Salem" className="w-full p-2 border rounded" value={formData.start_location} onChange={e => setFormData({...formData, start_location: e.target.value})} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" required className="w-full p-2 border rounded" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" required className="w-full p-2 border rounded" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
              </div>
            </div>            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget (₹)</label>
              <input type="number" required placeholder="10000" className="w-full p-2 border rounded" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
            </div>
            {mode === 'AI' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interests (comma separated)</label>
                <textarea placeholder="Nature, Tea Estates, Trekking" className="w-full p-2 border rounded" rows={3} value={formData.interests} onChange={e => setFormData({...formData, interests: e.target.value})} />
              </div>
            )}
            {/* ✅ Button is disabled when loading */}
            <Button type="submit" isLoading={loading} className="w-full mt-4" disabled={loading}>
              {loading ? 'Creating Trip...' : 'Create Trip'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}