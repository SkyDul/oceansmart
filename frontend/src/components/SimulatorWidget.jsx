import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sliders, Thermometer, Droplets, Database, CloudLightning,
  RefreshCcw, X, GripHorizontal, BatteryWarning, Wifi, WifiOff, Wrench
} from 'lucide-react';
import '@google/model-viewer';
import api, { getSandboxState } from '../api';
import modelLifePreserver from '../assets/models/LifePreserver.glb';

const ANOMALY_CONFIGS = {
  normal: {
    label: 'Cuaca Normal',
    short: 'Normal',
    desc: 'Parameter laut alami',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    icon: Droplets,
  },
  heatwave: {
    label: 'Heatwave',
    short: 'Heatwave',
    desc: 'Suhu +4°C, DO turun',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    icon: Thermometer,
  },
  acidification: {
    label: 'Asidifikasi',
    short: 'Asam',
    desc: 'pH turun -1.1',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    icon: Database,
  },
  storm: {
    label: 'Badai & Limpasan',
    short: 'Badai',
    desc: 'Keruh +15 NTU',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
    icon: CloudLightning,
  },
};

export default function SimulatorWidget() {
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const [open, setOpen] = useState(false);
  const [sandbox, setSandbox] = useState(() => getSandboxState());
  const [sensorSummary, setSensorSummary] = useState({ total: 0, online: 0, offline: 0, maintenance: 0 });
  const [dragging, setDragging] = useState(false);

  const PANEL_W = 340;
  const BTN_SIZE = 60;

  // Position of the widget (top-left coordinates in viewport, aligned with ChatbotWidget right: 2rem)
  const [pos, setPos] = useState(() => ({
    x: Math.max(16, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 92),
    y: Math.max(16, (typeof window !== 'undefined' ? window.innerHeight : 800) - 164),
  }));

  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    moved: false,
  });

  const clampPos = useCallback((x, y, isOpen) => {
    const w = isOpen ? Math.min(PANEL_W, window.innerWidth - 24) : BTN_SIZE;
    const h = isOpen ? 440 : BTN_SIZE;
    const maxX = Math.max(12, window.innerWidth - w - 12);
    const maxY = Math.max(12, window.innerHeight - h - 12);
    return {
      x: Math.min(Math.max(12, x), maxX),
      y: Math.min(Math.max(12, y), maxY),
    };
  }, []);

  // Re-clamp when opening/closing or resizing window so panel never goes off-screen
  useEffect(() => {
    setPos(prev => clampPos(prev.x, prev.y, open));
  }, [open, clampPos]);

  useEffect(() => {
    const onResize = () => setPos(prev => clampPos(prev.x, prev.y, open));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, clampPos]);

  const loadSensors = useCallback(async () => {
    try {
      const res = await api.get('/sensors');
      const list = Array.isArray(res.data) ? res.data : [];
      setSensorSummary({
        total: list.length,
        online: list.filter(s => s.status_koneksi === 'online').length,
        offline: list.filter(s => s.status_koneksi === 'offline').length,
        maintenance: list.filter(s => s.status_koneksi === 'maintenance').length,
      });
    } catch {
      // ignore background fetch errors
    }
  }, []);

  useEffect(() => {
    if (userRole !== 'pengguna') return;
    loadSensors();
    const sync = () => {
      setSandbox(getSandboxState());
      loadSensors();
    };
    window.addEventListener('ocean_sandbox_updated', sync);
    return () => window.removeEventListener('ocean_sandbox_updated', sync);
  }, [userRole, loadSensors]);

  // Global pointer drag listeners
  useEffect(() => {
    const onPointerMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragRef.current.moved = true;
      }
      setPos(clampPos(dragRef.current.origX + dx, dragRef.current.origY + dy, open));
    };

    const onPointerUp = () => {
      if (!dragRef.current.active) return;
      const wasMoved = dragRef.current.moved;
      dragRef.current.active = false;
      setDragging(false);
      // If it was the closed launcher and user just clicked without dragging, open it
      if (!wasMoved && !open) {
        setOpen(true);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [open, clampPos]);

  if (userRole !== 'pengguna') return null;

  const startDrag = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
    setDragging(true);
  };

  const saveSandbox = (next) => {
    const updated = { ...next, last_run: new Date().toISOString() };
    localStorage.setItem('ocean_sandbox', JSON.stringify(updated));
    setSandbox(updated);
    window.dispatchEvent(new Event('ocean_sandbox_updated'));
  };

  const handleTriggerAnomaly = (key) => {
    saveSandbox({ ...getSandboxState(), active_anomaly: key });
  };

  const handleToggleDrain = () => {
    const cur = getSandboxState();
    saveSandbox({ ...cur, drain_battery: !cur.drain_battery });
  };

  const handleReset = () => {
    localStorage.removeItem('ocean_sandbox');
    const resetState = getSandboxState();
    setSandbox(resetState);
    window.dispatchEvent(new Event('ocean_sandbox_updated'));
  };

  const activeAnomaly = sandbox?.active_anomaly || 'normal';
  const activeCfg = ANOMALY_CONFIGS[activeAnomaly] || ANOMALY_CONFIGS.normal;
  const isModified = activeAnomaly !== 'normal' || Boolean(sandbox?.drain_battery);

  // Collapsed draggable 3D launcher button
  if (!open) {
    return (
      <div
        onPointerDown={startDrag}
        title="Lab Simulasi IoT (Klik untuk buka · Drag untuk pindah posisi)"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: BTN_SIZE,
          height: BTN_SIZE,
          borderRadius: '50%',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: isModified
            ? `drop-shadow(0 6px 16px ${activeCfg.color}99)`
            : 'drop-shadow(0 6px 14px rgba(2, 62, 138, 0.32))',
          cursor: dragging ? 'grabbing' : 'grab',
          zIndex: 9998,
          touchAction: 'none',
          userSelect: 'none',
          overflow: 'visible',
          transition: dragging ? 'none' : 'transform 0.18s ease, filter 0.2s ease',
        }}
      >
        <model-viewer
          src={modelLifePreserver}
          auto-rotate
          rotation-per-second="30deg"
          camera-orbit="20deg 65deg 105%"
          interaction-prompt="none"
          style={{ width: '84px', height: '84px', position: 'absolute', top: '-12px', left: '-12px', background: 'transparent', pointerEvents: 'none' }}
        >
          <div slot="progress-bar" style={{ display: 'none' }} />
        </model-viewer>
        {isModified && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--danger)', width: 12, height: 12,
            borderRadius: '50%', border: '2px solid var(--background)',
            pointerEvents: 'none',
          }} />
        )}
      </div>
    );
  }

  // Open draggable floating panel
  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: Math.min(PANEL_W, typeof window !== 'undefined' ? window.innerWidth - 24 : PANEL_W),
        maxHeight: '82vh',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        borderRadius: '1.125rem',
        boxShadow: '0 24px 56px -8px rgba(2, 62, 138, 0.28), 0 4px 16px rgba(15, 23, 42, 0.08)',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Draggable Header */}
      <div
        onPointerDown={startDrag}
        style={{
          padding: '0.85rem 1rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #023e8a 55%, #0284c7 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GripHorizontal size={15} style={{ opacity: 0.65 }} />
          <div style={{
            width: 28, height: 28, borderRadius: '0.5rem',
            background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sliders size={14} color="#7dd3fc" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Lab Simulasi IoT</span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 800, padding: '2px 7px',
                borderRadius: 999, background: isModified ? activeCfg.color : 'rgba(255,255,255,0.18)',
                color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em',
                boxShadow: isModified ? `0 0 10px ${activeCfg.color}88` : 'none',
              }}>
                {activeCfg.short}
              </span>
            </div>
          </div>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
          title="Tutup Panel"
          style={{
            background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.5rem',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', transition: 'background 0.15s'
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '0.95rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4, background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '0.7rem' }}>
          Drag header untuk geser posisi · perubahan <strong>live</strong>.
        </div>

        {/* 2x2 Borderless Gradient Anomaly Scenarios */}
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Skenario Anomali Laut
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
            {Object.entries(ANOMALY_CONFIGS).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = activeAnomaly === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTriggerAnomaly(key)}
                  style={{
                    padding: '0.7rem 0.75rem',
                    borderRadius: '0.85rem',
                    border: 'none',
                    background: isActive ? cfg.gradient : '#f1f5f9',
                    boxShadow: isActive ? `0 8px 18px -4px ${cfg.color}55` : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '0.5rem',
                      background: isActive ? 'rgba(255,255,255,0.22)' : `${cfg.color}1a`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.18s ease'
                    }}>
                      <Icon size={14} color={isActive ? '#ffffff' : cfg.color} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isActive ? '#ffffff' : '#0f172a', lineHeight: 1.2 }}>
                      {cfg.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: isActive ? 'rgba(255,255,255,0.85)' : '#64748b', fontWeight: 500 }}>{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Borderless Battery Drain Sliding Switch */}
        <button
          onClick={handleToggleDrain}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.7rem 0.85rem', borderRadius: '0.85rem',
            border: 'none',
            background: sandbox?.drain_battery ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#f1f5f9',
            boxShadow: sandbox?.drain_battery ? '0 8px 18px -4px rgba(245, 158, 11, 0.45)' : 'none',
            cursor: 'pointer', transition: 'all 0.18s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '0.5rem',
              background: sandbox?.drain_battery ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BatteryWarning size={15} color={sandbox?.drain_battery ? '#ffffff' : '#64748b'} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sandbox?.drain_battery ? '#ffffff' : '#0f172a' }}>
              Simulasi Baterai Melemah
            </span>
          </div>
          <div style={{
            width: 36, height: 20, borderRadius: 999, padding: 2,
            background: sandbox?.drain_battery ? 'rgba(255,255,255,0.3)' : '#cbd5e1',
            display: 'flex', alignItems: 'center',
            justifyContent: sandbox?.drain_battery ? 'flex-end' : 'flex-start',
            transition: 'all 0.2s ease',
          }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
        </button>

        {/* Borderless Live Sensor Summary */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem',
          padding: '0.6rem', background: '#f1f5f9', borderRadius: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
            <Wifi size={13} color="#10b981" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>{sensorSummary.online} On</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
            <WifiOff size={13} color="#ef4444" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>{sensorSummary.offline} Off</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
            <Wrench size={13} color="#f59e0b" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>{sensorSummary.maintenance} Mtn</span>
          </div>
        </div>

        {/* Borderless Reset Button */}
        {isModified && (
          <button
            onClick={handleReset}
            style={{
              width: '100%', padding: '0.65rem', borderRadius: '0.85rem',
              border: 'none', background: '#fee2e2', color: '#dc2626',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.15s'
            }}
          >
            <RefreshCcw size={14} /> Reset ke Kondisi Normal
          </button>
        )}
      </div>
    </div>
  );
}
