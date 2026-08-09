import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Activity, Thermometer, Droplets, Wind, Eye, Heart,
  ArrowLeft, Battery, Wifi, MapPin, Filter, Globe
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts';
import api from '../api';

const PARAMS = [
  { key: 'ph', label: 'pH Air', unit: '', icon: Droplets, color: '#8b5cf6', min: 7.5, max: 8.5 },
  { key: 'suhu_celsius', label: 'Suhu Laut', unit: '°C', icon: Thermometer, color: '#ef4444', min: 26, max: 30 },
  { key: 'salinitas_ppt', label: 'Salinitas', unit: 'ppt', icon: Wind, color: '#06b6d4', min: 30, max: 35 },
  { key: 'do_mg_l', label: 'Oksigen (DO)', unit: 'mg/L', icon: Activity, color: '#22c55e', min: 5, max: 12 },
  { key: 'kekeruhan_ntu', label: 'Kekeruhan', unit: 'NTU', icon: Eye, color: '#f59e0b', min: 0, max: 10 },
];

export default function MonitoringPage() {
  const { sensorId } = useParams();
  const navigate = useNavigate();

  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const userWilayah = localStorage.getItem('ocean_wilayah') || '';
  const userProv = localStorage.getItem('ocean_provinsi') || '';

  // Wilayah list dari API
  const [wilayahList, setWilayahList] = useState([]);
  const [selectedWilayah, setSelectedWilayah] = useState(() => {
    if (userRole === 'operator') return userWilayah;
    return localStorage.getItem('mon_wilayah') || 'all';
  });

  // Sensors dari API
  const [sensors, setSensors] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState(() => {
    if (sensorId) return sensorId;
    return localStorage.getItem('mon_sensor_id') || 'all';
  });

  const [readings, setReadings] = useState([]);
  const [period, setPeriod] = useState('24h');
  const [activeParam, setActiveParam] = useState('suhu_celsius');
  const [loading, setLoading] = useState(true);
  const [loadingReadings, setLoadingReadings] = useState(false);

  // --- Fetch daftar wilayah dari API (sekali saja) ---
  useEffect(() => {
    api.get('/wilayah')
      .then(res => setWilayahList(res.data))
      .catch(err => console.error('wilayah fetch error', err));
  }, []);

  // --- Fetch sensors (re-fetch tiap wilayah berubah, poll setiap 10s) ---
  useEffect(() => {
    const fetchSensors = () => {
      // Operator: backend sudah filter via X-User-Wilayah header
      // Admin/user: kirim ?wilayah= untuk filter
      const params = {};
      if (userRole !== 'operator' && selectedWilayah && selectedWilayah !== 'all') {
        params.wilayah = selectedWilayah;
      }
      api.get('/sensors', { params })
        .then(res => {
          setSensors(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, 10000);
    return () => clearInterval(interval);
  }, [selectedWilayah, userRole]);

  // --- Handle sensorId from URL param ---
  useEffect(() => {
    if (sensorId && sensors.length > 0) {
      const found = sensors.find(s => s.sensor_id === sensorId);
      if (found) {
        setSelectedSensorId(sensorId);
        if (found.wilayah) setSelectedWilayah(found.wilayah);
      }
    }
  }, [sensorId, sensors]);

  // --- Compute selected sensor ---
  const activeSensors = sensors;
  const selectedSensor = selectedSensorId === 'all'
    ? (activeSensors.length > 0 ? activeSensors[0] : null)
    : (activeSensors.find(s => s.sensor_id === selectedSensorId) || (activeSensors.length > 0 ? activeSensors[0] : null));

  // --- Fetch readings dari API (tidak ada dummy) ---
  useEffect(() => {
    if (!selectedSensor) {
      setReadings([]);
      return;
    }
    setLoadingReadings(true);
    const fetchReadings = () => {
      api.get(`/sensors/${selectedSensor.sensor_id}/readings?period=${period}`)
        .then(res => setReadings(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoadingReadings(false));
    };
    fetchReadings();
    const interval = setInterval(fetchReadings, 15000);
    return () => clearInterval(interval);
  }, [selectedSensor?.sensor_id, period]);

  const handleWilayahChange = (val) => {
    setSelectedWilayah(val);
    setSelectedSensorId('all');
    localStorage.setItem('mon_wilayah', val);
    localStorage.setItem('mon_sensor_id', 'all');
  };

  const handleSensorChange = (val) => {
    setSelectedSensorId(val);
    localStorage.setItem('mon_sensor_id', val);
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const r = selectedSensor?.latest_reading;
  const paramConfig = PARAMS.find(p => p.key === activeParam);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header Bar */}
      <header className="page-header" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {sensorId && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/monitoring')}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Monitoring Kualitas Air</h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.15rem 0 0' }}>
              {selectedSensor ? `${selectedSensor.nama_lokasi} (${selectedSensor.sensor_id})` : 'Pilih stasiun sensor untuk melihat grafik real-time'}
            </p>
          </div>
        </div>
      </header>

      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* FILTER BAR */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: '1px solid #e2e8f0',
          borderRadius: '1.25rem',
          padding: '0.55rem 1rem',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', fontWeight: 800, fontSize: '0.8125rem', flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={15} color="#0284c7" />
            </div>
            <span style={{ whiteSpace: 'nowrap' }}>Wilayah & Sensor</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', minWidth: 0, flexWrap: 'wrap' }}>

            {/* Operator: tampilkan badge wilayah saja */}
            {userRole === 'operator' ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: '#e0f2fe', border: '1px solid #bae6fd',
                borderRadius: '2rem', padding: '0.3rem 0.85rem',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1' }}>Wilayah Kerja:</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0369a1', whiteSpace: 'nowrap' }}>{userWilayah}</span>
              </div>
            ) : (
              /* Admin/User: dropdown wilayah dari API */
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: '#ffffff', border: '1px solid #cbd5e1',
                borderRadius: '2rem', padding: '0.3rem 0.65rem',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>Wilayah:</span>
                <select
                  value={selectedWilayah}
                  onChange={e => handleWilayahChange(e.target.value)}
                  style={{
                    border: 'none', background: 'transparent',
                    color: '#0f172a', fontWeight: 700,
                    fontSize: '0.8125rem', cursor: 'pointer', outline: 'none',
                    maxWidth: '200px',
                  }}
                >
                  <option value="all">Semua Wilayah ({sensors.length} sensor)</option>
                  {Object.entries(
                    wilayahList.reduce((acc, item) => {
                      const prov = item.provinsi || 'Lainnya';
                      if (!acc[prov]) acc[prov] = [];
                      acc[prov].push(item);
                      return acc;
                    }, {})
                  ).map(([province, items]) => (
                    <optgroup key={province} label={province}>
                      {items.map(w => (
                        <option key={w.wilayah} value={w.wilayah}>{w.wilayah}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Dropdown sensor */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: '1px solid #0284c7', borderRadius: '2rem',
              padding: '0.3rem 0.65rem', color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>Sensor:</span>
              <select
                value={selectedSensorId}
                onChange={e => handleSensorChange(e.target.value)}
                style={{
                  border: 'none', background: 'transparent',
                  color: '#ffffff', fontWeight: 700,
                  fontSize: '0.8125rem', cursor: 'pointer', outline: 'none',
                  maxWidth: '220px',
                }}
              >
                <option value="all" style={{ color: '#0f172a' }}>Semua ({activeSensors.length})</option>
                {activeSensors.map(s => (
                  <option key={s.sensor_id} value={s.sensor_id} style={{ color: '#0f172a' }}>
                    {s.nama_lokasi} — {s.sensor_id}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {selectedSensor ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '1.25rem', alignItems: 'start' }}>

            {/* LEFT COLUMN: Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div className="card" style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '1rem', background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {paramConfig && <paramConfig.icon size={18} color={paramConfig.color} />}
                    Grafik Riwayat {paramConfig?.label}
                    {loadingReadings && <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>Memuat...</span>}
                  </h3>

                  <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.625rem' }}>
                    {['24h', '7d', '30d', '90d'].map(p => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        style={{
                          padding: '0.35rem 0.85rem', borderRadius: '0.5rem', border: 'none',
                          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                          background: period === p ? '#ffffff' : 'transparent',
                          color: period === p ? '#023e8a' : '#64748b',
                          boxShadow: period === p ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height: 350, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={readings}>
                      <defs>
                        <linearGradient id="paramGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={paramConfig?.color || '#48cae4'} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={paramConfig?.color || '#48cae4'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={v => {
                          const d = new Date(v);
                          return period === '24h'
                            ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                        }}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={Math.max(0, Math.floor(readings.length / 8))}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
                      <Tooltip
                        labelFormatter={v => new Date(v).toLocaleString('id-ID')}
                        formatter={(v) => [`${v} ${paramConfig?.unit || ''}`, paramConfig?.label || '']}
                        contentStyle={{ borderRadius: 10, border: '1px solid #cbd5e1', boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}
                      />
                      {paramConfig && (
                        <>
                          <ReferenceLine y={paramConfig.min} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `Min: ${paramConfig.min}`, fontSize: 10, fill: '#dc2626' }} />
                          <ReferenceLine y={paramConfig.max} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `Max: ${paramConfig.max}`, fontSize: 10, fill: '#dc2626' }} />
                        </>
                      )}
                      <Area
                        type="monotone"
                        dataKey={activeParam}
                        stroke={paramConfig?.color || '#48cae4'}
                        fill="url(#paramGrad)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sensor Info Bar */}
              <div className="card" style={{ padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '1rem', background: '#ffffff', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={18} color="#023e8a" />
                  <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                    Koordinat: <strong>{selectedSensor.lat?.toFixed(4)}, {selectedSensor.lng?.toFixed(4)}</strong>
                    {selectedSensor.wilayah && <> · <strong>{selectedSensor.wilayah}</strong></>}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: '#475569' }}>
                  <div>Kedalaman: <strong>{selectedSensor.kedalaman_m} m</strong></div>
                  <div>Baterai: <strong>{Math.round(selectedSensor.status_baterai)}%</strong></div>
                  <div>Status: <strong style={{ color: selectedSensor.status_koneksi === 'online' ? '#16a34a' : '#dc2626' }}>{selectedSensor.status_koneksi?.toUpperCase()}</strong></div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Parameter Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {r && (
                <div className="card" style={{
                  padding: '1.25rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1rem',
                  background: 'linear-gradient(135deg, #023e8a, #0077b6)',
                  color: '#ffffff',
                  boxShadow: '0 4px 16px rgba(2,62,138,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.85 }}>Coral Health Index</h4>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', opacity: 0.75 }}>Kondisi ekosistem di lokasi</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Heart size={18} fill="#ffffff" />
                    <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{r.health_index}</span>
                    <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>/100</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {PARAMS.map(p => {
                  const isActive = activeParam === p.key;
                  const val = r?.[p.key] ?? '-';
                  return (
                    <div
                      key={p.key}
                      onClick={() => setActiveParam(p.key)}
                      style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: '0.85rem',
                        background: '#ffffff',
                        border: isActive ? `2px solid ${p.color}` : '1px solid #e2e8f0',
                        boxShadow: isActive ? `0 4px 12px ${p.color}15` : '0 2px 6px rgba(0,0,0,0.01)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 36, height: 36,
                          background: `${p.color}10`,
                          borderRadius: '0.5rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <p.icon size={18} color={p.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>{p.label}</div>
                          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Aman: {p.min} – {p.max} {p.unit}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: p.color }}>
                        {val} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>{p.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        ) : (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            {sensors.length === 0
              ? 'Belum ada sensor terdaftar di wilayah ini.'
              : 'Pilih sensor untuk melihat grafik monitoring.'}
          </div>
        )}

      </div>
    </div>
  );
}
