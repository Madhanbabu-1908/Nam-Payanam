// Add this import at the top
import ProfilePage from './pages/ProfilePage';

// ... inside AppRoutes component ...
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  
  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
  <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
  
  {/* ✅ NEW: Global Profile Route */}
  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

  {/* Trip Routes */}
  <Route path="/dashboard/:tripId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/dashboard/:tripId/itinerary" element={<ProtectedRoute><ItineraryPage /></ProtectedRoute>} />
  <Route path="/dashboard/:tripId/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
  <Route path="/dashboard/:tripId/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
  <Route path="/dashboard/:tripId/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
  
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>