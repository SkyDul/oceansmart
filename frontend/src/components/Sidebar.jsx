import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, Activity, Fish,
  AlertTriangle, Waves, Globe, Settings, LogOut, User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../api';

const navItemsAll = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/map', label: 'Peta SIG', icon: Map },
  { path: '/digital-twin', label: 'Digital Twin', icon: Globe },
  { path: '/monitoring', label: 'Monitoring', icon: Activity },
  { path: '/biota', label: 'Biota Laut', icon: Fish },
  { path: '/alerts', label: 'Peringatan', icon: AlertTriangle, hasBadge: true },
];

const operatorItems = [
  { path: '/operator', label: 'Panel Operator', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);

  // Ambil data user & role dari localStorage
  const savedUser = JSON.parse(localStorage.getItem('ocean_user') || '{}');
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const userName = savedUser?.name || savedUser?.given_name || 'Pengguna';
  const userPhoto = savedUser?.picture || null;

  useEffect(() => {
    api.get('/alerts?active_only=true&limit=100')
      .then(res => setAlertCount(res.data.length))
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('ocean_user');
    localStorage.removeItem('ocean_role');
    window.location.href = '/';
  };

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
        {navItemsAll.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive || location.pathname.startsWith(item.path) ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span className="sidebar-text">{item.label}</span>
            {item.hasBadge && alertCount > 0 && (
              <span className="sidebar-badge">{alertCount}</span>
            )}
          </NavLink>
        ))}

        {/* Menu khusus Operator */}
        {userRole === 'operator' && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Manajemen</div>
            {operatorItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={20} />
                <span className="sidebar-text">{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User info + Logout */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 'auto', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {userPhoto ? (
            <img src={userPhoto} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={18} color="rgba(255,255,255,0.7)" />
            </div>
          )}
          <div className="sidebar-text" style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '0.6875rem', color: userRole === 'operator' ? '#48cae4' : 'rgba(255,255,255,0.5)', textTransform: 'capitalize', fontWeight: 600 }}>
              {userRole === 'operator' ? 'Role: Operator' : 'Role: Pengguna'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Keluar"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.2)'; e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          <span className="sidebar-text">Keluar</span>
        </button>
      </div>
    </aside>
  );
}
