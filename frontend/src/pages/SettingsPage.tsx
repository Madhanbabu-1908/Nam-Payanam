import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { api } from '../config/api';
import { supabase } from '../config/supabaseClient';
import { Button } from '../components/common/Button';

export default function SettingsPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // --- Logic to Delete Trip ---
  const handleDeleteTrip = async () => {
    if (!tripId) return;
    const confirmed = window.confirm("⚠️ Are you sure? This will delete the trip and all its data.");
    if (!confirmed) return;

    setIsDeletingTrip(true);
    try {
      await api.delete(`/trips/${tripId}`);
      alert("Trip deleted successfully!");
      navigate('/');
    } catch (error: any) {
      alert("Failed to delete trip: " + (error.response?.data?.error || error.message));
    } finally {
      setIsDeletingTrip(false);
    }
  };

  // --- Logic to Delete Account ---
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ DANGER: This will PERMANENTLY delete your account, ALL your trips, expenses, and data. This cannot be undone. Are you absolutely sure?"
    );

    if (!confirmed) return;

    setIsDeletingAccount(true);
    try {
      // Call backend to delete user from Auth and DB
      await api.delete('/auth/account');
      
      alert('Account deleted successfully. Goodbye!');
      
      // Sign out locally
      await supabase.auth.signOut();
      
      // Redirect to home/login      window.location.href = '/login';
    } catch (error: any) {
      console.error("Delete account error:", error);
      alert('Failed to delete account: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        
        {/* Section 1: Trip Management (Only visible if inside a trip context) */}
        {tripId && (
          <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
              <Trash2 className="text-red-600 h-6 w-6" />
              <h2 className="text-lg font-bold text-red-800">Trip Danger Zone</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Deleting this trip will remove all itinerary items, expenses, and member associations permanently.</p>
              <Button variant="danger" onClick={handleDeleteTrip} isLoading={isDeletingTrip}>
                Delete This Trip
              </Button>
            </div>
          </div>
        )}

        {/* Section 2: Account Management */}
        <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
            <LogOut className="text-red-600 h-6 w-6" />
            <h2 className="text-lg font-bold text-red-800">Account Danger Zone</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
              <AlertTriangle className="text-yellow-600 h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> Deleting your account is irreversible. It will remove:
                <ul className="list-disc list-inside mt-1 ml-1">
                  <li>Your login credentials</li>                  <li>All trips you created (and their data)</li>
                  <li>Your membership in other trips</li>
                  <li>All expenses you recorded</li>
                </ul>
              </p>
            </div>
            
            <Button variant="danger" onClick={handleDeleteAccount} isLoading={isDeletingAccount} className="w-full sm:w-auto">
              {isDeletingAccount ? 'Deleting Account...' : 'Delete My Account Permanently'}
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-500 text-sm">
            If you are experiencing issues, please contact support before deleting your account.
          </p>
        </div>

      </main>
    </div>
  );
}