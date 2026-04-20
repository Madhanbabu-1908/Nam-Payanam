import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { Button } from '../components/common/Button';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
  const [formData, setFormData] = useState({ name: '', destination: '', start_date: '', end_date: '', budget: '', interests: '', start_location: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, budget: parseFloat(formData.budget), mode, interests: formData.interests.split(',').map((s: string) => s.trim()) };
      const res = await api.post('/trips', payload);
      navigate(`/dashboard/${res.data.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create trip');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow">
        <h2 className="text-2xl font-bold mb-6">Create New Trip</h2>
        <div className="flex mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button onClick={() => setMode('AI')} className={`px-4 py-1 rounded ${mode === 'AI' ? 'bg-white shadow' : ''}`}>AI Plan</button>
          <button onClick={() => setMode('MANUAL')} className={`px-4 py-1 rounded ${mode === 'MANUAL' ? 'bg-white shadow' : ''}`}>Manual</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Trip Name" className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input required placeholder="Destination" className="w-full p-2 border rounded" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
          {mode === 'AI' && <input required placeholder="Start Location" className="w-full p-2 border rounded" value={formData.start_location} onChange={e => setFormData({...formData, start_location: e.target.value})} />}
          <div className="grid grid-cols-2 gap-4">
            <input type="date" required className="p-2 border rounded" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            <input type="date" required className="p-2 border rounded" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
          </div>
          <input type="number" required placeholder="Budget" className="w-full p-2 border rounded" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
          {mode === 'AI' && <textarea placeholder="Interests (comma separated)" className="w-full p-2 border rounded" rows={3} value={formData.interests} onChange={e => setFormData({...formData, interests: e.target.value})} />}
          <Button type="submit" isLoading={loading} className="w-full">Create Trip</Button>
        </form>
      </div>
    </div>
  );
}