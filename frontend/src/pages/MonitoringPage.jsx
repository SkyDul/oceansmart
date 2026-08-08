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
      : realSensors.filter(s => (s.wilayah || '').toLowerCase() === kabupatenId.toLowerCase() || s.nama_lokasi.toLowerCase().includes(kabupatenId.toLowerCase()));
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
  const points = period === '24h' ? 24 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const now = new Date();
  const readings = [];
  const baseReading = sensor.latest_reading || { ph: 8.0, suhu_celsius: 28, salinitas_ppt: 32.5, do_mg_l: 6.8, kekeruhan_ntu: 2.1, health_index: 82 };
  
  for (let i = points; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * (period === '24h' ? 3600 * 1000 : 24 * 3600 * 1000));
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

export default function MonitoringPage() {
  const { sensorId } = useParams();
  const navigate = useNavigate();
  
  const [sensors, setSensors] = useState([]);
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

  const [selectedProvince, setSelectedProvince] = useState(() => {
    if (userRole === 'operator') return getProvId(userProv);
    return localStorage.getItem('selected_province') || 'jabar';
  });
  const [selectedKabupaten, setSelectedKabupaten] = useState(() => {
    if (userRole === 'operator') return getKabId(getProvId(userProv), userWilayah);
    return localStorage.getItem('selected_kabupaten') || 'all';
  });
  const [selectedSensorId, setSelectedSensorId] = useState(() => localStorage.getItem('selected_sensor_id') || 'all');
  
  const [readings, setReadings] = useState([]);
  const [period, setPeriod] = useState('24h');
  const [activeParam, setActiveParam] = useState('suhu_celsius');
  const [loading, setLoading] = useState(true);

  // Fetch real sensors — re-fetch when province changes so backend header is current
  useEffect(() => {
    // Update provinsi header before fetching
    if (userRole !== 'operator') {
      const provName = PROVINCES.find(p => p.id === selectedProvince)?.name || '';
      localStorage.setItem('ocean_provinsi', provName);
    }
    api.get('/sensors')
      .then(res => {
        setSensors(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedProvince]);

  // Handle URL param route binding
  useEffect(() => {
    if (sensorId && sensors.length > 0) {
      const found = sensors.find(s => s.sensor_id === sensorId);
      if (found) {
        setSelectedProvince('jabar');
        setSelectedKabupaten(found.kabupaten || 'all');
        setSelectedSensorId(sensorId);
        
        localStorage.setItem('selected_province', 'jabar');
        localStorage.setItem('selected_kabupaten', found.kabupaten || 'all');
        localStorage.setItem('selected_sensor_id', sensorId);
      }
    }
  }, [sensorId, sensors]);

  // Compute active sensors and current selected sensor
  const activeSensors = getSensorsForProvinceAndKabupaten(selectedProvince, selectedKabupaten, sensors);
  
  const selectedSensor = selectedSensorId === 'all' 
    ? (activeSensors.length > 0 ? activeSensors[0] : null)
    : (activeSensors.find(s => s.sensor_id === selectedSensorId) || (activeSensors.length > 0 ? activeSensors[0] : null));

  // Fetch readings when sensor, period or province changes
  useEffect(() => {
    if (!selectedSensor) {
      setReadings([]);
      return;
    }
    
    if (selectedProvince === 'jabar' && !selectedSensor.sensor_id.includes('DUMMY')) {
      const fetchReadings = () => {
        api.get(`/sensors/${selectedSensor.sensor_id}/readings?period=${period}`)
          .then(res => setReadings(res.data))
          .catch(err => console.error(err));
      };
      fetchReadings();
      const interval = setInterval(fetchReadings, 15000);
      return () => clearInterval(interval);
    } else {
      // Dummy data offline generation
      setReadings(getDummyReadings(selectedSensor, period));
    }
  }, [selectedSensor?.sensor_id, period, selectedProvince]);

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const r = selectedSensor?.latest_reading;
  const paramConfig = PARAMS.find(p => p.key === activeParam);

  const handleProvinceChange = (val) => {
    setSelectedProvince(val);
    setSelectedKabupaten('all');
    setSelectedSensorId('all');
    localStorage.setItem('selected_province', val);
    localStorage.setItem('selected_kabupaten', 'all');
    localStorage.setItem('selected_sensor_id', 'all');
  };

  const handleKabupatenChange = (val) => {
    setSelectedKabupaten(val);
    setSelectedSensorId('all');
    localStorage.setItem('selected_kabupaten', val);
    localStorage.setItem('selected_sensor_id', 'all');
  };

  const handleSensorChange = (val) => {
    setSelectedSensorId(val);
    localStorage.setItem('selected_sensor_id', val);
  };

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
        
        {/* ULTRA-SLEEK PILL FILTER BAR */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: '1px solid #e2e8f0',
          borderRadius: '1.25rem',
          padding: '0.55rem 1rem',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
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

        {selectedSensor ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
            
            {/* LEFT COLUMN: Recharts Timeline Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="card" style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '1rem', background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {paramConfig && <paramConfig.icon size={18} color={paramConfig.color} />}
                    Grafik Riwayat {paramConfig?.label}
                  </h3>

                  {/* Time Period Tabs */}
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

                {/* Chart Body */}
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

              {/* Sensor Location Coordinates Details */}
              <div className="card" style={{ padding: '1rem 1.25rem', border: '1px solid #e2e8f0', borderRadius: '1rem', background: '#ffffff', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={18} color="#023e8a" />
                  <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                    Koordinat Lokasi: <strong>{selectedSensor.lat.toFixed(4)}, {selectedSensor.lng.toFixed(4)}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: '#475569' }}>
                  <div>Kedalaman: <strong>{selectedSensor.kedalaman_m} Meter</strong></div>
                  <div>Daya Baterai: <strong>{selectedSensor.status_baterai}%</strong></div>
                  <div>Konektivitas: <strong style={{ color: '#16a34a' }}>{selectedSensor.status_koneksi.toUpperCase()}</strong></div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Parameter Cards & Health Index */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Coral Health Index Score Card */}
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
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', opacity: 0.75 }}>Kondisi terumbu karang di lokasi</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Heart size={18} fill="#ffffff" />
                    <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{r.health_index}</span>
                    <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>/100</span>
                  </div>
                </div>
              )}

              {/* Parameter Stack Card List */}
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
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <p.icon size={18} color={p.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>{p.label}</div>
                          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Aman: {p.min} - {p.max} {p.unit}</div>
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
            Belum ada stasiun sensor telemetri yang tersedia untuk wilayah/kabupaten ini.
          </div>
        )}

      </div>
    </div>
  );
}
