import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../config/api';
import { Button } from '../components/common/Button';

export default function SettingsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tripId) return;

    const confirmed = window.confirm(
      "⚠️ Are you absolutely sure? This action cannot be undone. All itinerary items, expenses, and member data will be permanently deleted."
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // Call the backend delete endpoint
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Trip Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* Danger Zone Card */}
        <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
            <Trash2 className="text-red-600 h-6 w-6" />
            <h2 className="text-lg font-bold text-red-800">Danger Zone</h2>
          </div>
          
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Deleting this trip will permanently remove:
            </p>
            <ul className="list-disc list-inside text-gray-500 text-sm mb-6 space-y-1">
              <li>All itinerary items and AI plans</li>
              <li>All recorded expenses and splits</li>
              <li>Member associations</li>
              <li>Trip details</li>
            </ul>

            <div className="flex items-start gap-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
              <AlertTriangle className="text-yellow-600 h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> This action is irreversible. Make sure you have exported any important data before proceeding.
              </p>
            </div>

            <Button 
              variant="danger" 
              onClick={handleDelete} 
              isLoading={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? 'Deleting...' : 'Delete Trip Permanently'}
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-2">About This Trip</h3>
          <p className="text-gray-500 text-sm">
            Trip ID: <code className="bg-gray-100 px-2 py-1 rounded">{tripId}</code>
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Created on Nam-Payanam Platform.
          </p>
        </div>

      </main>
    </div>
  );
}