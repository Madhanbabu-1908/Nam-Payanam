import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { supabase } from '../config/supabaseClient';
import { ArrowLeft, AlertTriangle, LogOut, User, ShieldAlert } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ DANGER: This will PERMANENTLY delete your account, ALL your trips, expenses, and data. This cannot be undone. Are you absolutely sure?"
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.delete('/auth/account');
      alert('Account deleted successfully. Goodbye!');
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error: any) {
      alert('Failed to delete account: ' + (error.response?.data?.error || error.message));
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
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <User size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900">{user?.email}</h2>
            <p className="text-sm text-gray-500">ID: {user?.id}</p>
          </div>
        </div>

        {/* Account Danger Zone */}
        <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
            <ShieldAlert className="text-red-600 h-6 w-6" />
            <h2 className="text-lg font-bold text-red-800">Account Danger Zone</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
              <AlertTriangle className="text-yellow-600 h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> Deleting your account is irreversible. It will remove:
                <ul className="list-disc list-inside mt-1 ml-1">
                  <li>Your login credentials</li>
                  <li>All trips you created (and their data)</li>
                  <li>Your membership in other trips</li>
                  <li>All expenses you recorded</li>
                </ul>
              </p>
            </div>
            
            <Button variant="danger" onClick={handleDeleteAccount} isLoading={isDeleting} className="w-full sm:w-auto">
              {isDeleting ? 'Deleting Account...' : 'Delete My Account Permanently'}
            </Button>
          </div>
        </div>

        {/* Logout Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Session</h3>
          <Button variant="secondary" onClick={() => signOut()} className="w-full">
            Sign Out
          </Button>
        </div>

      </main>
    </div>
  );
}