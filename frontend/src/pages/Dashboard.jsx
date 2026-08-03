import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Waves, Fish, AlertTriangle, Heart,
  MapPin, TrendingUp, Thermometer, Droplets
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import api from '../api';

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
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

          if (senRes.data.length > 0) {
            api.get(`/sensors/${senRes.data[0].sensor_id}/readings?period=24h`)
              .then(r => setTrendData(r.data));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner" />
        <span style={{ color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>Memuat data...</span>
      </div>
    );
  }

  const health = summary ? getHealthLabel(summary.avg_health_index) : { label: '-', cls: 'moderate' };

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
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon primary"><Activity size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Sensor Aktif</div>
              <div className="stat-value">{summary?.online_sensors || 0}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--on-surface-muted)' }}>/{summary?.total_sensors || 0}</span></div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon success"><Heart size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Indeks Kesehatan</div>
              <div className="stat-value">
                <span className={`health-score ${health.cls}`} style={{ fontSize: '1.75rem' }}>
                  {summary?.avg_health_index || 0}
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
              <div className="stat-label">Peringatan Aktif</div>
              <div className="stat-value">{summary?.active_alerts || 0}</div>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          {/* Trend Chart */}
          <div className="card">
            <div className="card-header">
              <h3><TrendingUp size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Tren Suhu Air (24 Jam)</h3>
            </div>
            <div className="card-body" style={{ height: 260, padding: '1rem 0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData.slice(-96)}>
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
                    interval={15}
                  />
                  <YAxis domain={[24, 32]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={v => new Date(v).toLocaleString('id-ID')}
                    formatter={(v) => [`${v}°C`, 'Suhu']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="suhu_celsius" stroke="#0096c7" fill="url(#tempGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="card">
            <div className="card-header">
              <h3><AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Peringatan Terbaru</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>Lihat Semua</button>
            </div>
            <div className="card-body" style={{ padding: '0.5rem 1rem', maxHeight: 260, overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-muted)' }}>
                  ✅ Tidak ada peringatan aktif
                </div>
              ) : (
                alerts.map(a => (
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
              )}
            </div>
          </div>
        </div>

        {/* Sensor Overview */}
        <div className="card">
          <div className="card-header">
            <h3><MapPin size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Status Sensor</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/monitoring')}>Detail</button>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-container)' }}>
                  <th style={thStyle}>Sensor</th>
                  <th style={thStyle}>Lokasi</th>
                  <th style={thStyle}>pH</th>
                  <th style={thStyle}>Suhu</th>
                  <th style={thStyle}>DO</th>
                  <th style={thStyle}>Kesehatan</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sensors.map(s => {
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
