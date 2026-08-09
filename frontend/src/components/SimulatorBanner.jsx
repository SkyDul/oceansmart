import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sliders, X, Thermometer, Droplets, CloudLightning, Database, Zap, FlaskConical } from 'lucide-react';

const ANOMALY_META = {
  heatwave: {
    label: 'Marine Heatwave',
    detail: 'Suhu +4°C • DO turun',
    color: '#dc2626',
    bg: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
    border: '#fca5a5',
    icon: Thermometer,
    dot: '#ef4444',
  },
  acidification: {
    label: 'Asidifikasi Laut',
    detail: 'pH turun −1.1',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff, #faf5ff)',
    border: '#c4b5fd',
    icon: Database,
    dot: '#8b5cf6',
  },
  storm: {
    label: 'Badai & Limpasan',
    detail: 'Kekeruhan +15 NTU',
    color: '#1d4ed8',
    bg: 'linear-gradient(135deg, #eff6ff, #f0f9ff)',
    border: '#93c5fd',
    icon: CloudLightning,
    dot: '#3b82f6',
  },
};

function getSandbox() {
  try {
    return JSON.parse(localStorage.getItem('ocean_sandbox')) || { active_anomaly: 'normal', drain_battery: false };
  } catch {
    return { active_anomaly: 'normal', drain_battery: false };
  }
}

export default function SimulatorBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const [sandbox, setSandbox] = useState(getSandbox);
  const [dismissed, setDismissed] = useState(false);
  const [prevAnomaly, setPrevAnomaly] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getSandbox();
      setSandbox(s => {
        // Reset dismissed when anomaly type changes
        if (current.active_anomaly !== s.active_anomaly || current.drain_battery !== s.drain_battery) {
          setDismissed(false);
        }
        return current;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (userRole !== 'pengguna') return null;
  if (location.pathname === '/simulator') return null;
  if (dismissed) return null;

  const hasAnomaly = sandbox.active_anomaly && sandbox.active_anomaly !== 'normal';
  const hasDrain = sandbox.drain_battery;
  if (!hasAnomaly && !hasDrain) return null;

  const meta = ANOMALY_META[sandbox.active_anomaly];
  const Icon = meta?.icon || FlaskConical;
  const accentColor = meta?.color || '#d97706';
  const borderColor = meta?.border || '#fde68a';
  const bgGrad = meta?.bg || 'linear-gradient(135deg, #fffbeb, #fef9c3)';
  const dotColor = meta?.dot || '#eab308';

  return (
    <div style={{
      position: 'fixed',
      bottom: '6rem',      // above chatbot button
      right: '2.5rem',
      zIndex: 9000,
      width: 260,
      borderRadius: '1rem',
      background: bgGrad,
      border: `1.5px solid ${borderColor}`,
      boxShadow: `0 8px 32px ${accentColor}20, 0 2px 8px rgba(0,0,0,0.08)`,
      overflow: 'hidden',
      animation: 'slideUpIn 0.35s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.625rem 0.75rem',
        borderBottom: `1px solid ${borderColor}`,
        background: `${accentColor}10`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Pulsing dot */}
          <span style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: dotColor, animation: 'simPulse 1.5s ease-in-out infinite', opacity: 0.4 }} />
            <span style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: dotColor }} />
          </span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Mode Simulasi
          </span>
        </div>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, display: 'flex', alignItems: 'center' }}>
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '0.75rem' }}>
        {/* Anomaly info */}
        {hasAnomaly && meta && (
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', marginBottom: hasDrain ? '0.625rem' : 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: `${accentColor}15`, border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={accentColor} />
            </div>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: accentColor, lineHeight: 1.2 }}>{meta.label}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{meta.detail}</div>
            </div>
          </div>
        )}

        {/* Battery drain */}
        {hasDrain && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.375rem 0.5rem', background: '#fffbeb', borderRadius: '0.375rem', border: '1px solid #fde68a' }}>
            <Zap size={12} color="#d97706" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706' }}>Pengurasan baterai aktif</span>
          </div>
        )}

        {/* Caption */}
        <div style={{ marginTop: '0.5rem', fontSize: '0.6875rem', color: '#64748b', lineHeight: 1.4 }}>
          Data pada halaman ini adalah hasil simulasi.
        </div>

        {/* Button */}
        <button
          onClick={() => navigate('/simulator')}
          style={{
            marginTop: '0.625rem',
            width: '100%', padding: '0.4rem', borderRadius: '0.5rem',
            border: `1px solid ${borderColor}`,
            background: '#fff', fontSize: '0.75rem', fontWeight: 700,
            color: accentColor, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = `${accentColor}10`}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          <Sliders size={12} /> Kelola Simulator
        </button>
      </div>

      <style>{`
        @keyframes simPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
