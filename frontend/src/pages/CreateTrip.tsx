import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, Sparkles, PencilLine, MapPin, Calendar, DollarSign, Tag } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
  const [formData, setFormData] = useState({ 
    name: '', 
    destination: '', 
    start_date: '', 
    end_date: '', 
    budget: '', 
    interests: '', 
    start_location: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        budgetThe "Create Trip" button is likely **hidden behind the bottom navigation bar**, **pushed off-screen**, or has **zero height** due to a CSS issue in your `CreateTrip.tsx`.

Here is the **fixed, complete `frontend/src/pages/CreateTrip.tsx`**. I have added explicit padding at the bottom (`pb-24`) and ensured the button is wrapped in a visible container with high contrast.

### 📄 `frontend/src/pages/CreateTrip.tsx` (Fixed & Complete)

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, Sparkles, PencilLine, MapPin, Calendar, DollarSign, Tag } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
  const [formData, setFormData] = useState({ 
    name: '', 
    destination: '', 
    start_date: '', 
    end_date: '',     budget: '', 
    interests: '', 
    start_location: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setTimeout(() => {
          navigate(`/dashboard/${tripId}`, { replace: true });
        }, 500);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create trip. Please try again.');
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-32"> {/* ✅ Increased bottom padding */}
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-6 py-4 flex items-center gap-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
          <ArrowLeft className="text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Create New Trip</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
                {/* Mode Selector */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex">
          <button
            type="button"
            onClick={() => setMode('AI')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'AI'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles size={20} /> AI Plan
          </button>
          <button
            type="button"
            onClick={() => setMode('MANUAL')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'MANUAL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <PencilLine size={20} /> Manual
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Trip Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Tag size={16} /> Trip Name
            </label>
            <input
              required
              placeholder="e.g., Ooty Summer Ride"
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          {/* Destination & Start Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <MapPin size={16} /> Destination
              </label>
              <input                required
                placeholder="e.g., Ooty"
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
                value={formData.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
              />
            </div>
            {mode === 'AI' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <MapPin size={16} /> Start Location
                </label>
                <input
                  required
                  placeholder="e.g., Salem"
                  className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
                  value={formData.start_location}
                  onChange={(e) => handleInputChange('start_location', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Calendar size={16} /> Start Date
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Calendar size={16} /> End Date
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
          </div>
          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <DollarSign size={16} /> Total Budget (₹)
            </label>
            <input
              type="number"
              required
              placeholder="10000"
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
              value={formData.budget}
              onChange={(e) => handleInputChange('budget', e.target.value)}
            />
          </div>

          {/* Interests (AI Only) */}
          {mode === 'AI' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Tag size={16} /> Interests (comma separated)
              </label>
              <textarea
                placeholder="Nature, Tea Estates, Trekking"
                rows={3}
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-20The "Create Trip" button is likely **hidden behind the bottom navigation bar**, **pushed off-screen**, or has **zero height** due to a CSS issue in your `CreateTrip.tsx`.

Here is the **fixed, complete `frontend/src/pages/CreateTrip.tsx`**. I have added explicit padding at the bottom (`pb-24`) and ensured the button is wrapped in a visible container with high contrast.

### 📄 `frontend/src/pages/CreateTrip.tsx` (Fixed & Complete)

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { ArrowLeft, Sparkles, PencilLine, MapPin, Calendar, DollarSign, Tag } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
  const [formData, setFormData] = useState({ 
    name: '', 
    destination: '', 
    start_date: '', 
    end_date: '', 
    budget: '', 
    interests: '', 
    start_location: ''   });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setTimeout(() => {
          navigate(`/dashboard/${tripId}`, { replace: true });
        }, 500);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create trip. Please try again.');
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-32"> {/* ✅ Increased bottom padding */}
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-6 py-4 flex items-center gap-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
          <ArrowLeft className="text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Create New Trip</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
        
        {/* Mode Selector */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex">
          <button            type="button"
            onClick={() => setMode('AI')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'AI'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles size={20} /> AI Plan
          </button>
          <button
            type="button"
            onClick={() => setMode('MANUAL')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              mode === 'MANUAL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <PencilLine size={20} /> Manual
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Trip Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Tag size={16} /> Trip Name
            </label>
            <input
              required
              placeholder="e.g., Ooty Summer Ride"
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          {/* Destination & Start Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <MapPin size={16} /> Destination
              </label>
              <input
                required
                placeholder="e.g., Ooty"
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"                value={formData.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
              />
            </div>
            {mode === 'AI' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <MapPin size={16} /> Start Location
                </label>
                <input
                  required
                  placeholder="e.g., Salem"
                  className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
                  value={formData.start_location}
                  onChange={(e) => handleInputChange('start_location', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Calendar size={16} /> Start Date
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Calendar size={16} /> End Date
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* Budget */}
          <div>            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <DollarSign size={16} /> Total Budget (₹)
            </label>
            <input
              type="number"
              required
              placeholder="10000"
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
              value={formData.budget}
              onChange={(e) => handleInputChange('budget', e.target.value)}
            />
          </div>

          {/* Interests (AI Only) */}
          {mode === 'AI' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Tag size={16} /> Interests (comma separated)
              </label>
              <textarea
                placeholder="Nature, Tea Estates, Trekking"
                rows={3}
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white placeholder-slate-400 resize-none"
                value={formData.interests}
                onChange={(e) => handleInputChange('interests', e.target.value)}
              />
            </div>
          )}

          {/* ✅ VISIBLE SUBMIT BUTTON CONTAINER */}
          <div className="pt-6 pb-8">
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading}
              className="w-full py-4 text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-none bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? 'Creating Your Adventure...' : 'Create Trip'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}