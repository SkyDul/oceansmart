import { useState, useEffect } from 'react';
import { AlertTriangle, Check, Clock, Filter, MapPin, Calendar, X, Eye, LayoutGrid, List, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../api';
import { useAlert } from '../components/AlertNotifier';

const getParamUnit = (param) => {
  const p = (param || '').toLowerCase();
  if (p.includes('suhu')) return '°C';
  if (p.includes('salin')) return 'PSU';
  if (p.includes('keruh')) return 'NTU';
  if (p.includes('do') || p.includes('oxygen') || p.includes('dissolved')) return 'mg/L';
  return '';
};

export default function AlertsPage() {
  const { alerts, setAlerts } = useAlert();
  const [sensors, setSensors] = useState([]);
  const [wilayahList, setWilayahList] = useState([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWilayah, setSelectedWilayah] = useState('all');
  const [selectedSensorId, setSelectedSensorId] = useState('all');
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';

  useEffect(() => {
    api.get('/sensors').then(res => setSensors(res.data)).catch(console.error);
    api.get('/wilayah').then(res => setWilayahList(res.data)).catch(() => {});
  }, []);

  // Sensors filtered by wilayah
  const activeSensors = selectedWilayah === 'all'
    ? sensors
    : sensors.filter(s => (s.wilayah || '').toLowerCase() === selectedWilayah.toLowerCase());

  const filteredAlerts = alerts.filter(a => {
    if (activeOnly && a.is_resolved) return false;
    if (selectedPriority !== 'all' && a.level !== selectedPriority) return false;
    if (selectedWilayah !== 'all') {
      const sensorInWilayah = activeSensors.some(s => s.sensor_id === a.sensor_id);
      if (!sensorInWilayah) return false;
    }
    if (selectedSensorId !== 'all' && a.sensor_id !== selectedSensorId) return false;
    if (selectedDate && a.created_at) {
      if (new Date(a.created_at).toLocaleDateString('sv-SE') !== selectedDate) return false;
    }
    return true;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'level') return (b.level === 'bahaya' ? 1 : 0) - (a.level === 'bahaya' ? 1 : 0);
    return 0;
  });

  const handleResolve = async (id) => {
    try {
      await api.patch(`/alerts/${id}/resolve`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: true } : a));
      if (selectedAlert?.id === id) setSelectedAlert(prev => ({ ...prev, is_resolved: true }));
    } catch (e) {
      console.error(e);
      alert('Gagal menyelesaikan peringatan.');
    }
  };

  const activeBahaya = filteredAlerts.filter(a => a.level === 'bahaya' && !a.is_resolved).length;
  const activeWaspada = filteredAlerts.filter(a => a.level === 'waspada' && !a.is_resolved).length;
  const resolvedCount = filteredAlerts.filter(a => a.is_resolved).length;

  return (
    <>
      <header className="page-header">
        <div>
          <h2>Peringatan Dini</h2>
          <p>Sistem notifikasi real-time kawasan konservasi</p>
        </div>
        <button className={`btn btn-sm ${activeOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveOnly(!activeOnly)}>
          <Filter size={14} /> {activeOnly ? 'Aktif Saja' : 'Semua Status'}
        </button>
      </header>

      <div className="page-body fade-in">

        {/* Filter Bar */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '0.6rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0, marginRight: '0.25rem' }}>
            <MapPin size={14} color="#0369a1" />
            <span>Filter</span>
          </div>
          {[
            { label: 'Prioritas', el: <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem', cursor: 'pointer' }}><option value="all">Semua</option><option value="bahaya">Bahaya</option><option value="waspada">Waspada</option></select> },
            { label: 'Wilayah', el: (
              <select 
                value={selectedWilayah} 
                onChange={e => { setSelectedWilayah(e.target.value); setSelectedSensorId('all'); }} 
                style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                <option value="all">Semua Wilayah</option>
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
            ) },
          ].map(({ label, el }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.4rem', padding: '0.25rem 0.6rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>{label}:</span>{el}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#0369a1', border: '1px solid #0369a1', borderRadius: '0.4rem', padding: '0.25rem 0.6rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Sensor:</span>
            <select value={selectedSensorId} onChange={e => setSelectedSensorId(e.target.value)} style={{ border: 'none', background: 'transparent', color: '#fff', outline: 'none', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}>
              <option value="all" style={{ color: '#0f172a' }}>Semua ({activeSensors.length})</option>
              {activeSensors.map(s => <option key={s.sensor_id} value={s.sensor_id} style={{ color: '#0f172a' }}>{s.nama_lokasi} — {s.sensor_id}</option>)}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          {[
            { label: 'Bahaya', value: activeBahaya, icon: <AlertTriangle size={20} color="#fff" /> },
            { label: 'Waspada', value: activeWaspada, icon: <Clock size={20} color="#fff" /> },
            { label: 'Terselesaikan', value: resolvedCount, icon: <Check size={20} color="#fff" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: 'linear-gradient(135deg, #023e8a, #0077b6)',
              borderRadius: '1rem',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 4px 16px rgba(2,62,138,0.18)',
              color: '#fff',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '0.625rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Daftar Peringatan</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={13} color="#94a3b8" />
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.75rem', outline: 'none', borderRadius: '0.375rem', padding: '2px 6px', color: '#475569' }} />
              {selectedDate && <button onClick={() => setSelectedDate('')} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={10} color="#64748b" /></button>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '0.375rem', overflow: 'hidden' }}>
              <button onClick={() => setViewMode('grid')} style={{ padding: '5px 9px', border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? '#0369a1' : '#fff', color: viewMode === 'grid' ? '#fff' : '#94a3b8', transition: 'all 0.15s' }}><LayoutGrid size={14} /></button>
              <button onClick={() => setViewMode('list')} style={{ padding: '5px 9px', border: 'none', cursor: 'pointer', background: viewMode === 'list' ? '#0369a1' : '#fff', color: viewMode === 'list' ? '#fff' : '#94a3b8', transition: 'all 0.15s' }}><List size={14} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '4px 10px', background: '#fff' }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', outline: 'none', cursor: 'pointer' }}>
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="level">Tingkat Bahaya</option>
              </select>
              <ChevronDown size={13} color="#94a3b8" />
            </div>
          </div>
        </div>

        {sortedAlerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0' }}>
            Tidak ada peringatan {activeOnly ? 'aktif' : ''} saat ini.
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {sortedAlerts.map(a => {
              const resolved = a.is_resolved;
              const isBahaya = a.level === 'bahaya';
              const unit = getParamUnit(a.parameter);
              const valueColor = resolved ? '#64748b' : isBahaya ? '#dc2626' : '#d97706';
              const badgeBg = resolved ? '#f1f5f9' : isBahaya ? '#dc2626' : '#d97706';
              const badgeLabel = resolved ? 'SELESAI' : a.level.toUpperCase();

              return (
                <div key={a.id}
                  onClick={() => setSelectedAlert(a)}
                  style={{
                    background: '#fff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e8edf2',
                    boxShadow: '0 1px 6px rgba(15,23,42,0.06)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: resolved ? 0.72 : 1,
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(15,23,42,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ padding: '1rem 1.125rem' }}>

                    {/* Row 1: badge + timestamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', padding: '2px 8px', borderRadius: 3, background: badgeBg, color: '#fff', textTransform: 'uppercase' }}>
                        {badgeLabel}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} />
                        {new Date(a.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Row 2: sensor + parameter */}
                    <div style={{ marginBottom: '0.625rem' }}>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.125rem' }}>{a.sensor_id}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500, textTransform: 'capitalize' }}>{a.parameter}</div>
                    </div>

                    {/* Row 3: value + safe range */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                      <span style={{ fontSize: '1.625rem', fontWeight: 800, color: valueColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                        {a.value}<span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: 3, color: valueColor }}>{unit}</span>
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        Aman: {a.threshold_min} – {a.threshold_max}
                      </span>
                    </div>

                    {/* Row 4: message */}
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em' }}>
                      {a.message}
                    </p>
                  </div>

                  {/* Footer: actions */}
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.625rem 1.125rem', display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedAlert(a)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0.4rem', borderRadius: '0.375rem', border: '1px solid #0369a1', background: 'transparent', fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', cursor: 'pointer', transition: 'all 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Eye size={13} /> Lihat Detail <ChevronRight size={12} />
                    </button>
                    {userRole !== 'pengguna' && !resolved && (
                      <button
                        onClick={() => handleResolve(a.id)}
                        style={{ padding: '0.4rem 0.875rem', borderRadius: '0.375rem', border: 'none', background: '#0369a1', fontSize: '0.75rem', fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'background 0.12s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#075985'}
                        onMouseLeave={e => e.currentTarget.style.background = '#0369a1'}
                      >
                        ✓ Selesai
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          /* LIST VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedAlerts.map(a => {
              const resolved = a.is_resolved;
              const isBahaya = a.level === 'bahaya';
              const unit = getParamUnit(a.parameter);
              const valueColor = resolved ? '#64748b' : isBahaya ? '#dc2626' : '#d97706';
              const badgeBg = resolved ? '#94a3b8' : isBahaya ? '#dc2626' : '#d97706';
              return (
                <div key={a.id}
                  onClick={() => setSelectedAlert(a)}
                  style={{ background: '#fff', borderRadius: '0.625rem', border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', cursor: 'pointer', opacity: resolved ? 0.72 : 1, transition: 'box-shadow 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,0.09)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'}
                >
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: badgeBg, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {resolved ? 'SELESAI' : a.level.toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{a.sensor_id} <span style={{ fontWeight: 500, color: '#64748b' }}>— {a.parameter}</span></div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.message}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 800, color: valueColor }}>{a.value}<span style={{ fontSize: '0.75rem', marginLeft: 2 }}>{unit}</span></span>
                    <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Aman: {a.threshold_min}–{a.threshold_max}</div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {new Date(a.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {userRole !== 'pengguna' && !resolved && (
                    <button onClick={e => { e.stopPropagation(); handleResolve(a.id); }} style={{ padding: '4px 10px', borderRadius: '0.375rem', border: 'none', background: '#0369a1', color: '#fff', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>✓ Selesai</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }} onClick={() => setSelectedAlert(null)}>
          <div style={{ background: '#fff', width: '90%', maxWidth: '480px', borderRadius: '0.875rem', padding: '1.75rem', boxShadow: '0 20px 40px rgba(15,23,42,0.15)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedAlert(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={15} color="#64748b" />
            </button>
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: selectedAlert.is_resolved ? '#94a3b8' : selectedAlert.level === 'bahaya' ? '#dc2626' : '#d97706', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedAlert.is_resolved ? 'SELESAI' : selectedAlert.level.toUpperCase()}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>Detail Peringatan</h3>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>{new Date(selectedAlert.created_at).toLocaleString('id-ID')}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
              {[
                { label: 'ID Sensor', val: selectedAlert.sensor_id },
                { label: 'Parameter', val: selectedAlert.parameter?.toUpperCase() },
                { label: 'Nilai Terukur', val: `${selectedAlert.value} ${getParamUnit(selectedAlert.parameter)}`, bold: true, color: selectedAlert.level === 'bahaya' ? '#dc2626' : '#d97706' },
                { label: 'Batas Aman', val: `${selectedAlert.threshold_min} – ${selectedAlert.threshold_max}`, color: '#0369a1' },
              ].map(({ label, val, bold, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: bold ? 700 : 600, color: color || '#0f172a' }}>{val}</span>
                </div>
              ))}
            </div>
            <div>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pesan</p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, padding: '0.75rem', background: '#fff', borderRadius: '0.5rem', border: `1px solid ${selectedAlert.level === 'bahaya' ? '#fecaca' : '#fde68a'}` }}>
                {selectedAlert.message}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={() => setSelectedAlert(null)} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Tutup</button>
              {userRole !== 'pengguna' && !selectedAlert.is_resolved && (
                <button onClick={() => handleResolve(selectedAlert.id)} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', background: '#0369a1', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Tandai Selesai</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
