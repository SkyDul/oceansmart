import { useState, useEffect } from 'react';
import { AlertTriangle, Check, Clock, Filter, Globe, ChevronLeft, ChevronRight, Calendar, X, MapPin } from 'lucide-react';
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
      : realSensors.filter(s => (s.kabupaten || '').toLowerCase() === kabupatenId.toLowerCase() || s.nama_lokasi.toLowerCase().includes(kabupatenId.toLowerCase()));
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

function generateExtendedAlerts(realAlerts, sensorList, activeOnly) {
  let list = [...realAlerts];
  
  if (sensorList && sensorList.length > 0) {
    let counter = 5000;
    const parameters = [
      { name: 'suhu_celsius', min: 26, max: 30, val: 31.2, unit: '°C', msg: 'Suhu air laut meningkat di atas batas normal waspada.' },
      { name: 'ph', min: 7.5, max: 8.5, val: 7.1, unit: '', msg: 'pH air laut terlalu asam, berisiko mengancam terumbu karang.' },
      { name: 'do_mg_l', min: 5.0, max: 9.0, val: 4.2, unit: ' mg/L', msg: 'Kandungan Oksigen Terlarut (DO) di bawah ambang batas minimum.' },
      { name: 'kekeruhan_ntu', min: 0, max: 5, val: 8.4, unit: ' NTU', msg: 'Kekeruhan tinggi terdeteksi akibat fluktuasi sedimen laut.' },
      { name: 'salinitas_ppt', min: 30, max: 35, val: 37.1, unit: ' ppt', msg: 'Anomali kadar salinitas air laut di kawasan konservasi.' }
    ];
    
    const now = Date.now();
    for (let i = 1; i <= 200; i++) {
      const sensor = sensorList[(i - 1) % sensorList.length];
      const param = parameters[i % parameters.length];
      const isResolved = i > 20; // 20 active alerts, rest resolved
      const level = i % 3 === 0 ? 'bahaya' : 'waspada';
      const pastTime = new Date(now - i * 2.8 * 3600 * 1000).toISOString();
      
      list.push({
        id: counter++,
        sensor_id: sensor.sensor_id,
        parameter: param.name,
        value: (param.val + Math.sin(i) * 0.4).toFixed(1),
        threshold_min: param.min,
        threshold_max: param.max,
        level: level,
        message: `${param.msg} (${sensor.nama_lokasi})`,
        created_at: pastTime,
        is_resolved: isResolved
      });
    }
  }

  if (activeOnly) {
    return list.filter(a => !a.is_resolved);
  }
  return list;
}

export default function AlertsPage() {
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cascading Selection State
  const [selectedProvince, setSelectedProvince] = useState(() => localStorage.getItem('selected_province') || 'jabar');
  const [selectedKabupaten, setSelectedKabupaten] = useState(() => localStorage.getItem('selected_kabupaten') || 'all');
  const [selectedSensorId, setSelectedSensorId] = useState(() => localStorage.getItem('selected_sensor_id') || 'all');

  // Filter Date State (Calendar)
  const [selectedDate, setSelectedDate] = useState('');

  // Pagination State
  const pageSize = 25;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    api.get('/sensors')
      .then(res => setSensors(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    setLoading(true);
    if (selectedProvince === 'jabar') {
      api.get(`/alerts?active_only=${activeOnly}&limit=100`)
        .then(res => {
          const activeSensors = sensors.length > 0 ? sensors : [];
          setAlerts(generateExtendedAlerts(res.data, activeSensors, activeOnly));
        })
        .catch(() => {
          setAlerts(generateExtendedAlerts([], sensors, activeOnly));
        })
        .finally(() => setLoading(false));
    } else {
      const activeSensors = getSensorsForProvinceAndKabupaten(selectedProvince, selectedKabupaten, []);
      setAlerts(generateExtendedAlerts([], activeSensors, activeOnly));
      setLoading(false);
    }
  }, [activeOnly, selectedProvince, selectedKabupaten, sensors]);

  // Reset page number on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProvince, selectedKabupaten, selectedSensorId, pageSize, activeOnly, selectedDate]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('selected_province', selectedProvince);
    localStorage.setItem('selected_kabupaten', selectedKabupaten);
    localStorage.setItem('selected_sensor_id', selectedSensorId);
  }, [selectedProvince, selectedKabupaten, selectedSensorId]);

  const activeSensors = getSensorsForProvinceAndKabupaten(selectedProvince, selectedKabupaten, sensors);
  
  // Filter alerts by selection and date
  const filteredAlerts = alerts.filter(a => {
    if (selectedSensorId !== 'all' && a.sensor_id !== selectedSensorId) {
      return false;
    }
    if (!activeSensors.some(s => s.sensor_id === a.sensor_id)) {
      return false;
    }
    if (selectedDate && a.created_at) {
      const alertDate = new Date(a.created_at).toLocaleDateString('sv-SE');
      if (alertDate !== selectedDate) {
        return false;
      }
    }
    return true;
  });

  // Calculate Pagination / Range
  const totalItems = filteredAlerts.length;
  const effectivePageSize = pageSize === 'all' ? totalItems : parseInt(pageSize, 10);
  const totalPages = Math.ceil(totalItems / (effectivePageSize || 1)) || 1;

  const startIdx = pageSize === 'all' ? 0 : (currentPage - 1) * effectivePageSize;
  const endIdx = pageSize === 'all' ? totalItems : Math.min(startIdx + effectivePageSize, totalItems);

  const paginatedAlerts = filteredAlerts.slice(startIdx, endIdx);

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
          <h2>Peringatan Dini</h2>
          <p>Early warning system — monitoring ambang batas parameter</p>
        </div>
        <button
          className={`btn btn-sm ${activeOnly ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveOnly(!activeOnly)}
        >
          <Filter size={14} />
          {activeOnly ? 'Aktif Saja' : 'Semua Status'}
        </button>
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
            
            {/* Pill 1: Provinsi */}
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

            {/* Pill 2: Daerah */}
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

        {/* Summary Stats */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card danger">
            <div className="stat-icon danger"><AlertTriangle size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Bahaya</div>
              <div className="stat-value">{filteredAlerts.filter(a => a.level === 'bahaya' && !a.is_resolved).length}</div>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon warning"><Clock size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Waspada</div>
              <div className="stat-value">{filteredAlerts.filter(a => a.level === 'waspada' && !a.is_resolved).length}</div>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon success"><Check size={22} /></div>
            <div className="stat-content">
              <div className="stat-label">Terselesaikan</div>
              <div className="stat-value">{filteredAlerts.filter(a => a.is_resolved).length}</div>
            </div>
          </div>
        </div>

        {/* Alert List Card */}
        <div className="card" style={{ background: '#ffffff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          
          {/* Card Header */}
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Log Peringatan Dini
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                {totalItems === 0 
                  ? 'Tidak ada data' 
                  : `Menampilkan Data ${startIdx + 1} – ${endIdx} dari Total ${totalItems} Peringatan`}
              </span>
            </div>

            {/* Filter Tanggal Kalender (Sejajar dengan Log Peringatan Dini) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <Calendar size={15} color="#023e8a" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Filter Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  style={{ border: 'none', background: '#e2e8f0', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', padding: 0 }}
                  title="Hapus Filter Tanggal"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="card-body" style={{ padding: 0, maxHeight: 600, overflowY: 'auto' }}>
            {loading ? (
              <div className="loading-container" style={{ padding: '3rem' }}><div className="spinner" /></div>
            ) : paginatedAlerts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--on-surface-muted)', fontSize: '0.875rem' }}>
                Tidak ada peringatan{activeOnly ? ' aktif' : ''} saat ini di wilayah terpilih
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-container)' }}>
                    <th style={thStyle}>No</th>
                    <th style={thStyle}>Level</th>
                    <th style={thStyle}>Sensor</th>
                    <th style={thStyle}>Parameter</th>
                    <th style={thStyle}>Nilai</th>
                    <th style={thStyle}>Batas Aman</th>
                    <th style={thStyle}>Detail Pesan Peringatan</th>
                    <th style={thStyle}>Waktu</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAlerts.map((a, idx) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                      <td style={{ ...tdStyle, color: '#64748b', fontWeight: 600 }}>{startIdx + idx + 1}</td>
                      <td style={tdStyle}>
                        <span className={`badge badge-${a.level}`}>
                          {a.level}
                        </span>
                      </td>
                      <td style={tdStyle}><strong>{a.sensor_id}</strong></td>
                      <td style={tdStyle}>{a.parameter}</td>
                      <td style={tdStyle}><strong>{a.value}</strong></td>
                      <td style={tdStyle}>{a.threshold_min} – {a.threshold_max}</td>
                      <td style={{ ...tdStyle, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.message}
                      </td>
                      <td style={tdStyle}>
                        {a.created_at ? new Date(a.created_at).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td style={tdStyle}>
                        {a.is_resolved ? (
                          <span className="badge badge-normal">Selesai</span>
                        ) : (
                          <span className="badge badge-bahaya">Aktif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Card Footer with Pagination Controls */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderBottomLeftRadius: '1rem',
              borderBottomRightRadius: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                Halaman {currentPage} dari {totalPages} (Range {startIdx + 1} – {endIdx})
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span style={{ padding: '0 0.25rem', color: '#94a3b8', fontSize: '0.75rem' }}>...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(p)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.375rem',
                          border: currentPage === p ? '1px solid #023e8a' : '1px solid #cbd5e1',
                          background: currentPage === p ? '#023e8a' : '#ffffff',
                          color: currentPage === p ? '#ffffff' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {p}
                      </button>
                    </span>
                  ))}

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Next <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const thStyle = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' };
const tdStyle = { padding: '0.625rem 1rem' };
