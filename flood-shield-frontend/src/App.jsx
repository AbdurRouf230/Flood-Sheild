import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import FloodMapPage from './pages/FloodMapPage';
import IncidentReportingPage from './pages/IncidentReportingPage';
import ReliefLogisticsPage from './pages/ReliefLogisticsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import DecisionSupportPage from './pages/DecisionSupportPage';
import VolunteerHubPage from './pages/VolunteerHubPage';
import DonatePage from './pages/DonatePage';
import TransportPage from './pages/TransportPage';
import RepresentativeHubPage from './pages/RepresentativeHubPage';
import CampaignHubPage from './pages/CampaignHubPage';
import ShelterHubPage from './pages/ShelterHubPage';
import PlatformRegistryPage from './pages/PlatformRegistryPage';
import SOSPage from './pages/SOSPage';
import RescuePanelPage from './pages/RescuePanelPage';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-flood-dark-950 flex flex-col justify-center items-center gap-4">
    <div className="w-12 h-12 rounded-full border-4 border-t-flood-cyan-500 border-slate-800 animate-spin"></div>
    <p className="text-slate-400 text-sm">Validating credentials...</p>
  </div>
);

// Route guard to protect private pages
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
}

// Route guard to redirect authenticated users away from login
function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (currentUser) return <Navigate to="/dashboard" replace />;
  return children;
}

// Route guard that also checks role clearance
function RoleRoute({ children, allowedRoles }) {
  const { currentUser, mongoUser, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/" replace />;

  if (mongoUser && !allowedRoles.includes(mongoUser.role)) {
    return (
      <div className="min-h-screen bg-flood-dark-950 flex flex-col justify-center items-center gap-4 px-6">
        <div className="text-6xl">🚫</div>
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-slate-400 text-center max-w-md">
          This page requires one of the following roles:{' '}
          <span className="text-flood-cyan-400 font-semibold">{allowedRoles.join(', ')}</span>.
          Your current role is{' '}
          <span className="text-rose-400 font-semibold">{mongoUser.role}</span>.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-2 px-5 py-2 rounded-lg bg-flood-cyan-500/10 border border-flood-cyan-500/30 text-flood-cyan-400 hover:bg-flood-cyan-500/20 transition-all text-sm font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return children;
}

function KeepServicesAwake() {
  const { token } = useAuth();

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const origin = String(API).replace(/\/api\/?$/, '');
    const ping = () => {
      fetch(`${origin}/health`).catch(() => {});
      if (token) {
        fetch(`${API}/ai/status`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
    };
    ping();
    const id = setInterval(ping, 8 * 60 * 1000);
    return () => clearInterval(id);
  }, [token]);

  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-flood-dark-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <KeepServicesAwake />
      <Navbar />
      
      <main className="flex-1 w-full flex flex-col">
        <Routes>
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/flood-map" 
            element={
              <ProtectedRoute>
                <FloodMapPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/incidents" 
            element={
              <ProtectedRoute>
                <IncidentReportingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/logistics" 
            element={
              <RoleRoute allowedRoles={['NGO', 'Government']}>
                <ReliefLogisticsPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="/assistant" 
            element={
              <ProtectedRoute>
                <AIAssistantPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/decision-support" 
            element={
              <RoleRoute allowedRoles={['Government']}>
                <DecisionSupportPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="/volunteers" 
            element={
              <ProtectedRoute>
                <VolunteerHubPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/donate" 
            element={
              <ProtectedRoute>
                <DonatePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/representative-hub" 
            element={
              <RoleRoute allowedRoles={['GovRepresentative', 'GovRepLogistics']}>
                <RepresentativeHubPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="/campaign-hub" 
            element={
              <RoleRoute allowedRoles={['NGO', 'NGORepresentative', 'NGORepLogistics', 'Government', 'GovRepLogistics']}>
                <CampaignHubPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="/shelter-hub" 
            element={
              <RoleRoute allowedRoles={['Government', 'GovRepresentative', 'GovRepLogistics']}>
                <ShelterHubPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="/platform-registry" 
            element={
              <RoleRoute allowedRoles={['Government']}>
                <PlatformRegistryPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="/transport" 
            element={
              <RoleRoute allowedRoles={['Volunteer', 'NGO', 'Government', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics']}>
                <TransportPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="/sos" 
            element={
              <ProtectedRoute>
                <SOSPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/rescue-panel" 
            element={
              <RoleRoute allowedRoles={['Volunteer', 'NGO', 'Government', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics']}>
                <RescuePanelPage />
              </RoleRoute>
            } 
          />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
