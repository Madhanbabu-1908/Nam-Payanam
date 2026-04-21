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
import SettlementsPage from './pages/SettlementsPage';
import CheckinPage from './pages/CheckinPage';
import LiveMapPage from './pages/LiveMapPage';       // ✅ Ensure this is imported
import DriverSimulator from './pages/DriverSimulator'; // ✅ Ensure this is imported
import PublicTrackPage from './pages/PublicTrackPage'; // ✅ Ensure this is imported

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div></div>;
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
      <Route path="/track/:token" element={<PublicTrackPage />} /> {/* Public */}
      
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