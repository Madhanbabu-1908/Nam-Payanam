import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import CreateTrip from './pages/CreateTrip';
import Dashboard from './pages/Dashboard';
import ItineraryPage from './pages/ItineraryPage';
import ExpensesPage from './pages/ExpensesPage';
import MembersPage from './pages/MembersPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import SettlementsPage from './pages/SettlementsPage'; // ✅ New
import CheckinPage from './pages/CheckinPage';       // ✅ New

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Nam-Payanam...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Global Routes */}
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      
      {/* Protected Trip-Specific Routes */}
      <Route path="/dashboard/:tripId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/itinerary" element={<ProtectedRoute><ItineraryPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/settlements" element={<ProtectedRoute><SettlementsPage /></ProtectedRoute>} /> {/* ✅ New */}
      <Route path="/dashboard/:tripId/checkin" element={<ProtectedRoute><CheckinPage /></ProtectedRoute>} />       {/* ✅ New */}
      <Route path="/dashboard/:tripId/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      
      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}