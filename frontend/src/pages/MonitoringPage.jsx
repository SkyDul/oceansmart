import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Activity, Thermometer, Droplets, Wind, Eye, Heart,
  ArrowLeft, Battery, Wifi, MapPin
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts';
import api from '../api';

const PARAMS = [
  { key: 'ph', label: 'pH', unit: '', icon: Droplets, color: '#8b5cf6', min: 7.5, max: 8.5 },
  { key: 'suhu_celsius', label: 'Suhu', unit: '°C', icon: Thermometer, color: '#ef4444', min: 26, max: 30 },
  { key: 'salinitas_ppt', label: 'Salinitas', unit: 'ppt', icon: Wind, color: '#06b6d4', min: 30, max: 35 },
  { key: 'do_mg_l', label: 'DO', unit: 'mg/L', icon: Activity, color: '#22c55e', min: 5, max: 12 },
  { key: 'kekeruhan_ntu', label: 'Kekeruhan', unit: 'NTU', icon: Eye, color: '#f59e0b', min: 0, max: 10 },
];

export default function MonitoringPage() {
  const { sensorId } = useParams();
  const navigate = useNavigate();
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [readings, setReadings] = useState([]);
  const [period, setPeriod] = useState('24h');
  const [activeParam, setActiveParam] = useState('suhu_celsius');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSensors = () => {
      api.get('/sensors').then(res => {
        setSensors(res.data);
        if (!selectedSensor) {
          const target = sensorId
            ? res.data.find(s => s.sensor_id === sensorId)
            : res.data[0];
          if (target) setSelectedSensor(target);
        } else {
          const target = res.data.find(s => s.sensor_id === selectedSensor.sensor_id);
          if (target) setSelectedSensor(target);
        }
      }).finally(() => setLoading(false));
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, 10000);
    return () => clearInterval(interval);
  }, [sensorId, selectedSensor?.sensor_id]);

  useEffect(() => {
    if (!selectedSensor) return;
    const fetchReadings = () => {
      api.get(`/sensors/${selectedSensor.sensor_id}/readings?period=${period}`)
        .then(res => setReadings(res.data));
    };
    fetchReadings();
    const interval = setInterval(fetchReadings, 10000);
    return () => clearInterval(interval);
  }, [selectedSensor?.sensor_id, period]);

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
    <>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {sensorId && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/monitoring')}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h2>Monitoring Kualitas Air</h2>
            <p>{selectedSensor ? selectedSensor.nama_lokasi : 'Pilih sensor untuk melihat data'}</p>
          </div>
        </div>
      </header>

      <div className="page-body fade-in">
        {/* Sensor Selector */}
        {!sensorId && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {sensors.map(s => (
              <button
                key={s.sensor_id}
                className={`btn btn-sm ${selectedSensor?.sensor_id === s.sensor_id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedSensor(s)}
              >
                {s.sensor_id}
              </button>
            ))}
          </div>
        )}

        {selectedSensor && (
          <>
            {/* Sensor Info Bar */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} color="var(--primary)" />
                  <span style={{ fontSize: '0.875rem' }}>{selectedSensor.lat.toFixed(4)}, {selectedSensor.lng.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Droplets size={16} color="var(--secondary)" />
                  <span style={{ fontSize: '0.875rem' }}>Kedalaman: {selectedSensor.kedalaman_m}m</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Battery size={16} color="var(--success)" />
                  <span style={{ fontSize: '0.875rem' }}>{selectedSensor.status_baterai}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wifi size={16} color="var(--success)" />
                  <span className={`badge badge-${selectedSensor.status_koneksi}`}>{selectedSensor.status_koneksi}</span>
                </div>
                {r && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Heart size={16} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{r.health_index}/100</span>
                  </div>
                )}
              </div>
            </div>

            {/* Parameter Cards */}
            <div className="param-grid" style={{ marginBottom: '1.5rem' }}>
              {PARAMS.map(p => (
                <div
                  key={p.key}
                  className="param-card"
                  style={{
                    cursor: 'pointer',
                    border: activeParam === p.key ? `2px solid ${p.color}` : '2px solid transparent',
                  }}
                  onClick={() => setActiveParam(p.key)}
                >
                  <p.icon size={18} color={p.color} style={{ marginBottom: 4 }} />
                  <div className="param-value" style={{ color: p.color }}>
                    {r?.[p.key] ?? '-'}
                  </div>
                  <div className="param-unit">{p.unit}</div>
                  <div className="param-name">{p.label}</div>
                </div>
              ))}
            </div>

            {/* Period Selector + Chart */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {paramConfig && <paramConfig.icon size={16} color={paramConfig.color} />}
                  Grafik {paramConfig?.label}
                </h3>
                <div className="tab-bar" style={{ marginBottom: 0 }}>
                  {['24h', '7d', '30d', '90d'].map(p => (
                    <button
                      key={p}
                      className={`tab-btn ${period === p ? 'active' : ''}`}
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card-body" style={{ height: 350, padding: '1rem 0.5rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={readings}>
                    <defs>
                      <linearGradient id="paramGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={paramConfig?.color || '#48cae4'} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={paramConfig?.color || '#48cae4'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={v => {
                        const d = new Date(v);
                        return period === '24h'
                          ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                      }}
                      tick={{ fontSize: 11 }}
                      interval={Math.max(0, Math.floor(readings.length / 12))}
                    />
                    <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip
                      labelFormatter={v => new Date(v).toLocaleString('id-ID')}
                      formatter={(v) => [`${v} ${paramConfig?.unit || ''}`, paramConfig?.label || '']}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    {paramConfig && (
                      <>
                        <ReferenceLine y={paramConfig.min} stroke="#dc2626" strokeDasharray="5 5" label={{ value: `Min: ${paramConfig.min}`, fontSize: 10 }} />
                        <ReferenceLine y={paramConfig.max} stroke="#dc2626" strokeDasharray="5 5" label={{ value: `Max: ${paramConfig.max}`, fontSize: 10 }} />
                      </>
                    )}
                    <Area
                      type="monotone"
                      dataKey={activeParam}
                      stroke={paramConfig?.color || '#48cae4'}
                      fill="url(#paramGrad)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
