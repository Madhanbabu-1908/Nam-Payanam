import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login           from './pages/Login';
import Register        from './pages/Register';
import Home            from './pages/Home';
import CreateTrip      from './pages/CreateTrip';
import Dashboard       from './pages/Dashboard';
import ItineraryPage   from './pages/ItineraryPage';
import ExpensesPage    from './pages/ExpensesPage';
import SettlementsPage from './pages/SettlementsPage';
import MembersPage     from './pages/MembersPage';
import LiveMapPage     from './pages/LiveMapPage';
import AIPage          from './pages/AIPage';
import ProfilePage     from './pages/ProfilePage';
import CheckinPage     from './pages/CheckinPage';
import JoinPage        from './pages/JoinPage';
import LoadingScreen   from './components/LoadingScreen';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen/>;
  return user ? <>{children}</> : <Navigate to="/login" replace/>;
}

// Redirect after login if there's a redirect param
function LoginWithRedirect() {
  const navigate = useNavigate();
  const params   = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  const { user } = useAuth();
  if (user) return <Navigate to={redirect || '/'} replace/>;
  return <Login/>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '14px', background: '#111827', color: '#f9fafb',
            fontSize: '13px', fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 600, padding: '12px 16px', maxWidth: '340px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#f9fafb' } },
          error:   { iconTheme: { primary: '#F43F5E', secondary: '#f9fafb' } },
        }}/>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginWithRedirect/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="/join/:tripId" element={<JoinPage/>}/>

          {/* Protected */}
          <Route path="/" element={<Protected><Home/></Protected>}/>
          <Route path="/create-trip" element={<Protected><CreateTrip/></Protected>}/>
          <Route path="/profile"     element={<Protected><ProfilePage/></Protected>}/>

          <Route path="/dashboard/:tripId"             element={<Protected><Dashboard/></Protected>}/>
          <Route path="/dashboard/:tripId/itinerary"   element={<Protected><ItineraryPage/></Protected>}/>
          <Route path="/dashboard/:tripId/expenses"    element={<Protected><ExpensesPage/></Protected>}/>
          <Route path="/dashboard/:tripId/settlements" element={<Protected><SettlementsPage/></Protected>}/>
          <Route path="/dashboard/:tripId/members"     element={<Protected><MembersPage/></Protected>}/>
          <Route path="/dashboard/:tripId/map"         element={<Protected><LiveMapPage/></Protected>}/>
          <Route path="/dashboard/:tripId/ai"          element={<Protected><AIPage/></Protected>}/>
          <Route path="/dashboard/:tripId/checkin"     element={<Protected><CheckinPage/></Protected>}/>

          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
