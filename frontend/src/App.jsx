import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState, useEffect, lazy, Suspense } from 'react';
import { AlertProvider } from './components/AlertNotifier';
import Sidebar from './components/Sidebar';
import ChatbotWidget from './components/ChatbotWidget';
import './index.css';

// Lazy-loaded pages (code splitting agar loading awal di HP nelayan sangat ringan)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MapPage = lazy(() => import('./pages/MapPage'));
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'));
const BiotaPage = lazy(() => import('./pages/BiotaPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const DigitalTwinPage = lazy(() => import('./pages/DigitalTwinPage'));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const OperatorPage = lazy(() => import('./pages/OperatorPage'));
const SensorFormPage = lazy(() => import('./pages/SensorFormPage'));
const BiotaFormPage = lazy(() => import('./pages/BiotaFormPage'));
const OperatorAccountFormPage = lazy(() => import('./pages/OperatorAccountFormPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

const PageLoader = () => (
  <div className="loading-container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="spinner" />
  </div>
);

// Layout pembungkus untuk halaman yang memerlukan autentikasi
const ProtectedLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      <ChatbotWidget />
    </div>
  );
};

// Guard khusus untuk halaman operator dan admin
const OperatorRoute = ({ isAuthenticated, userRole, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (userRole !== 'operator' && userRole !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('pengguna'); // 'pengguna' | 'operator' | 'admin'

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  // Cek sesi login yang tersimpan saat pertama kali buka
  useEffect(() => {
    const savedUser = localStorage.getItem('ocean_user');
    const savedRole = localStorage.getItem('ocean_role');
    if (savedUser && savedRole) {
      setIsAuthenticated(true);
      setUserRole(savedRole);
    } else {
      setIsAuthenticated(false);
      setUserRole('pengguna');
    }
  }, []);

  const handleLogin = (role = 'pengguna', wilayah = '', provinsi = '') => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('ocean_role', role);
    if (!localStorage.getItem('ocean_user')) {
      localStorage.setItem('ocean_user', JSON.stringify({ role, name: role === 'admin' ? 'Administrator' : role === 'operator' ? 'Operator' : 'Pengguna Publik' }));
    }
    if (wilayah) localStorage.setItem('ocean_wilayah', wilayah);
    if (provinsi) localStorage.setItem('ocean_provinsi', provinsi);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('pengguna');
    localStorage.removeItem('ocean_user');
    localStorage.removeItem('ocean_role');
    localStorage.removeItem('ocean_wilayah');
    localStorage.removeItem('ocean_provinsi');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AlertProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />
            } />
            <Route path="/register" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage onLogin={handleLogin} />
            } />
            <Route path="/terms" element={<TermsPage />} />

          {/* Protected Routes — semua role */}
          <Route path="/dashboard" element={isAuthenticated ? <ProtectedLayout><Dashboard userRole={userRole} onLogout={handleLogout} /></ProtectedLayout> : <Navigate to="/login" />} />
          <Route path="/map" element={isAuthenticated ? <ProtectedLayout><MapPage /></ProtectedLayout> : <Navigate to="/login" />} />
          <Route path="/digital-twin" element={isAuthenticated ? <ProtectedLayout><DigitalTwinPage /></ProtectedLayout> : <Navigate to="/login" />} />
          <Route path="/monitoring" element={isAuthenticated ? <ProtectedLayout><MonitoringPage /></ProtectedLayout> : <Navigate to="/login" />} />
          <Route path="/monitoring/:sensorId" element={isAuthenticated ? <ProtectedLayout><MonitoringPage /></ProtectedLayout> : <Navigate to="/login" />} />
          <Route path="/biota" element={isAuthenticated ? <ProtectedLayout><BiotaPage /></ProtectedLayout> : <Navigate to="/login" />} />
          <Route path="/alerts" element={isAuthenticated ? <ProtectedLayout><AlertsPage /></ProtectedLayout> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <ProtectedLayout><ProfilePage /></ProtectedLayout> : <Navigate to="/login" />} />
          {/* Operator-Only Routes */}
          <Route path="/operator" element={
            <OperatorRoute isAuthenticated={isAuthenticated} userRole={userRole}>
              <ProtectedLayout><OperatorPage userRole={userRole} onLogout={handleLogout} /></ProtectedLayout>
            </OperatorRoute>
          } />
          <Route path="/operator/sensors/add" element={<OperatorRoute isAuthenticated={isAuthenticated} userRole={userRole}><ProtectedLayout><SensorFormPage /></ProtectedLayout></OperatorRoute>} />
          <Route path="/operator/sensors/edit/:sensorId" element={<OperatorRoute isAuthenticated={isAuthenticated} userRole={userRole}><ProtectedLayout><SensorFormPage /></ProtectedLayout></OperatorRoute>} />
          <Route path="/operator/biota/add" element={<OperatorRoute isAuthenticated={isAuthenticated} userRole={userRole}><ProtectedLayout><BiotaFormPage /></ProtectedLayout></OperatorRoute>} />
          <Route path="/operator/biota/edit/:biotaId" element={<OperatorRoute isAuthenticated={isAuthenticated} userRole={userRole}><ProtectedLayout><BiotaFormPage /></ProtectedLayout></OperatorRoute>} />
          <Route path="/operator/accounts/add" element={<OperatorRoute isAuthenticated={isAuthenticated} userRole={userRole}><ProtectedLayout><OperatorAccountFormPage /></ProtectedLayout></OperatorRoute>} />
          <Route path="/operator/accounts/edit/:operatorId" element={<OperatorRoute isAuthenticated={isAuthenticated} userRole={userRole}><ProtectedLayout><OperatorAccountFormPage /></ProtectedLayout></OperatorRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} />} />
        </Routes>
        </Suspense>
      </AlertProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
