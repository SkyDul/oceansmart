import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, Activity, Fish,
  AlertTriangle, MessageCircle, Waves, Globe
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/map', label: 'Peta SIG', icon: Map },
  { path: '/digital-twin', label: 'Digital Twin', icon: Globe },
  { path: '/monitoring', label: 'Monitoring', icon: Activity },
  { path: '/biota', label: 'Biota Laut', icon: Fish },
  { path: '/alerts', label: 'Peringatan', icon: AlertTriangle, hasBadge: true },
];

export default function Sidebar() {
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    api.get('/alerts?active_only=true&limit=100')
      .then(res => setAlertCount(res.data.length))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Waves size={22} />
        </div>
        <div className="sidebar-text-group">
          <h1>OceanSmart</h1>
          <span>Marine Intelligence</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu Utama</div>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <item.icon size={20} />
            <span className="sidebar-text">{item.label}</span>
            {item.hasBadge && alertCount > 0 && (
              <span className="sidebar-badge">{alertCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="sidebar-bottom-text" style={{ fontSize: '0.6875rem', opacity: 0.4, textAlign: 'center', whiteSpace: 'nowrap' }}>
          OceanSmart v1.0 — Fase 1
        </div>
      </div>
    </aside>
  );
}
