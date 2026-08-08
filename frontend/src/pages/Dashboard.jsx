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

const PROVINCES = [
  { id: 'jabar', name: 'Jawa Barat' },
  { id: 'banten', name: 'Banten' },
  { id: 'dki', name: 'DKI Jakarta (Kep. Seribu)' },
  { id: 'jateng', name: 'Jawa Tengah' },
  { id: 'jatim', name: 'Jawa Timur' },
  { id: 'bali', name: 'Bali' },
];

const KABUPATEN_BY_PROVINCE = {
  jabar: [
    { id: 'all', name: 'Semua Daerah Pesisir Jawa Barat' },
    { id: 'Pangandaran', name: 'Kab. Pangandaran (Pesisir Selatan)' },
    { id: 'Sukabumi', name: 'Kab. Sukabumi / Pelabuhan Ratu (Pesisir Selatan)' },
    { id: 'Indramayu', name: 'Kab. Indramayu (Pesisir Utara / Pantura)' },
    { id: 'Cirebon', name: 'Kota & Kab. Cirebon (Pesisir Utara)' },
    { id: 'Karawang', name: 'Kab. Karawang (Pesisir Utara)' },
    { id: 'Subang', name: 'Kab. Subang (Pesisir Utara)' },
  ],
  banten: [
    { id: 'all', name: 'Semua Daerah Pesisir Banten' },
    { id: 'Pandeglang', name: 'Kab. Pandeglang' },
    { id: 'Serang', name: 'Kab. Serang' },
    { id: 'Lebak', name: 'Kab. Lebak' },
  ],
  dki: [
    { id: 'all', name: 'Semua Daerah Kepulauan Seribu' },
    { id: 'Seribu Utara', name: 'Kec. Kepulauan Seribu Utara' },
    { id: 'Seribu Selatan', name: 'Kec. Kepulauan Seribu Selatan' },
  ],
  jateng: [
    { id: 'all', name: 'Semua Daerah Pesisir Jawa Tengah' },
    { id: 'Jepara', name: 'Kab. Jepara' },
    { id: 'Cilacap', name: 'Kab. Cilacap' },
    { id: 'Kebumen', name: 'Kab. Kebumen' },
  ],
  jatim: [
    { id: 'all', name: 'Semua Daerah Pesisir Jawa Timur' },
    { id: 'Banyuwangi', name: 'Kab. Banyuwangi' },
    { id: 'Situbondo', name: 'Kab. Situbondo' },
    { id: 'Pacitan', name: 'Kab. Pacitan' },
  ],
  bali: [
    { id: 'all', name: 'Semua Daerah Pesisir Bali' },
    { id: 'Badung', name: 'Kab. Badung' },
    { id: 'Buleleng', name: 'Kab. Buleleng' },
    { id: 'Gianyar', name: 'Kab. Gianyar' },
  ]
};

function getSensorsForProvinceAndKabupaten(provinceId, kabupatenId, realSensors) {
  if (provinceId === 'jabar') {
    return kabupatenId === 'all' 
      ? realSensors 
      : realSensors.filter(s => 
          (s.wilayah || '').toLowerCase() === kabupatenId.toLowerCase() ||
          s.nama_lokasi.toLowerCase().includes(kabupatenId.toLowerCase())
        );
  }

  const kabList = KABUPATEN_BY_PROVINCE[provinceId] || [];
  const activeKabs = kabupatenId === 'all' ? kabList.filter(k => k.id !== 'all') : kabList.filter(k => k.id === kabupatenId);
  
  let dummySensors = [];
  let index = 1;
  
  activeKabs.forEach(kab => {
    for (let i = 1; i <= 2; i++) {
      const sensorId = `OS-DUMMY-${provinceId.toUpperCase()}-${index.toString().padStart(3, '0')}`;
      dummySensors.push({
        sensor_id: sensorId,
        nama_lokasi: `Sensor Telemetri ${kab.name} #${i}`,
        lat: provinceId === 'bali' ? -8.4 + (index * 0.05) : -6.5 - (index * 0.05),
        lng: provinceId === 'bali' ? 115.1 + (index * 0.05) : 106.8 + (index * 0.05),
        kedalaman_m: 2 + (index * 3) % 15,
        status_koneksi: 'online',
        status_baterai: 80 + (index * 7) % 21,
        kabupaten: kab.id,
        latest_reading: {
          timestamp: new Date().toISOString(),
          ph: parseFloat((8.1 + Math.sin(index) * 0.25).toFixed(2)),
          suhu_celsius: parseFloat((28.2 + Math.cos(index) * 1.1).toFixed(1)),
          salinitas_ppt: parseFloat((32.5 + Math.sin(index * 2) * 0.8).toFixed(1)),
          do_mg_l: parseFloat((6.8 + Math.cos(index * 2) * 0.7).toFixed(1)),
          kekeruhan_ntu: parseFloat((2.1 + Math.abs(Math.sin(index * 3)) * 2).toFixed(1)),
          health_index: 75 + (index * 4) % 21
        }
      });
      index++;
    }
  });
  
  return dummySensors;
}

function getDummyReadings(sensor, period) {
  const points = 24;
  const now = new Date();
  const readings = [];
  const baseReading = sensor.latest_reading || { ph: 8.0, suhu_celsius: 28, salinitas_ppt: 32.5, do_mg_l: 6.8, kekeruhan_ntu: 2.1, health_index: 82 };
  
  for (let i = points; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 3600 * 1000);
    const factor = Math.sin(i / 3);
    readings.push({
      timestamp: timestamp.toISOString(),
      ph: parseFloat((baseReading.ph + factor * 0.12).toFixed(2)),
      suhu_celsius: parseFloat((baseReading.suhu_celsius + factor * 0.7).toFixed(1)),
      salinitas_ppt: parseFloat((baseReading.salinitas_ppt + factor * 0.4).toFixed(1)),
      do_mg_l: parseFloat((baseReading.do_mg_l + factor * 0.35).toFixed(1)),
      kekeruhan_ntu: parseFloat(Math.max(0, baseReading.kekeruhan_ntu + factor * 0.8).toFixed(1)),
      health_index: Math.max(0, Math.min(100, Math.round(baseReading.health_index + factor * 4)))
    });
  }
  return readings;
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
    const list = KABUPATEN_BY_PROVINCE[provId] || [];
    const found = list.find(k => k.id.toLowerCase() === wilName.toLowerCase() || wilName.toLowerCase().includes(k.id.toLowerCase()) || k.id.toLowerCase().includes(wilName.toLowerCase()));
    return found ? found.id : wilName;
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
        api.get('/alerts?active_only=true&limit=10'),
      ])
        .then(([sumRes, senRes, alertRes]) => {
          setSummary(sumRes.data);
          setSensors(senRes.data);
          setAlerts(alertRes.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    // Update provinsi header before fetching so backend receives correct value
    if (userRole !== 'operator') {
      const provName = PROVINCES.find(p => p.id === selectedProvince)?.name || '';
      localStorage.setItem('ocean_provinsi', provName);
    }

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [selectedProvince]); // re-fetch when province changes

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

  // Load trend data for active sensor
  useEffect(() => {
    if (!selectedSensor) {
      setTrendData([]);
      return;
    }

    if (selectedProvince === 'jabar' && !selectedSensor.sensor_id.includes('DUMMY')) {
      api.get(`/sensors/${selectedSensor.sensor_id}/readings?period=24h`)
        .then(res => setTrendData(res.data))
        .catch(err => console.error(err));
    } else {
      setTrendData(getDummyReadings(selectedSensor, '24h'));
    }
  }, [selectedSensor?.sensor_id, selectedProvince]);

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
  
  const activeAlertsCount = selectedProvince === 'jabar'
    ? alerts.filter(a => activeSensors.some(s => s.sensor_id === a.sensor_id)).length
    : activeSensors.filter(s => (s.latest_reading?.health_index || 80) < 65).length;

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

          {/* Recent Alerts */}
          <div className="card">
            <div className="card-header">
              <h3><AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Log Peringatan Terbaru</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>Lihat Semua</button>
            </div>
            <div className="card-body" style={{ padding: '0.5rem 1rem', maxHeight: 260, overflowY: 'auto' }}>
              {selectedProvince === 'jabar' ? (
                alerts.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>
                    Tidak ada peringatan aktif saat ini
                  </div>
                ) : (
                  alerts.slice(0, 5).map(a => (
                    <div key={a.id} className="alert-item">
                      <div className={`alert-dot ${a.level}`} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{a.sensor_id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{a.message}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-muted)', marginTop: 4 }}>
                          {a.created_at ? new Date(a.created_at).toLocaleString('id-ID') : ''}
                        </div>
                      </div>
                      <span className={`badge badge-${a.level}`}>{a.level}</span>
                    </div>
                  ))
                )
              ) : (
                // Dummy alerts for other provinces if any sensor has low health
                activeSensors.filter(s => (s.latest_reading?.health_index || 80) < 78).map((s, idx) => (
                  <div key={idx} className="alert-item">
                    <div className="alert-dot waspada" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{s.sensor_id}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Suhu laut terdeteksi mendekati ambang batas atas aman.</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-muted)', marginTop: 4 }}>
                        {new Date().toLocaleString('id-ID')}
                      </div>
                    </div>
                    <span className="badge badge-waspada">waspada</span>
                  </div>
                ))
              )}
              {selectedProvince !== 'jabar' && activeSensors.filter(s => (s.latest_reading?.health_index || 80) < 78).length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>
                  Semua parameter di wilayah {PROVINCES.find(p => p.id === selectedProvince)?.name} dalam batas aman
                </div>
              )}
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
