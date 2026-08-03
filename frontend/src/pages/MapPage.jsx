import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { MapPin, Layers, Info } from 'lucide-react';
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

export default function MapPage() {
  const [sensors, setSensors] = useState([]);
  const [zones, setZones] = useState([]);
  const [healthData, setHealthData] = useState([]);
  const [showZones, setShowZones] = useState(true);
  const [showHealth, setShowHealth] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/sensors'),
      api.get('/zones'),
      api.get('/health-index'),
    ])
      .then(([senRes, zoneRes, healthRes]) => {
        setSensors(senRes.data);
        setZones(zoneRes.data);
        setHealthData(healthRes.data);
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

  const center = [-7.68, 108.60];

  return (
    <>
      <header className="page-header">
        <div>
          <h2>Peta SIG</h2>
          <p>Peta interaktif kawasan konservasi laut</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${showZones ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowZones(!showZones)}
          >
            <Layers size={14} /> Zona
          </button>
          <button
            className={`btn btn-sm ${showHealth ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowHealth(!showHealth)}
          >
            <Info size={14} /> Health Index
          </button>
        </div>
      </header>

      <div className="page-body fade-in">
        <div className="grid-map-sidebar">
          <div className="map-container" style={{ height: 'calc(100vh - 160px)' }}>
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />

              {/* Conservation Zones */}
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
                      fillOpacity: 0.15,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <strong style={{ fontSize: 14 }}>{zone.name}</strong>
                        <div style={{ fontSize: 12, marginTop: 4, color: '#64748b' }}>
                          Tipe: {zone.zone_type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>{zone.description}</div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}

              {/* Sensor Markers */}
              {sensors.map(sensor => {
                const health = healthData.find(h => h.sensor_id === sensor.sensor_id);
                const idx = health?.health_index || 0;
                const color = getHealthColor(idx);

                return showHealth ? (
                  <CircleMarker
                    key={sensor.sensor_id}
                    center={[sensor.lat, sensor.lng]}
                    radius={14}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.6,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 220 }}>
                        <strong style={{ fontSize: 14 }}>{sensor.nama_lokasi}</strong>
                        <div style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0' }}>{sensor.sensor_id}</div>
                        {sensor.latest_reading && (
                          <div style={{ fontSize: 12, marginTop: 8 }}>
                            <div>pH: <strong>{sensor.latest_reading.ph}</strong></div>
                            <div>Suhu: <strong>{sensor.latest_reading.suhu_celsius}°C</strong></div>
                            <div>DO: <strong>{sensor.latest_reading.do_mg_l} mg/L</strong></div>
                            <div>Kekeruhan: <strong>{sensor.latest_reading.kekeruhan_ntu} NTU</strong></div>
                            <div style={{ marginTop: 8, fontWeight: 700, color }}>
                              Health Index: {idx}/100
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => navigate(`/monitoring/${sensor.sensor_id}`)}
                          style={{
                            marginTop: 8, width: '100%', padding: '6px',
                            background: '#023e8a', color: 'white', border: 'none',
                            borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600
                          }}
                        >
                          Lihat Detail →
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ) : (
                  <Marker key={sensor.sensor_id} position={[sensor.lat, sensor.lng]}>
                    <Popup>
                      <strong>{sensor.nama_lokasi}</strong>
                      <br /><span style={{ fontSize: 11 }}>{sensor.sensor_id}</span>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Sidebar Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Zone Legend */}
            <div className="card">
              <div className="card-header"><h3>Legenda Zona</h3></div>
              <div className="card-body" style={{ padding: '1rem' }}>
                {zones.map(z => (
                  <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: z.color, opacity: 0.7 }} />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{z.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-muted)' }}>
                        {z.zone_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Index Legend */}
            <div className="card">
              <div className="card-header"><h3>Health Index</h3></div>
              <div className="card-body" style={{ padding: '1rem' }}>
                {[
                  { label: 'Sangat Baik (85-100)', color: '#16a34a' },
                  { label: 'Baik (70-84)', color: '#22c55e' },
                  { label: 'Sedang (50-69)', color: '#eab308' },
                  { label: 'Buruk (30-49)', color: '#f97316' },
                  { label: 'Kritis (<30)', color: '#dc2626' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: '0.75rem' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sensors Quick List */}
            <div className="card">
              <div className="card-header"><h3>Sensor ({sensors.length})</h3></div>
              <div className="card-body" style={{ padding: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
                {sensors.map(s => (
                  <div
                    key={s.sensor_id}
                    onClick={() => navigate(`/monitoring/${s.sensor_id}`)}
                    style={{
                      padding: '0.5rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{s.sensor_id}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-muted)' }}>{s.nama_lokasi}</div>
                    </div>
                    <span className={`badge badge-${s.status_koneksi}`}>{s.status_koneksi}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
