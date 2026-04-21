import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import VehicleLoader from './components/common/VehicleLoader'; // ✅ Import Loader

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
import SettlementsPage from './pages/SettlementsPage';
import CheckinPage from './pages/CheckinPage';
import LiveMapPage from './pages/LiveMapPage';       // ✅ Import Map
import DriverSimulator from './pages/DriverSimulator'; // ✅ Import Simulator
import PublicTrackPage from './pages/PublicTrackPage'; // ✅ Import Public Track

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  // ✅ Use VehicleLoader instead of simple spinner
  if (loading) return <VehicleLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      
      <Route path="/dashboard/:tripId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/itinerary" element={<ProtectedRoute><ItineraryPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/settlements" element={<ProtectedRoute><SettlementsPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/checkin" element={<ProtectedRoute><CheckinPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      
      {/* ✅ MAP ROUTES */}
      <Route path="/dashboard/:tripId/live" element={<ProtectedRoute><LiveMapPage /></ProtectedRoute>} />
      <Route path="/dashboard/:tripId/simulate" element={<ProtectedRoute><DriverSimulator /></ProtectedRoute>} />
      <Route path="/track/:token" element={<PublicTrackPage />} />
      
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