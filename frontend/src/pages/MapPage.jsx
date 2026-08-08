import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { MapPin, Layers, Info, Search, Shield, Activity, ArrowRight, Radio, Compass } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function getHealthColor(index) {
  if (index >= 85) return '#16a34a';
  if (index >= 70) return '#22c55e';
  if (index >= 50) return '#eab308';
  if (index >= 30) return '#f97316';
  return '#dc2626';
}

function getHealthStatus(index) {
  if (index >= 85) return 'Sangat Baik';
  if (index >= 70) return 'Baik';
  if (index >= 50) return 'Sedang';
  if (index >= 30) return 'Buruk';
  return 'Kritis';
}

const PROVINCES = [
  { id: 'jabar', name: 'Jawa Barat' },
  { id: 'jatim', name: 'Jawa Timur' },
];

const KABUPATEN_BY_PROVINCE = {
  jabar: [
    { id: 'all', name: 'Semua Wilayah' },
    { id: 'pangandaran', name: 'Kab. Pangandaran' },
    { id: 'pelabuhan_ratu', name: 'Pelabuhan Ratu' },
    { id: 'cirebon', name: 'Cirebon' },
  ],
  jatim: [
    { id: 'all', name: 'Semua Wilayah' },
    { id: 'banyuwangi', name: 'Kab. Banyuwangi' },
    { id: 'pacitan', name: 'Kab. Pacitan' },
    { id: 'malang', name: 'Malang Selatan' },
  ]
};

// Controller component to handle map flyTo animations dynamically
function MapController({ activeSensor }) {
  const map = useMap();
  useEffect(() => {
    if (activeSensor && map) {
      map.flyTo([activeSensor.lat, activeSensor.lng], 14, {
        animate: true,
        duration: 1.2
      });
    }
  }, [activeSensor, map]);
  return null;
}

export default function MapPage() {
  const [sensors, setSensors] = useState([]);
  const [zones, setZones] = useState([]);
  const [healthData, setHealthData] = useState([]);
  const [showZones, setShowZones] = useState(true);
  const [showHealth, setShowHealth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSensor, setActiveSensor] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('sensors'); // 'sensors' | 'legend'
  const navigate = useNavigate();

  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const userProv = localStorage.getItem('ocean_provinsi') || '';
  const userWilayah = localStorage.getItem('ocean_wilayah') || '';
  
  const getProvId = (provName) => {
    if (!provName) return 'jabar';
    const lower = provName.toLowerCase();
    if (lower.includes('barat')) return 'jabar';
    if (lower.includes('timur')) return 'jatim';
    return 'jabar';
  };

  const [selectedProvince, setSelectedProvince] = useState(() => (userRole === 'operator' && userProv) ? getProvId(userProv) : 'jabar');
  const [selectedKabupaten, setSelectedKabupaten] = useState(() => (userRole === 'operator' && userWilayah) ? userWilayah : 'all');

  useEffect(() => {
    Promise.all([
      api.get('/sensors'),
      api.get('/zones'),
      api.get('/health-index'),
    ])
      .then(([senRes, zoneRes, healthRes]) => {
        const fetchedSensors = senRes.data;
        setSensors(fetchedSensors);
        setZones(zoneRes.data);
        setHealthData(healthRes.data);
        
        // Auto focus map to operator's first sensor on load
        if (userRole === 'operator' && fetchedSensors.length > 0) {
          setActiveSensor(fetchedSensors[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const center = [-7.7100, 108.6200]; // Centered at West Java coast (Pangandaran)

  // Filter sensors based on search query and region
  const filteredSensors = sensors.filter(s => {
    const matchesSearch = s.sensor_id.toLowerCase().includes(searchQuery.toLowerCase()) || s.nama_lokasi.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    // Region filtering
    if (selectedKabupaten !== 'all') {
      if ((s.wilayah || '').toLowerCase() !== selectedKabupaten.toLowerCase() && !s.nama_lokasi.toLowerCase().includes(selectedKabupaten.toLowerCase())) {
        return false;
      }
    } else if (selectedProvince && s.provinsi) {
      if (s.provinsi !== selectedProvince) return false;
    }
    return true;
  });

  const getProvinceName = () => PROVINCES.find(p => p.id === selectedProvince)?.name || 'Jawa Barat';
  const getKabupatenName = () => {
    const list = KABUPATEN_BY_PROVINCE[selectedProvince] || [];
    const kab = list.find(k => k.id === selectedKabupaten);
    return kab ? kab.name : selectedKabupaten;
  };
  const regionLabel = userRole === 'operator' ? `${userWilayah}, ${userProv}` : (selectedKabupaten !== 'all' ? getKabupatenName() : getProvinceName());

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
      
      {/* Header Bar - Fixed Top */}
      <header className="page-header" style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Peta Informasi Geografis (SIG)</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.15rem 0 0' }}>Pemantauan terpadu pesisir laut {regionLabel}</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Dropdown Wilayah (hanya untuk Admin & Pengguna) */}
          {userRole !== 'operator' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select 
                className="select select-sm select-bordered" 
                value={selectedProvince}
                onChange={e => { setSelectedProvince(e.target.value); setSelectedKabupaten('all'); }}
                style={{ fontSize: '0.8125rem', fontWeight: 600, borderColor: '#cbd5e1' }}
              >
                {PROVINCES.map(p => <option key={p.id} value={p.id}>Provinsi: {p.name}</option>)}
              </select>
              <select 
                className="select select-sm select-bordered" 
                value={selectedKabupaten}
                onChange={e => setSelectedKabupaten(e.target.value)}
                style={{ fontSize: '0.8125rem', fontWeight: 600, borderColor: '#cbd5e1' }}
              >
                {(KABUPATEN_BY_PROVINCE[selectedProvince] || []).map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Layer Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1' }}>
          <button
            onClick={() => setShowZones(!showZones)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.5rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              cursor: 'pointer',
              background: showZones ? '#023e8a' : 'transparent',
              color: showZones ? '#ffffff' : '#475569',
              boxShadow: showZones ? '0 2px 8px rgba(2,62,138,0.25)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Layers size={14} /> Zona Konservasi
          </button>
          <button
            onClick={() => setShowHealth(!showHealth)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.5rem',
              fontWeight: 600,
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              cursor: 'pointer',
              background: showHealth ? '#023e8a' : 'transparent',
              color: showHealth ? '#ffffff' : '#475569',
              boxShadow: showHealth ? '0 2px 8px rgba(2,62,138,0.25)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Info size={14} /> Indeks Kesehatan
          </button>
        </div>
        </div>
      </header>

      {/* Main Fullscreen GIS Layout - Strictly 0 Window Scrolling */}
      <div style={{ flex: 1, padding: '1rem', overflow: 'hidden', display: 'flex', gap: '1.25rem' }}>
        
        {/* 1. Left Map Canvas Card */}
        <div style={{ flex: 1, height: '100%', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', position: 'relative' }}>
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />

            {/* Map dynamic controller for flyTo */}
            <MapController activeSensor={activeSensor} />

            {/* Conservation Zones Polygons */}
            {showZones && zones.map(zone => {
              if (!zone.geojson?.coordinates) return null;
              const positions = zone.geojson.coordinates[0].map(c => [c[1], c[0]]);
              return (
                <Polygon
                  key={zone.id}
                  positions={positions}
                  pathOptions={{
                    color: zone.color,
                    fillColor: zone.color,
                    fillOpacity: 0.14,
                    weight: 2,
                    dashArray: '4, 6'
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 220, fontFamily: 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Shield size={16} color={zone.color} />
                        <strong style={{ fontSize: 13, color: '#0f172a' }}>{zone.name}</strong>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: zone.color, letterSpacing: 0.5, marginBottom: 6 }}>
                        Tipe: {zone.zone_type.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                        {zone.description}
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Sensors Markers */}
            {sensors.map(sensor => {
              const health = healthData.find(h => h.sensor_id === sensor.sensor_id);
              const idx = health?.health_index || 0;
              const color = getHealthColor(idx);

              return showHealth ? (
                <CircleMarker
                  key={sensor.sensor_id}
                  center={[sensor.lat, sensor.lng]}
                  radius={13}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 230, fontFamily: 'inherit' }}>
                      <strong style={{ fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 2 }}>{sensor.nama_lokasi}</strong>
                      <span style={{ fontSize: 10, background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: 4, color: '#64748b', fontWeight: 600 }}>{sensor.sensor_id}</span>
                      
                      {sensor.latest_reading && (
                        <div style={{ fontSize: 11, marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                          <div>pH: <strong style={{ color: '#0f172a' }}>{sensor.latest_reading.ph}</strong></div>
                          <div>Suhu: <strong style={{ color: '#0f172a' }}>{sensor.latest_reading.suhu_celsius}°C</strong></div>
                          <div>DO: <strong style={{ color: '#0f172a' }}>{sensor.latest_reading.do_mg_l} mg/L</strong></div>
                          <div>Keruh: <strong style={{ color: '#0f172a' }}>{sensor.latest_reading.kekeruhan_ntu} NTU</strong></div>
                        </div>
                      )}
                      
                      <div style={{ marginTop: 10, padding: '0.45rem', background: `${color}15`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color }}>Health Index:</span>
                        <strong style={{ fontSize: 12, fontWeight: 800, color }}>{idx}/100 ({getHealthStatus(idx)})</strong>
                      </div>

                      <button
                        onClick={() => navigate(`/monitoring/${sensor.sensor_id}`)}
                        style={{
                          marginTop: 10, width: '100%', padding: '0.55rem',
                          background: 'linear-gradient(135deg, #023e8a, #0077b6)', color: 'white', border: 'none',
                          borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          boxShadow: '0 4px 10px rgba(2,62,138,0.2)'
                        }}
                      >
                        Buka Monitoring Detail <ArrowRight size={13} />
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : (
                <Marker key={sensor.sensor_id} position={[sensor.lat, sensor.lng]}>
                  <Popup>
                    <strong style={{ fontSize: 13 }}>{sensor.nama_lokasi}</strong>
                    <br /><span style={{ fontSize: 10, color: '#64748b' }}>{sensor.sensor_id}</span>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* 2. Right Control Panel Sidebar (Spacious & Tabbed Layout) */}
        <div style={{ width: 380, height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '1rem', border: '1px solid #cbd5e1', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          
          {/* Tab Navigation Switcher Header */}
          <div style={{ display: 'flex', background: '#f8fafc', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', gap: '0.5rem' }}>
            <button
              onClick={() => setSidebarTab('sensors')}
              style={{
                flex: 1,
                padding: '0.6rem 0.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: sidebarTab === 'sensors' ? '#ffffff' : 'transparent',
                color: sidebarTab === 'sensors' ? '#023e8a' : '#64748b',
                boxShadow: sidebarTab === 'sensors' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Radio size={15} color={sidebarTab === 'sensors' ? '#023e8a' : '#64748b'} /> Stasiun ({sensors.length})
            </button>

            <button
              onClick={() => setSidebarTab('legend')}
              style={{
                flex: 1,
                padding: '0.6rem 0.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: sidebarTab === 'legend' ? '#ffffff' : 'transparent',
                color: sidebarTab === 'legend' ? '#023e8a' : '#64748b',
                boxShadow: sidebarTab === 'legend' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <Compass size={15} color={sidebarTab === 'legend' ? '#023e8a' : '#64748b'} /> Legenda & Info
            </button>
          </div>

          {/* TAB 1: SENSORS LIST */}
          {sidebarTab === 'sensors' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1rem' }}>
              
              {/* Search Bar Input */}
              <div style={{ position: 'relative', width: '100%', marginBottom: '0.85rem' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Cari stasiun sensor atau lokasi..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 1rem 0.6rem 2.35rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.625rem',
                    fontSize: '0.8125rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#023e8a'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Scrollable list of sensors with generous card spacing */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.2rem' }}>
                {filteredSensors.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    Stasiun tidak ditemukan.
                  </div>
                ) : (
                  filteredSensors.map(s => {
                    const health = healthData.find(h => h.sensor_id === s.sensor_id);
                    const idx = health?.health_index || 0;
                    const hColor = getHealthColor(idx);
                    const isActive = activeSensor?.sensor_id === s.sensor_id;

                    return (
                      <div
                        key={s.sensor_id}
                        onClick={() => setActiveSensor(s)}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.65rem',
                          border: isActive ? '1px solid #023e8a' : '1px solid #e2e8f0',
                          background: isActive ? '#f0f9ff' : '#ffffff',
                          boxShadow: isActive ? '0 4px 12px rgba(2,62,138,0.08)' : 'none',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Indicator dot */}
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: hColor, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{s.nama_lokasi}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.sensor_id}</span>
                              <span>•</span>
                              <span>{s.zona.replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <span className={`badge badge-${s.status_koneksi}`} style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem' }}>{s.status_koneksi}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: hColor }}>HI: {idx}/100</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LEGEND & INFO */}
          {sidebarTab === 'legend' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Zona Konservasi Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
                  <Shield size={18} color="#023e8a" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Zona Konservasi Laut</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {zones.map(z => (
                    <div key={z.id} style={{ padding: '0.75rem', borderRadius: '0.625rem', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 4, background: z.color, opacity: 0.85, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{z.name}</div>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: z.color, textTransform: 'uppercase', letterSpacing: 0.5, margin: '2px 0 4px' }}>
                          Tipe: {z.zone_type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                          {z.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indeks Kesehatan Section */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
                  <Activity size={18} color="#023e8a" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Klasifikasi Health Index</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { label: 'Sangat Baik (85 - 100)', color: '#16a34a', desc: 'Ekosistem sangat sehat & seimbang' },
                    { label: 'Baik (70 - 84)', color: '#22c55e', desc: 'Kondisi air stabil & mendukung biota' },
                    { label: 'Sedang (50 - 69)', color: '#eab308', desc: 'Memerlukan pemantauan rutin' },
                    { label: 'Buruk (30 - 49)', color: '#f97316', desc: 'Terjadi penurunan kualitas parameter' },
                    { label: 'Kritis (< 30)', color: '#dc2626', desc: 'Ancaman pencemaran / suhu ekstrem' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '0.65rem 0.85rem', borderRadius: '0.5rem', background: `${item.color}08`, border: `1px solid ${item.color}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
