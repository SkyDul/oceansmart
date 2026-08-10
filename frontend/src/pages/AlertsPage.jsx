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
  const { alerts, setAlerts, isConnected } = useAlert();
  const [sensors, setSensors] = useState([]);
  const [wilayahList, setWilayahList] = useState([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedDate, setSelectedDate] = useState('');
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const userWilayah = localStorage.getItem('ocean_wilayah') || '';
  const [selectedWilayah, setSelectedWilayah] = useState(() => {
    if (userRole === 'operator') return userWilayah;
    return 'all';
  });
  const [selectedSensorId, setSelectedSensorId] = useState('all');

  useEffect(() => {
    const fetchStaticData = () => {
      api.get('/sensors').then(res => setSensors(res.data)).catch(console.error);
      api.get('/wilayah').then(res => setWilayahList(res.data)).catch(() => {});
    };

    fetchStaticData();
    const timer = setInterval(fetchStaticData, 15000);
    return () => clearInterval(timer);
  }, []);

  // Sensors filtered by wilayah
  const activeSensors = selectedWilayah === 'all'
    ? sensors
    : sensors.filter(s => (s.wilayah || '').toLowerCase() === selectedWilayah.toLowerCase());

  // Generate list of card items (some sensors have active alerts -> show a card for each alert.
  // Other sensors have no active alerts -> show one NORMAL card for the sensor).
  const cardItems = [];
  
  sensors.forEach(sensor => {
    const activeAlertsForSensor = (alerts || []).filter(
      a => a.sensor_id === sensor.sensor_id && !a.is_resolved
    );

    if (activeAlertsForSensor.length > 0) {
      activeAlertsForSensor.forEach(alert => {
        cardItems.push({
          id: alert.id,
          isAlert: true,
          sensor_id: sensor.sensor_id,
          nama_lokasi: sensor.nama_lokasi,
          wilayah: sensor.wilayah,
          provinsi: sensor.provinsi,
          zona: sensor.zona,
          kedalaman_m: sensor.kedalaman_m,
          latest_reading: sensor.latest_reading,
          
          // Alert specific fields
          level: alert.level,
          parameter: alert.parameter,
          value: alert.value,
          threshold_min: alert.threshold_min,
          threshold_max: alert.threshold_max,
          message: alert.message,
          created_at: alert.created_at,
          is_resolved: false,
          activeAlerts: [alert]
        });
      });
    } else {
      const healthScore = sensor.latest_reading?.health_index || 100;
      const timestamp = sensor.latest_reading?.timestamp || sensor.created_at || new Date().toISOString();
      cardItems.push({
        id: `normal_${sensor.sensor_id}`,
        isAlert: false,
        sensor_id: sensor.sensor_id,
        nama_lokasi: sensor.nama_lokasi,
        wilayah: sensor.wilayah,
        provinsi: sensor.provinsi,
        zona: sensor.zona,
        kedalaman_m: sensor.kedalaman_m,
        latest_reading: sensor.latest_reading,
        
        // Normal card specific fields
        level: 'normal',
        parameter: 'Kondisi Umum',
        value: healthScore,
        threshold_min: 80,
        threshold_max: 100,
        message: 'Semua parameter sensor dalam kondisi aman dan normal.',
        created_at: timestamp,
        is_resolved: false,
        activeAlerts: []
      });
    }
  });

  // Filter mapped card items
  const filteredCards = cardItems.filter(c => {
    // 1. Filter by Wilayah
    if (selectedWilayah !== 'all') {
      const inWilayah = c.wilayah && c.wilayah.toLowerCase() === selectedWilayah.toLowerCase();
      if (!inWilayah) return false;
    }
    // 2. Filter by Sensor ID
    if (selectedSensorId !== 'all' && c.sensor_id !== selectedSensorId) return false;
    
    // 3. Filter by Status/Priority
    if (selectedPriority !== 'all') {
      if (c.level !== selectedPriority) return false;
    }
    
    // 4. Filter by Date
    if (selectedDate && c.created_at) {
      if (new Date(c.created_at).toLocaleDateString('sv-SE') !== selectedDate) return false;
    }
    
    return true;
  });

  // Sort mapped card items
  const sortedCards = [...filteredCards].sort((a, b) => {
    // Sort by level: bahaya > waspada > normal
    if (sortBy === 'level') {
      const score = (lvl) => lvl === 'bahaya' ? 2 : lvl === 'waspada' ? 1 : 0;
      return score(b.level) - score(a.level);
    }
    
    // Sort by timestamp
    const timeA = new Date(a.created_at);
    const timeB = new Date(b.created_at);
    
    if (sortBy === 'newest') return timeB - timeA;
    if (sortBy === 'oldest') return timeA - timeB;
    
    return 0;
  });

  // Handle manual resolution for a specific alert
  const handleResolveAlert = async (alertId) => {
    if (!alertId || typeof alertId === 'string' && alertId.startsWith('normal_')) {
      console.warn('Invalid alertId:', alertId);
      return;
    }
    try {
      await api.patch(`/alerts/${alertId}/resolve`);
      // Remove from context immediately for instant UI update
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      if (selectedAlert?.id === alertId) setSelectedAlert(null);
    } catch (e) {
      console.error('Gagal menyelesaikan peringatan:', e);
      alert('Gagal menyelesaikan peringatan: ' + (e.response?.data?.detail || e.message));
    }
  };

  const activeBahaya = cardItems.filter(c => c.isAlert && c.level === 'bahaya').length;
  const activeWaspada = cardItems.filter(c => c.isAlert && c.level === 'waspada').length;
  const activeNormal = cardItems.filter(c => !c.isAlert).length;

  return (
    <>
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>Peringatan Dini</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              borderRadius: '2rem',
              padding: '0.2rem 0.6rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: isConnected ? '#10b981' : '#ef4444',
              boxShadow: isConnected ? '0 0 8px rgba(16, 185, 129, 0.15)' : 'none'
            }}>
              <span className={isConnected ? "pulse" : ""} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isConnected ? '#10b981' : '#ef4444',
                display: 'inline-block'
              }} />
              {isConnected ? 'Realtime Connected' : 'Disconnected'}
            </div>
          </div>
          <p>Sistem notifikasi real-time kawasan konservasi</p>
        </div>
      </header>

      <div className="page-body fade-in">

        {/* Status Legend */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '0.6rem 1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Keterangan:</span>
          {[
            { dot: '#dc2626', label: 'Bahaya', desc: 'Peringatan aktif' },
            { dot: '#d97706', label: 'Waspada', desc: 'Peringatan aktif' },
            { dot: '#10b981', label: 'Normal', desc: 'Kondisi sensor saat ini' },
          ].map(({ dot, label, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>{label}</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>— {desc}</span>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.875rem', padding: '0.6rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0, marginRight: '0.25rem' }}>
            <MapPin size={14} color="#0369a1" />
            <span>Filter</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.4rem', padding: '0.25rem 0.6rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>Prioritas:</span>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <option value="all">Semua</option>
              <option value="bahaya">Bahaya</option>
              <option value="waspada">Waspada</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          {userRole === 'operator' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '0.4rem', padding: '0.25rem 0.6rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0369a1' }}>Wilayah Kerja:</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0369a1' }}>{userWilayah}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.4rem', padding: '0.25rem 0.6rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>Wilayah:</span>
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
            </div>
          )}
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
            { label: 'Bahaya', value: activeBahaya, icon: <AlertTriangle size={20} color="#fff" />, color: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
            { label: 'Waspada', value: activeWaspada, icon: <Clock size={20} color="#fff" />, color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
            { label: 'Normal', value: activeNormal, icon: <Check size={20} color="#fff" />, color: 'linear-gradient(135deg, #10b981, #047857)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              background: color,
              borderRadius: '1rem',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
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

        {sortedCards.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0' }}>
            Tidak ada peringatan saat ini.
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {sortedCards.map(c => {
              const isDanger = c.level === 'bahaya';
              const isWarning = c.level === 'waspada';
              const isNormal = c.level === 'normal';
              const unit = getParamUnit(c.parameter);
              const valueColor = isDanger ? '#dc2626' : isNormal ? '#10b981' : '#d97706';
              const badgeBg = isDanger ? '#dc2626' : isNormal ? '#e0f2fe' : '#d97706';
              const badgeColor = isNormal ? '#0369a1' : '#fff';
              const badgeLabel = c.level.toUpperCase();

              return (
                <div key={c.id}
                  onClick={() => setSelectedAlert(c)}
                  style={{
                    background: '#fff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e8edf2',
                    boxShadow: '0 1px 6px rgba(15,23,42,0.06)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(15,23,42,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ padding: '1rem 1.125rem', flex: 1, display: 'flex', flexDirection: 'column' }}>

                    {/* Row 1: badge + timestamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', padding: '2px 8px', borderRadius: 3, background: badgeBg, color: badgeColor, textTransform: 'uppercase' }}>
                        {badgeLabel}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} />
                        {new Date(c.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    {/* Row 2: sensor + parameter */}
                    <div style={{ marginBottom: '0.625rem' }}>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.125rem' }}>{c.sensor_id}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500, textTransform: 'capitalize' }}>{c.parameter}</div>
                    </div>

                    {/* Row 3: value + safe range */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                      <span style={{ fontSize: '1.625rem', fontWeight: 800, color: valueColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                        {c.value}<span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: 3, color: valueColor }}>{unit}</span>
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        Aman: {c.threshold_min} – {c.threshold_max}
                      </span>
                    </div>

                    {/* Row 4: message */}
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em' }}>
                      {c.message}
                    </p>
                  </div>

                  {/* Footer: actions */}
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '0.625rem 1.125rem', display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedAlert(c)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0.4rem', borderRadius: '0.375rem', border: '1px solid #0369a1', background: 'transparent', fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', cursor: 'pointer', transition: 'all 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Eye size={13} /> Lihat Detail <ChevronRight size={12} />
                    </button>
                    {userRole !== 'pengguna' && !isNormal && (
                      <button
                        onClick={() => handleResolveAlert(c.id)}
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
            {sortedCards.map(c => {
              const isDanger = c.level === 'bahaya';
              const isWarning = c.level === 'waspada';
              const isNormal = c.level === 'normal';
              const unit = getParamUnit(c.parameter);
              const valueColor = isDanger ? '#dc2626' : isNormal ? '#10b981' : '#d97706';
              const badgeBg = isDanger ? '#dc2626' : isNormal ? '#e0f2fe' : '#d97706';
              const badgeColor = isNormal ? '#0369a1' : '#fff';
              const badgeLabel = c.level.toUpperCase();

              return (
                <div key={c.id}
                  onClick={() => setSelectedAlert(c)}
                  style={{ background: '#fff', borderRadius: '0.625rem', border: '1px solid #e8edf2', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', cursor: 'pointer', transition: 'box-shadow 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,0.09)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,0.05)'}
                >
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 3, background: badgeBg, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {badgeLabel}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                      {c.sensor_id} <span style={{ fontWeight: 500, color: '#64748b' }}>— {c.parameter}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.message}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 800, color: valueColor }}>
                      {c.value}<span style={{ fontSize: '0.75rem', marginLeft: 2 }}>{unit}</span>
                    </span>
                    <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Aman: {c.threshold_min}–{c.threshold_max}</div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {new Date(c.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {userRole !== 'pengguna' && !isNormal && (
                    <button onClick={e => { e.stopPropagation(); handleResolveAlert(c.id); }} style={{ padding: '4px 10px', borderRadius: '0.375rem', border: 'none', background: '#0369a1', color: '#fff', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>✓ Selesai</button>
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
                <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: selectedAlert.level === 'bahaya' ? '#ef4444' : selectedAlert.level === 'waspada' ? '#f59e0b' : '#10b981', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedAlert.level.toUpperCase()}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>Detail Sensor & Status</h3>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>
                {new Date(selectedAlert.latest_reading?.timestamp || selectedAlert.created_at || new Date()).toLocaleString('id-ID')}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.625rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>ID Sensor</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{selectedAlert.sensor_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Lokasi</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{selectedAlert.nama_lokasi}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Wilayah / Prov</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{selectedAlert.wilayah} / {selectedAlert.provinsi}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Zona / Kedalaman</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>{selectedAlert.zona?.replace('_', ' ') || ''} / {selectedAlert.kedalaman_m}m</span>
              </div>
              
              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />
              
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Parameter Saat Ini:</div>
              {[
                { label: 'pH Air', val: selectedAlert.latest_reading?.ph, unit: '', range: '7.5 – 8.5', key: 'pH' },
                { label: 'Suhu Celsius', val: selectedAlert.latest_reading?.suhu_celsius, unit: '°C', range: '26°C – 30°C', key: 'Suhu' },
                { label: 'Salinitas ppt', val: selectedAlert.latest_reading?.salinitas_ppt, unit: ' ppt', range: '30 – 35 ppt', key: 'Salinitas' },
                { label: 'DO (Dissolved Oxygen)', val: selectedAlert.latest_reading?.do_mg_l, unit: ' mg/L', range: '5 – 12 mg/L', key: 'Dissolved Oxygen' },
                { label: 'Kekeruhan NTU', val: selectedAlert.latest_reading?.kekeruhan_ntu, unit: ' NTU', range: '0 – 7 NTU', key: 'Kekeruhan' }
              ].map(({ label, val, unit, range, key }) => {
                const activeAlert = selectedAlert.activeAlerts?.find(a => a.parameter === key);
                const isDanger = activeAlert?.level === 'bahaya';
                const isWarning = activeAlert?.level === 'waspada';
                const color = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
                
                return (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                      {label}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: activeAlert ? color : '#0f172a' }}>
                        {val !== undefined && val !== null ? `${val}${unit}` : 'N/A'}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8', marginLeft: 6 }}>({range})</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <p style={{ margin: '0 0 0.375rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detail Status</p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, padding: '0.75rem', background: '#fff', borderRadius: '0.5rem', border: `1px solid ${selectedAlert.level === 'bahaya' ? '#fecaca' : selectedAlert.level === 'waspada' ? '#fde68a' : '#cbd5e1'}` }}>
                {selectedAlert.message}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button onClick={() => setSelectedAlert(null)} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Tutup</button>
              {userRole !== 'pengguna' && selectedAlert.level !== 'normal' && (
                <button onClick={() => { handleResolveAlert(selectedAlert.id); setSelectedAlert(null); }} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', background: '#0369a1', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Tandai Selesai</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
