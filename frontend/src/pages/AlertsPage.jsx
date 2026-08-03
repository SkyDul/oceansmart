import { useState, useEffect } from 'react';
import { AlertTriangle, Check, Clock, Filter } from 'lucide-react';
import api from '../api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/alerts?active_only=${activeOnly}&limit=100`)
      .then(res => setAlerts(res.data))
      .finally(() => setLoading(false));
  }, [activeOnly]);

  return (
    <>
      <header className="page-header">
        <div>
          <h2>Peringatan Dini</h2>
          <p>Early warning system — monitoring ambang batas parameter</p>
        </div>
        <button
          className={`btn btn-sm ${activeOnly ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveOnly(!activeOnly)}
        >
          <Filter size={14} />
          {activeOnly ? 'Aktif Saja' : 'Semua'}
        </button>
      </header>

      <div className="page-body fade-in">
        {/* Summary */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card danger">
            <div className="stat-icon danger"><AlertTriangle size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Bahaya</div>
              <div className="stat-value">{alerts.filter(a => a.level === 'bahaya' && !a.is_resolved).length}</div>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon warning"><Clock size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Waspada</div>
              <div className="stat-value">{alerts.filter(a => a.level === 'waspada' && !a.is_resolved).length}</div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon success"><Check size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Terselesaikan</div>
              <div className="stat-value">{alerts.filter(a => a.is_resolved).length}</div>
            </div>
          </div>
        </div>

        {/* Alert List */}
        <div className="card">
          <div className="card-header">
            <h3>Log Peringatan ({alerts.length})</h3>
          </div>
          <div className="card-body" style={{ padding: 0, maxHeight: 600, overflowY: 'auto' }}>
            {loading ? (
              <div className="loading-container"><div className="spinner" /></div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-muted)' }}>
                ✅ Tidak ada peringatan{activeOnly ? ' aktif' : ''}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-container)' }}>
                    <th style={thStyle}>Level</th>
                    <th style={thStyle}>Sensor</th>
                    <th style={thStyle}>Parameter</th>
                    <th style={thStyle}>Nilai</th>
                    <th style={thStyle}>Batas Aman</th>
                    <th style={thStyle}>Pesan</th>
                    <th style={thStyle}>Waktu</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                      <td style={tdStyle}>
                        <span className={`badge badge-${a.level}`}>
                          {a.level === 'bahaya' ? '🔴' : '🟡'} {a.level}
                        </span>
                      </td>
                      <td style={tdStyle}><strong>{a.sensor_id}</strong></td>
                      <td style={tdStyle}>{a.parameter}</td>
                      <td style={tdStyle}><strong>{a.value}</strong></td>
                      <td style={tdStyle}>{a.threshold_min} – {a.threshold_max}</td>
                      <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.message}
                      </td>
                      <td style={tdStyle}>
                        {a.created_at ? new Date(a.created_at).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td style={tdStyle}>
                        {a.is_resolved ? (
                          <span className="badge badge-normal">✅ Resolved</span>
                        ) : (
                          <span className="badge badge-bahaya">⏳ Aktif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' };
const tdStyle = { padding: '0.625rem 1rem' };
