import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import { AlertProvider } from './components/AlertNotifier';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import MonitoringPage from './pages/MonitoringPage';
import BiotaPage from './pages/BiotaPage';
import AlertsPage from './pages/AlertsPage';
import DigitalTwinPage from './pages/DigitalTwinPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OperatorPage from './pages/OperatorPage';
import SensorFormPage from './pages/SensorFormPage';
import BiotaFormPage from './pages/BiotaFormPage';
import OperatorAccountFormPage from './pages/OperatorAccountFormPage';
import ProfilePage from './pages/ProfilePage';
import ChatbotWidget from './components/ChatbotWidget';
import TermsPage from './pages/TermsPage';
import SimulatorPage from './pages/SimulatorPage';
import './index.css';

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
    if (savedUser) {
      setIsAuthenticated(true);
      setUserRole(savedRole || 'pengguna');
    }
  }, []);

  const handleLogin = (role = 'pengguna', wilayah = '', provinsi = '') => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('ocean_role', role);
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
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage onDemoLogin={() => handleLogin('pengguna')} />
            } />
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />
            } />
            <Route path="/register" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />
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
          <Route path="/simulator" element={isAuthenticated ? <ProtectedLayout><SimulatorPage /></ProtectedLayout> : <Navigate to="/login" />} />

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

          {/* Fallback */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} />} />
        </Routes>
      </AlertProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
