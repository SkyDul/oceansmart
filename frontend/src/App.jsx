import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import MonitoringPage from './pages/MonitoringPage';
import BiotaPage from './pages/BiotaPage';
import AlertsPage from './pages/AlertsPage';
import DigitalTwinPage from './pages/DigitalTwinPage';
import ChatbotWidget from './components/ChatbotWidget';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/digital-twin" element={<DigitalTwinPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/monitoring/:sensorId" element={<MonitoringPage />} />
            <Route path="/biota" element={<BiotaPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Routes>
        </main>
        <ChatbotWidget />
      </div>
    </BrowserRouter>
  );
}

export default App;
