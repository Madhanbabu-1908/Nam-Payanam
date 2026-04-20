import React from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Trip Dashboard</h1>
      </header>
      <main className="p-6">
        <Outlet /> {/* Renders child routes like Itinerary, Expenses */}
      </main>
    </div>
  );
};