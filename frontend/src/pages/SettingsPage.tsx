import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../config/api';
import { Button } from '../components/common/Button';

export default function SettingsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTrip = async () => {
    if (!tripId) return;

    const confirmed = window.confirm(
      "⚠️ Are you absolutely sure? This action cannot be undone. All itinerary items, expenses, member data, and trip details will be permanently deleted."
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await api.delete(`/trips/${tripId}`);
      alert("Trip deleted successfully!");
      navigate('/'); // Redirect to Home
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Failed to delete trip: " + (error.response?.data?.error || error.message));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-6 py-4 flex items-center gap-3 backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
          <ArrowLeft className="text-slate-600 dark:text-slate-300" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Trip Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
        
        {/* Danger Zone Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
            <Trash2 className="text-red-600 dark:text-red-400 h-6 w-6" />            <h2 className="text-lg font-bold text-red-800 dark:text-red-300">Trip Danger Zone</h2>
          </div>
          
          <div className="p-6">
            <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Deleting this trip will permanently remove:
            </p>
            <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 text-sm mb-6 space-y-1 pl-2">
              <li>All itinerary items and AI plans</li>
              <li>All recorded expenses and splits</li>
              <li>Member associations for this trip</li>
              <li>Trip details</li>
            </ul>

            <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800/50 mb-6">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400 h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Warning:</strong> This action is irreversible. Make sure you have exported any important data before proceeding.
              </p>
            </div>

            {/* ✅ VISIBLE DELETE BUTTON */}
            <Button 
              variant="danger" 
              onClick={handleDeleteTrip} 
              isLoading={isDeleting}
              disabled={isDeleting}
              className="w-full sm:w-auto py-3 px-6 text-base font-bold"
            >
              {isDeleting ? 'Deleting Trip...' : 'Delete This Trip Permanently'}
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/50 p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">Looking for Account Settings?</h3>
          <p className="text-blue-700 dark:text-blue-200 text-sm mb-4">
            To delete your entire user account or change your email, please go to your global Profile page.
          </p>
          <button 
            onClick={() => navigate('/profile')}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline text-sm flex items-center gap-1"
          >
            Go to My Profile &rarr;
          </button>
        </div>

      </main>
    </div>  );
}