import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import CreateTrip from './pages/CreateTrip';
import Dashboard from './pages/Dashboard';
import ItineraryPage from './pages/ItineraryPage';
// Import ExpensesPage and SettingsPage similarly

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/itinerary" element={<ProtectedRoute><ItineraryPage /></ProtectedRoute>} />
      {/* Add Expenses and Settings routes here */}
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