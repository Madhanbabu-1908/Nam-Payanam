import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import {
  ArrowLeft,
  Sparkles,
  PencilLine,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  Plus,
  Trash2,
  Route
} from 'lucide-react';
import { Button } from '../components/common/Button';
import LocationPicker from '../components/map/LocationPicker';

type Mode = 'AI' | 'MANUAL';

type SelectedLocation = {
  lat: number;
  lng: number;
  name: string;
};

type TripStop = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

export default function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('AI');

  const [startCoords, setStartCoords] = useState<SelectedLocation | null>(null);

  const [stops, setStops] = useState<TripStop[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      lat: null,
      lng: null,
    },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    budget: '',
    interests: '',
    start_location: '',
  });

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        lat: null,
        lng: null,
      },
    ]);
  };

  const removeStop = (id: string) => {
    setStops((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((stop) => stop.id !== id);
    });
  };

  const updateStopLocation = (id: string, lat: number, lng: number, name: string) => {
    setStops((prev) =>
      prev.map((stop) =>
        stop.id === id
          ? {
              ...stop,
              name,
              lat,
              lng,
            }
          : stop
      )
    );
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert('Please enter trip name');
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      alert('Please select trip dates');
      return false;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      alert('End date cannot be earlier than start date');
      return false;
    }

    if (!formData.budget || Number(formData.budget) <= 0) {
      alert('Please enter a valid budget');
      return false;
    }

    const validStops = stops.filter(
      (stop) => stop.name.trim() && stop.lat !== null && stop.lng !== null
    );

    if (validStops.length === 0) {
      alert('Please select at least one destination stop');
      return false;
    }

    if (mode === 'AI' && !startCoords) {
      alert('Please select the start location for AI trip planning');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!validateForm()) return;

    setLoading(true);

    try {
      const validStops = stops
        .filter((stop) => stop.name.trim() && stop.lat !== null && stop.lng !== null)
        .map((stop, index) => ({
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          order: index + 1,
        }));

      const payload = {
        ...formData,
        budget: parseFloat(formData.budget),
        mode,
        interests:
          mode === 'AI' && formData.interests
            ? formData.interests.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
        start_location: startCoords?.name || formData.start_location || '',
        start_lat: startCoords?.lat ?? null,
        start_lng: startCoords?.lng ?? null,
        destination: validStops[0]?.name || '',
        destination_lat: validStops[0]?.lat ?? null,
        destination_lng: validStops[0]?.lng ?? null,
        stops: validStops,
      };

      const res = await api.post('/trips', payload);

      if (res.data.success && res.data.data) {
        const tripId = res.data.data.id;
        setTimeout(() => {
          navigate(`/dashboard/${tripId}`, { replace: true });
        }, 500);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create trip.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-32">
      <header className="sticky top-0 z-20 px-4 sm:px-6 py-4 flex items-center gap-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700">
        <button
          onClick={() => navigate(-1)}
          type="button"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
          aria-label="Go back"
        >
          <ArrowLeft className="text-slate-600 dark:text-slate-300" />
        </button>

        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          Create New Trip
        </h1>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
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
            <Sparkles size={20} />
            AI Plan
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
            <PencilLine size={20} />
            Manual
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Tag size={16} />
              Trip Name
            </label>
            <input
              required
              placeholder="e.g., Ooty Summer Ride"
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {mode === 'AI' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <MapPin size={16} />
                Select Start Location on Map
              </label>

              <LocationPicker
                label="Start Location"
                onSelect={(lat, lng, name) => {
                  setStartCoords({ lat, lng, name });
                  setFormData((prev) => ({ ...prev, start_location: name }));
                }}
                initialLat={startCoords?.lat}
                initialLng={startCoords?.lng}
              />

              <p className="text-xs text-slate-500 mt-2">
                Selected:{' '}
                {startCoords
                  ? `${startCoords.name} (${startCoords.lat.toFixed(2)}, ${startCoords.lng.toFixed(2)})`
                  : 'None'}
              </p>
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Route size={18} />
                Trip Stops
              </h2>

              <Button
                type="button"
                variant="secondary"
                onClick={addStop}
                className="px-4 py-2 text-sm"
              >
                <Plus size={16} />
                Add Stop
              </Button>
            </div>

            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-slate-800 dark:text-white">
                    Stop {index + 1}
                  </h3>

                  {stops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStop(stop.id)}
                      className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  )}
                </div>

                <LocationPicker
                  label={`Destination ${index + 1}`}
                  onSelect={(lat, lng, name) => updateStopLocation(stop.id, lat, lng, name)}
                  initialLat={stop.lat ?? undefined}
                  initialLng={stop.lng ?? undefined}
                />

                <p className="text-xs text-slate-500">
                  Selected:{' '}
                  {stop.name && stop.lat !== null && stop.lng !== null
                    ? `${stop.name} (${stop.lat.toFixed(2)}, ${stop.lng.toFixed(2)})`
                    : 'None'}
                </p>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Start Date
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                End Date
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <DollarSign size={16} />
              Total Budget (₹)
            </label>
            <input
              type="number"
              required
              placeholder="10000"
              className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />
          </div>

          {mode === 'AI' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Tag size={16} />
                Interests
              </label>
              <textarea
                placeholder="Nature, Tea Estates, Trekking"
                rows={3}
                className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none text-slate-800 dark:text-white"
                value={formData.interests}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
              />
            </div>
          )}

          <div className="pt-4 pb-8">
            <Button
              type="submit"
              isLoading={loading}
              disabled={loading}
              className="w-full py-4 text-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              {loading ? 'Creating Your Adventure...' : 'Create Trip'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}