import { useState, useEffect } from 'react';
import {
  Sliders, Radio, Wifi, WifiOff, RefreshCw, Zap, SlidersHorizontal,
  CloudLightning, Thermometer, Droplets, Database, Shield, Users, RefreshCcw
} from 'lucide-react';
import api from '../api';

export default function SimulatorPage() {
  const [simulatorStatus, setSimulatorStatus] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const userWilayah = localStorage.getItem('ocean_wilayah') || '';

  const fetchStatusAndSensors = async () => {
    try {
      const [statusRes, sensorsRes] = await Promise.all([
        api.get('/simulator/status'),
        api.get('/sensors')
      ]);
      setSimulatorStatus(statusRes.data);
      // Filter sensors if operator has specific wilayah
      let sensorList = sensorsRes.data;
      if (userRole === 'operator' && userWilayah) {
        sensorList = sensorList.filter(s => s.wilayah === userWilayah);
      }
      setSensors(sensorList);
    } catch (e) {
      console.error("Gagal mengambil data simulator:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndSensors();
    // Auto-update every 10 seconds to align with scheduler
    const interval = setInterval(fetchStatusAndSensors, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerAnomaly = async (anomaly) => {
    setActionLoading(true);
    try {
      await api.post('/simulator/trigger', { active_anomaly: anomaly });
      await fetchStatusAndSensors();
    } catch (e) {
      alert("Gagal memicu anomali: " + (e.response?.data?.detail || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBatteryDrain = async (val) => {
    setActionLoading(true);
    try {
      await api.post('/simulator/trigger', { drain_battery: val });
      await fetchStatusAndSensors();
    } catch (e) {
      alert("Gagal mengubah status drain baterai: " + (e.response?.data?.detail || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCycleStatus = async (sensorId, currentStatus) => {
    setActionLoading(true);
    const statuses = ['online', 'offline', 'maintenance'];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];
    try {
      await api.post(`/simulator/sensors/${sensorId}/status`, { status: nextStatus });
      await fetchStatusAndSensors();
    } catch (e) {
      alert("Gagal mengubah status sensor: " + (e.response?.data?.detail || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecharge = async (sensorId) => {
    setActionLoading(true);
    try {
      await api.post(`/simulator/sensors/${sensorId}/recharge`);
      await fetchStatusAndSensors();
    } catch (e) {
      alert("Gagal mengisi baterai: " + (e.response?.data?.detail || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSimulator = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mereset seluruh simulator? Semua sensor akan kembali ONLINE, baterai 100%, dan anomali dibersihkan.")) return;
    setActionLoading(true);
    try {
      await api.post('/simulator/reset');
      await fetchStatusAndSensors();
    } catch (e) {
      alert("Gagal mereset simulator: " + (e.response?.data?.detail || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', flexDirection: 'column', gap: 12 }}>
        <RefreshCw className="animate-spin" size={32} color="#023e8a" />
        <span style={{ color: '#64748b', fontWeight: 600 }}>Memuat Panel Simulator IoT...</span>
      </div>
    );
  }

  // Define colors for anomalies
  const anomalyConfigs = {
    normal: { label: "Cuaca Normal", desc: "Parameter laut fluktuatif alami.", color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0", icon: Droplets },
    heatwave: { label: "Marine Heatwave", desc: "Suhu air naik ekstrim (+4°C), DO turun.", color: "#ef4444", bg: "#fef2f2", border: "#fecaca", icon: Thermometer },
    acidification: { label: "Asidifikasi Air Laut", desc: "Kadar keasaman melonjak (pH turun -1.1).", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", icon: Database },
    storm: { label: "Badai & Limpasan Air", desc: "Salinitas anjlok, kekeruhan tinggi (+15 NTU).", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", icon: CloudLightning }
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #023e8a, #0077b6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(2,62,138,0.2)' }}>
            <Sliders size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Pusat Kendali Simulator IoT</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Simulasikan anomali lingkungan, kelola status sensor, dan pantau siklus telemetri.</p>
          </div>
        </div>
        
        {/* Top Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={fetchStatusAndSensors} 
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: '0.875rem', transition: 'all 0.2s' }}
          >
            <RefreshCw size={16} className={actionLoading ? "animate-spin" : ""} /> Refresh
          </button>
          
          <button 
            onClick={handleResetSimulator} 
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 1.25rem', background: '#dc2626', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700, color: '#fff', fontSize: '0.875rem', boxShadow: '0 2px 8px rgba(220,38,38,0.25)', transition: 'all 0.2s' }}
          >
            <RefreshCcw size={16} /> Reset Simulator
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <span>Status Anomali Aktif</span>
            <Radio size={16} color={anomalyConfigs[simulatorStatus?.active_anomaly]?.color} />
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: anomalyConfigs[simulatorStatus?.active_anomaly]?.color }}>
            {anomalyConfigs[simulatorStatus?.active_anomaly]?.label}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {anomalyConfigs[simulatorStatus?.active_anomaly]?.desc}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <span>Pengurangan Baterai</span>
            <Zap size={16} color={simulatorStatus?.drain_battery ? "#eab308" : "#94a3b8"} />
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a' }}>
            {simulatorStatus?.drain_battery ? "AKTIF" : "NON-AKTIF"}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {simulatorStatus?.drain_battery ? "Baterai sensor berkurang 1% tiap run" : "Baterai terkunci / statis"}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <span>Stasiun Sensor</span>
            <Wifi size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span>{simulatorStatus?.sensors_summary?.online}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b' }}>/ {simulatorStatus?.sensors_summary?.total} Online</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {simulatorStatus?.sensors_summary?.offline} offline • {simulatorStatus?.sensors_summary?.maintenance} maintenance
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <span>Jadwal Background Task</span>
            <Database size={16} color="#6d28d9" />
          </div>
          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#0f172a' }}>
            Aktif (10s)
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            Last run: {simulatorStatus?.last_run ? new Date(simulatorStatus.last_run).toLocaleTimeString() : "-"}
          </div>
        </div>
      </div>

      {/* Role Interactivity Info Panel */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '1.5rem', borderRadius: '1rem', color: '#fff', marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.15)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} /> Integrasi & Hak Akses Peran (Roles Interaction)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div style={{ borderLeft: '3px solid #38bdf8', paddingLeft: '0.875rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={14} color="#38bdf8" /> Admin / Developer
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
              Dapat memicu bencana global (*anomaly events*) seperti Heatwave dan Asidifikasi, serta mengelola akun Operator Wilayah.
            </p>
          </div>
          <div style={{ borderLeft: '3px solid #10b981', paddingLeft: '0.875rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} color="#10b981" /> Operator Wilayah
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
              Mengontrol status aktif stasiun sensor dan baterai di wilayahnya ({userWilayah || "Nasional"}). Bertugas menyelesaikan alert.
            </p>
          </div>
          <div style={{ borderLeft: '3px solid #fbbf24', paddingLeft: '0.875rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={14} color="#fbbf24" /> Pengguna Umum / Nelayan
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
              Mendapatkan visualisasi data real-time, grafik tren interaktif, warning darurat, dan informasi edukasi via Chatbot AI.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Scenarios & Battery Config */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Scenarios Panel */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={18} color="#023e8a" /> Pemicu Skenario Lingkungan
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 1.25rem 0' }}>
            Pilih skenario untuk menyuntikkan data anomali ke seluruh sensor yang aktif.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(anomalyConfigs).map(([key, config]) => {
              const IconComp = config.icon;
              const isActive = simulatorStatus?.active_anomaly === key;
              return (
                <div 
                  key={key} 
                  onClick={() => !actionLoading && handleTriggerAnomaly(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: '1.5px solid',
                    borderColor: isActive ? config.color : '#e2e8f0',
                    background: isActive ? config.bg : '#fff',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s',
                    boxShadow: isActive ? `0 4px 12px ${config.color}15` : 'none'
                  }}
                  onMouseEnter={e => {
                    if (!isActive && !actionLoading) {
                      e.currentTarget.style.borderColor = config.color;
                      e.currentTarget.style.boxShadow = `0 4px 10px ${config.color}08`;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: isActive ? '#fff' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isActive ? `1.5px solid ${config.color}` : 'none',
                    color: config.color,
                    flexShrink: 0
                  }}>
                    <IconComp size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {config.label}
                      {isActive && (
                        <span style={{ fontSize: '0.65rem', background: config.color, color: '#fff', padding: '0.1rem 0.4rem', borderRadius: 999, fontWeight: 700 }}>
                          AKTIF
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>{config.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Battery & Maintenance Config */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#eab308" /> Simulasi Sistem Daya
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 1.25rem 0' }}>
            Simulasikan penurunan daya baterai pada stasiun pemantauan laut dari waktu ke waktu.
          </p>

          <div style={{
            padding: '1.25rem',
            borderRadius: '0.75rem',
            background: simulatorStatus?.drain_battery ? '#fffbeb' : '#f8fafc',
            border: '1px solid',
            borderColor: simulatorStatus?.drain_battery ? '#fef3c7' : '#e2e8f0',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>Battery Drain Simulation</span>
              <button 
                onClick={() => handleToggleBatteryDrain(!simulatorStatus?.drain_battery)}
                disabled={actionLoading}
                style={{
                  width: 52,
                  height: 26,
                  borderRadius: 13,
                  background: simulatorStatus?.drain_battery ? '#023e8a' : '#cbd5e1',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: simulatorStatus?.drain_battery ? 29 : 3,
                  transition: 'left 0.2s'
                }} />
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Bila diaktifkan, tingkat baterai sensor akan berkurang 1% setiap kali telemetri baru dihasilkan. Jika daya menyentuh 0%, sensor akan mati secara otomatis dan sistem akan menembakkan alert peringatan.
            </p>
          </div>

          <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', background: '#fff' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Aturan Status Sensor</h4>
            <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>🔴 <b>OFFLINE:</b> Sensor tidak mengirimkan data telemetry dan statusnya abu-abu.</li>
              <li>🔵 <b>MAINTENANCE:</b> Sensor dalam perawatan, tidak memproduksi data telemetry baru.</li>
              <li>🟢 <b>ONLINE:</b> Sensor normal, memproduksi data telemetry secara konstan setiap 10 detik.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sensor Control Grid */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wifi size={18} color="#0096c7" /> Panel Kontrol Telemetry Sensor ({sensors.length})
        </h2>

        {sensors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', border: '2px dashed #cbd5e1', borderRadius: '0.5rem' }}>
            Belum ada stasiun sensor terdaftar di database.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['ID Sensor', 'Nama Lokasi / Wilayah', 'Zona', 'Daya Baterai', 'Status Koneksi', 'Aksi Remote'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensors.map((s, index) => {
                  let statusBg = '#fee2e2';
                  let statusText = '#991b1b';
                  if (s.status_koneksi === 'online') {
                    statusBg = '#dcfce7';
                    statusText = '#166534';
                  } else if (s.status_koneksi === 'maintenance') {
                    statusBg = '#fef3c7';
                    statusText = '#92400e';
                  }

                  return (
                    <tr 
                      key={s.sensor_id} 
                      style={{ borderBottom: index < sensors.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      {/* ID */}
                      <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#023e8a', fontWeight: 600 }}>
                        {s.sensor_id}
                      </td>
                      
                      {/* Name & Region */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{s.nama_lokasi}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Wilayah: {s.wilayah} • Prov: {s.provinsi}</div>
                      </td>

                      {/* Zone */}
                      <td style={{ padding: '1rem', fontSize: '0.8125rem', color: '#475569', textTransform: 'capitalize' }}>
                        {s.zona ? s.zona.replace('_', ' ') : "-"}
                      </td>

                      {/* Battery */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 64, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${s.status_baterai}%`, 
                              height: '100%', 
                              background: s.status_baterai > 50 ? '#10b981' : s.status_baterai > 20 ? '#f59e0b' : '#ef4444',
                              borderRadius: 4
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.status_baterai > 20 ? '#475569' : '#ef4444' }}>
                            {s.status_baterai}%
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem' }}>
                        <button 
                          onClick={() => !actionLoading && handleCycleStatus(s.sensor_id, s.status_koneksi)}
                          disabled={actionLoading}
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            padding: '0.35rem 0.75rem', 
                            borderRadius: 999, 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            background: statusBg, 
                            color: statusText,
                            border: 'none',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            transition: 'opacity 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                          onMouseLeave={e => e.currentTarget.style.opacity = 1}
                          title="Klik untuk mengubah status (Online -> Offline -> Maintenance)"
                        >
                          {s.status_koneksi === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                          <span style={{ textTransform: 'uppercase' }}>{s.status_koneksi}</span>
                        </button>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '1rem' }}>
                        <button 
                          onClick={() => handleRecharge(s.sensor_id)}
                          disabled={actionLoading || s.status_baterai === 100}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            padding: '0.4rem 0.8rem', 
                            background: s.status_baterai === 100 ? '#f1f5f9' : '#023e8a', 
                            border: 'none', 
                            borderRadius: '0.375rem', 
                            color: s.status_baterai === 100 ? '#94a3b8' : '#fff', 
                            cursor: (actionLoading || s.status_baterai === 100) ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            transition: 'all 0.15s',
                            boxShadow: s.status_baterai === 100 ? 'none' : '0 2px 6px rgba(2,62,138,0.15)'
                          }}
                        >
                          <Zap size={12} /> Isi Baterai (100%)
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
