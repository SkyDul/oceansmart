import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Fish, AlertTriangle, Heart,
  MapPin, TrendingUp, Globe, Bell
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../api';
import { PROVINCES, KABUPATEN_BY_PROVINCE } from '../constants/regions';


function getSensorsForProvinceAndKabupaten(provinceId, kabupatenId, realSensors) {
  // Single source of truth — semua dari DB via API
  // Filter berdasarkan wilayah/kabupaten kalau dipilih spesifik
  if (kabupatenId && kabupatenId !== 'all') {
    return realSensors.filter(s =>
      (s.wilayah || '').toLowerCase() === kabupatenId.toLowerCase() ||
      s.nama_lokasi.toLowerCase().includes(kabupatenId.toLowerCase())
    );
  }

  // Filter berdasarkan provinsi
  if (provinceId && provinceId !== 'all') {
    const provMap = {
      'jabar': 'jawa barat', 'banten': 'banten', 'dki': 'jakarta',
      'jateng': 'jawa tengah', 'jatim': 'jawa timur', 'diy': 'yogyakarta',
      'bali': 'bali', 'ntt': 'nusa tenggara timur', 'sultra': 'sulawesi tenggara',
      'sulut': 'sulawesi utara', 'maluku': 'maluku', 'papua': 'papua',
    };
    const keyword = provMap[provinceId] || provinceId;
    return realSensors.filter(s =>
      (s.provinsi || '').toLowerCase().includes(keyword.split(' ')[0])
    );
  }

  return realSensors;
}



function getHealthLabel(v) {
  if (v >= 85) return { label: 'Sangat Baik', cls: 'excellent' };
  if (v >= 70) return { label: 'Baik', cls: 'good' };
  if (v >= 50) return { label: 'Sedang', cls: 'moderate' };
  if (v >= 30) return { label: 'Buruk', cls: 'poor' };
  return { label: 'Kritis', cls: 'critical' };
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const userWilayah = localStorage.getItem('ocean_wilayah') || '';
  const userProv = localStorage.getItem('ocean_provinsi') || '';

  const getProvId = (provName) => {
    if (!provName) return 'jabar';
    const lower = provName.toLowerCase();
    if (lower.includes('barat')) return 'jabar';
    if (lower.includes('timur')) return 'jatim';
    if (lower.includes('tengah')) return 'jateng';
    if (lower.includes('dki') || lower.includes('jakarta')) return 'dki';
    if (lower.includes('banten')) return 'banten';
    if (lower.includes('bali')) return 'bali';
    return 'jabar';
  };

  const getKabId = (provId, wilName) => {
    if (!wilName) return 'all';
    return wilName;
  };

  // Cascading Selection State
  const [selectedProvince, setSelectedProvince] = useState(() => {
    if (userRole === 'operator') return getProvId(userProv);
    return localStorage.getItem('selected_province') || 'jabar';
  });
  const [selectedKabupaten, setSelectedKabupaten] = useState(() => {
    if (userRole === 'operator') return getKabId(getProvId(userProv), userWilayah);
    return localStorage.getItem('selected_kabupaten') || 'all';
  });
  const [selectedSensorId, setSelectedSensorId] = useState(() => localStorage.getItem('selected_sensor_id') || 'all');
  
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load basic DB counts
  useEffect(() => {
    const fetchData = () => {
      Promise.all([
        api.get('/dashboard/summary'),
        api.get('/sensors'),
        api.get('/alerts?limit=30'),
      ])
        .then(([sumRes, senRes, alertRes]) => {
          setSummary(sumRes.data);
          setSensors(senRes.data);
          setAlerts(alertRes.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Save selected regions to local storage
  useEffect(() => {
    localStorage.setItem('selected_province', selectedProvince);
    localStorage.setItem('selected_kabupaten', selectedKabupaten);
    localStorage.setItem('selected_sensor_id', selectedSensorId);
  }, [selectedProvince, selectedKabupaten, selectedSensorId]);

  // Compute filtered sensors
  const activeSensors = getSensorsForProvinceAndKabupaten(selectedProvince, selectedKabupaten, sensors);
  
  const selectedSensor = selectedSensorId === 'all' 
    ? (activeSensors.length > 0 ? activeSensors[0] : null)
    : (activeSensors.find(s => s.sensor_id === selectedSensorId) || (activeSensors.length > 0 ? activeSensors[0] : null));

  // Load trend data from API — selalu dari API, tidak ada fallback dummy
  useEffect(() => {
    if (!selectedSensor) {
      setTrendData([]);
      return;
    }
    api.get(`/sensors/${selectedSensor.sensor_id}/readings?period=24h`)
      .then(res => setTrendData(res.data))
      .catch(err => console.error(err));
  }, [selectedSensor?.sensor_id]);

  if (loading) {
    return (
      <div style={{ padding: '0 0.5rem' }}>
        <header className="page-header" style={{ marginBottom: '2rem' }}>
          <div>
            <div className="skeleton" style={{ width: 140, height: 28, borderRadius: '0.375rem', marginBottom: '0.5rem' }} />
            <div className="skeleton" style={{ width: 280, height: 16, borderRadius: '0.25rem' }} />
          </div>
          <div className="skeleton" style={{ width: 110, height: 24, borderRadius: '0.25rem' }} />
        </header>

        <div className="page-body">
          {/* Skeleton Filter Bar */}
          <div className="skeleton" style={{ height: 48, borderRadius: '1.25rem', marginBottom: '1.25rem' }} />

          {/* Skeleton Stats Grid */}
          <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="stat-card" style={{ border: '1px solid #e2e8f0', background: '#fff', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '0.75rem' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div className="skeleton" style={{ width: '65%', height: 12, borderRadius: '0.25rem' }} />
                  <div className="skeleton" style={{ width: '45%', height: 24, borderRadius: '0.25rem' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Skeleton Grid-2 */}
          <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
            <div className="card" style={{ border: '1px solid #e2e8f0', background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ width: '50%', height: 20, borderRadius: '0.25rem' }} />
              <div className="skeleton" style={{ width: '100%', height: 220, borderRadius: '0.5rem' }} />
            </div>
            <div className="card" style={{ border: '1px solid #e2e8f0', background: '#fff', padding: '1.5rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ width: '40%', height: 20, borderRadius: '0.25rem' }} />
              <div className="skeleton" style={{ width: '100%', height: 220, borderRadius: '0.5rem' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate dynamic stats
  const totalSensors = activeSensors.length;
  const onlineSensors = activeSensors.filter(s => s.status_koneksi === 'online').length;
  const avgHealthIndex = activeSensors.length > 0 
    ? Math.round(activeSensors.reduce((sum, s) => sum + (s.latest_reading?.health_index || 80), 0) / activeSensors.length) 
    : 80;
  
  const displayAlerts = selectedProvince === 'all' 
    ? alerts 
    : alerts.filter(a => activeSensors.some(s => s.sensor_id === a.sensor_id));
    
  const activeAlertsCount = displayAlerts.filter(a => !a.is_resolved).length || displayAlerts.length;

  const health = getHealthLabel(avgHealthIndex);

  const handleProvinceChange = (val) => {
    setSelectedProvince(val);
    setSelectedKabupaten('all');
    setSelectedSensorId('all');
  };

  const handleKabupatenChange = (val) => {
    setSelectedKabupaten(val);
    setSelectedSensorId('all');
  };

  const handleSensorChange = (val) => {
    setSelectedSensorId(val);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Ringkasan kondisi kawasan konservasi</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="pulse" style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--success)',
            display: 'inline-block'
          }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>
            Live Monitoring
          </span>
        </div>
      </header>

      <div className="page-body fade-in">
        
        {/* ULTRA-SLEEK PILL FILTER BAR */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: '1px solid #e2e8f0',
          borderRadius: '1.25rem',
          padding: '0.55rem 1rem',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: '0.5rem',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Left Label Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', fontWeight: 800, fontSize: '0.8125rem', flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin size={15} color="#0284c7" />
            </div>
            <span style={{ whiteSpace: 'nowrap' }}>Wilayah & Sensor</span>
          </div>

          {/* Control Pills Container */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
            
            {/* Operator Wilayah Badge */}
            {userRole === 'operator' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#e0f2fe',
                border: '1px solid #bae6fd',
                borderRadius: '2rem',
                padding: '0.3rem 0.85rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap' }}>Wilayah Kerja:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0369a1', whiteSpace: 'nowrap' }}>{userWilayah}, {userProv}</span>
              </div>
            )}

            {/* Pill 1: Provinsi */}
            {userRole !== 'operator' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '2rem',
                padding: '0.3rem 0.65rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                minWidth: 0,
                flexShrink: 1,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>Provinsi:</span>
                <select
                  value={selectedProvince}
                  onChange={e => handleProvinceChange(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '130px',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                >
                  {PROVINCES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Pill 2: Daerah */}
            {userRole !== 'operator' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '2rem',
                padding: '0.3rem 0.65rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                minWidth: 0,
                flexShrink: 2,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>Daerah:</span>
                <select
                  value={selectedKabupaten}
                  onChange={e => handleKabupatenChange(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: '210px',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                >
                  {(KABUPATEN_BY_PROVINCE[selectedProvince] || []).map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Pill 3: Titik Sensor */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: '1px solid #0284c7',
              borderRadius: '2rem',
              padding: '0.3rem 0.65rem',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              minWidth: 0,
              flexShrink: 2,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)', whiteSpace: 'nowrap', flexShrink: 0 }}>Titik Sensor:</span>
              <select
                value={selectedSensorId}
                onChange={e => handleSensorChange(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: '190px',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
              >
                <option value="all" style={{ color: '#0f172a' }}>Semua Titik ({activeSensors.length} Sensor)</option>
                {activeSensors.map(s => (
                  <option key={s.sensor_id} value={s.sensor_id} style={{ color: '#0f172a' }}>
                    {s.nama_lokasi} ({s.sensor_id})
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="stat-card primary">
            <div className="stat-icon primary"><Activity size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Sensor Aktif</div>
              <div className="stat-value">{onlineSensors}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--on-surface-muted)' }}>/{totalSensors}</span></div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon success"><Heart size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Indeks Kesehatan</div>
              <div className="stat-value">
                <span className={`health-score ${health.cls}`} style={{ fontSize: '1.75rem' }}>
                  {avgHealthIndex}
                </span>
              </div>
            </div>
          </div>
          <div className="stat-card secondary">
            <div className="stat-icon secondary"><Fish size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Spesies Biota</div>
              <div className="stat-value">{summary?.total_biota || 0}</div>
            </div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon danger"><AlertTriangle size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Peringatan Wilayah</div>
              <div className="stat-value">{activeAlertsCount}</div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
          {/* Trend Chart */}
          <div className="card">
            <div className="card-header">
              <h3>
                <TrendingUp size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Tren Suhu Air (24 Jam) — {selectedSensor ? selectedSensor.nama_lokasi : 'Pilih Sensor'}
              </h3>
            </div>
            <div className="card-body" style={{ height: 260, padding: '1rem 0.5rem' }}>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#48cae4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#48cae4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={v => new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      tick={{ fontSize: 11 }}
                      interval={Math.max(0, Math.floor(trendData.length / 6))}
                    />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={v => new Date(v).toLocaleString('id-ID')}
                      formatter={(v) => [`${v}°C`, 'Suhu']}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="suhu_celsius" stroke="#0096c7" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--on-surface-muted)' }}>
                  Pilih stasiun sensor untuk menampilkan grafik tren.
                </div>
              )}
            </div>
          </div>

          {/* Recent Alerts Log */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color="#dc2626" /> Log Peringatan Terbaru
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>Lihat Semua</button>
            </div>
            <div className="card-body" style={{ padding: '0.6rem 1rem', maxHeight: 260, overflowY: 'auto' }}>
              {(() => {
                const list = (displayAlerts.length > 0 ? displayAlerts : alerts);
                if (list.length === 0) {
                  return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>
                      Tidak ada catatan log peringatan saat ini.
                    </div>
                  );
                }
                const sorted = [...list].sort((a, b) => {
                  if (!a.is_resolved && b.is_resolved) return -1;
                  if (a.is_resolved && !b.is_resolved) return 1;
                  return new Date(b.created_at) - new Date(a.created_at);
                });
                return sorted.slice(0, 6).map(a => {
                  const sensorObj = sensors.find(s => s.sensor_id === a.sensor_id);
                  const sLoc = sensorObj ? sensorObj.nama_lokasi : a.sensor_id;
                  const isDanger = a.level === 'bahaya';
                  const isResolved = a.is_resolved;
                  const dotColor = isResolved ? '#94a3b8' : (isDanger ? '#dc2626' : '#d97706');
                  const borderCol = isResolved ? '#cbd5e1' : (isDanger ? '#fecdd3' : '#fef3c7');
                  const bgCol = isResolved ? '#f8fafc' : (isDanger ? '#fff1f2' : '#fffbeb');
                  const badgeCol = isResolved ? '#94a3b8' : (isDanger ? '#dc2626' : '#d97706');
                  
                  return (
                    <div key={a.id} className="alert-item" style={{
                      padding: '0.55rem 0.75rem',
                      marginBottom: '0.45rem',
                      borderRadius: '0.5rem',
                      border: `1px solid ${borderCol}`,
                      background: bgCol,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      opacity: isResolved ? 0.75 : 1
                    }}>
                      <div className={`alert-dot ${a.level}`} style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sLoc}</span>
                          <span className={`badge badge-${a.level}`} style={{
                            padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 800,
                            textTransform: 'uppercase',
                            background: badgeCol, color: '#fff'
                          }}>{isResolved ? 'Selesai' : a.level}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#334155', marginTop: 2 }}>{a.message}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: 3 }}>
                          {a.created_at ? new Date(a.created_at).toLocaleString('id-ID') : ''}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Sensor Overview Table */}
        <div className="card">
          <div className="card-header">
            <h3><MapPin size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Daftar Telemetri Sensor Wilayah</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/monitoring')}>Detail Lengkap</button>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-container)' }}>
                  <th style={thStyle}>Sensor ID</th>
                  <th style={thStyle}>Nama Stasiun</th>
                  <th style={thStyle}>pH</th>
                  <th style={thStyle}>Suhu</th>
                  <th style={thStyle}>Oksigen (DO)</th>
                  <th style={thStyle}>Health Index</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeSensors.map(s => {
                  const r = s.latest_reading;
                  const h = r?.health_index ? getHealthLabel(r.health_index) : null;
                  return (
                    <tr key={s.sensor_id}
                        style={{ borderBottom: '1px solid var(--outline-variant)', cursor: 'pointer' }}
                        onClick={() => navigate(`/monitoring/${s.sensor_id}`)}
                    >
                      <td style={tdStyle}><strong>{s.sensor_id}</strong></td>
                      <td style={tdStyle}>{s.nama_lokasi}</td>
                      <td style={tdStyle}>{r?.ph ?? '-'}</td>
                      <td style={tdStyle}>{r?.suhu_celsius ? `${r.suhu_celsius}°C` : '-'}</td>
                      <td style={tdStyle}>{r?.do_mg_l ? `${r.do_mg_l} mg/L` : '-'}</td>
                      <td style={tdStyle}>
                        {h ? (
                          <span className={`health-score ${h.cls}`} style={{ fontSize: '0.875rem' }}>
                            {r.health_index}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={tdStyle}>
                        <span className={`badge badge-${s.status_koneksi}`}>
                          {s.status_koneksi}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' };
const tdStyle = { padding: '0.75rem 1rem' };
