import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage          from './pages/HomePage.jsx';
import CreateTripPage    from './pages/CreateTripPage.jsx';
import TripDashboard     from './pages/TripDashboard.jsx';
import PublicTrackerPage from './pages/PublicTrackerPage.jsx';
import OrgLoginPage      from './pages/OrgLoginPage.jsx';

function JoinRedirect() {
  const { code } = useParams();
  return <Navigate to={`/trip/${code}`} replace/>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{
        duration: 4000,
        style: { borderRadius:'14px', background:'#1e1b4b', color:'#f8fafc',
          fontSize:'13px', fontFamily:'DM Sans,sans-serif', fontWeight:600,
          padding:'12px 16px', maxWidth:'340px' },
        success: { iconTheme:{ primary:'#10b981', secondary:'#f8fafc' } },
        error:   { iconTheme:{ primary:'#ef4444', secondary:'#f8fafc' } },
      }}/>
      <Routes>
        <Route path="/"             element={<HomePage/>}/>
        <Route path="/organiser"    element={<OrgLoginPage/>}/>
        <Route path="/create"       element={<CreateTripPage/>}/>
        <Route path="/trip/:code"   element={<TripDashboard/>}/>
        <Route path="/join/:code"   element={<JoinRedirect/>}/>
        <Route path="/track/:token" element={<PublicTrackerPage/>}/>
        <Route path="*"             element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  );
}
