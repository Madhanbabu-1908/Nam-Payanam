import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { MapPin, DollarSign, Users, ArrowLeft } from 'lucide-react';
import { Trip } from '../types';

export default function Dashboard() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (!tripId) return;
    api.get(`/trips/${tripId}`).then(res => setTrip(res.data.data)).catch(console.error);
  }, [tripId]);

  if (!trip) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold">{trip.name}</h1>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-4 rounded shadow"><p className="text-gray-500">Destination</p><p className="font-bold">{trip.destination}</p></div>
          <div className="bg-white p-4 rounded shadow"><p className="text-gray-500">Budget</p><p className="font-bold">₹{trip.budget}</p></div>
          <div className="bg-white p-4 rounded shadow"><p className="text-gray-500">Mode</p><p className="font-bold">{trip.mode}</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => navigate(`/dashboard/${tripId}/itinerary`)} className="bg-white p-6 rounded-xl shadow hover:shadow-md cursor-pointer"><MapPin className="h-8 w-8 text-primary mb-2"/><h3 className="font-bold">Itinerary</h3></div>
          <div onClick={() => navigate(`/dashboard/${tripId}/expenses`)} className="bg-white p-6 rounded-xl shadow hover:shadow-md cursor-pointer"><DollarSign className="h-8 w-8 text-green-600 mb-2"/><h3 className="font-bold">Expenses</h3></div>
          <div onClick={() => navigate(`/dashboard/${tripId}/settings`)} className="bg-white p-6 rounded-xl shadow hover:shadow-md cursor-pointer"><Users className="h-8 w-8 text-blue-600 mb-2"/><h3 className="font-bold">Settings</h3></div>
        </div>
      </main>
    </div>
  );
}