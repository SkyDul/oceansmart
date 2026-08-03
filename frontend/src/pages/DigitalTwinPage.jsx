import { useState, useEffect, useRef } from 'react';
import { Layers, Thermometer, Droplets, Wind, Eye, Activity, Heart, Play, Pause, SkipBack, Fish, AlertTriangle, Sliders } from 'lucide-react';
import '@google/model-viewer';
import api from '../api';

import modelNemo from '../assets/models/nemo.glb';
import modelButterfly from '../assets/models/Butterfly Fish.glb';
import modelTurtle from '../assets/models/kura kura hijau.glb';
import modelBlowfish from '../assets/models/Blowfish.glb';
import modelStarfish from '../assets/models/starfish.glb';
import modelShark from '../assets/models/Great white shark.glb';
import modelSeahorse from '../assets/models/Seahorse.glb';
import modelHumphead from '../assets/models/Humphead.glb';
import modelJellyfish from '../assets/models/Jellyfish.glb';
import modelManta from '../assets/models/Manta ray.glb';
import modelTuna from '../assets/models/Tuna.glb';
import modelOctopus from '../assets/models/gurita.glb';

const MODEL_MAP = {
  'Ikan Badut (Nemo)': modelNemo,
  'Ikan Kepe-kepe': modelButterfly,
  'Penyu Hijau': modelTurtle,
  'Ikan Buntal': modelBlowfish,
  'Bintang Laut Biru': modelStarfish,
  'Hiu Karang Sirip Hitam': modelShark,
  'Kuda Laut Pygmy': modelSeahorse,
  'Ikan Napoleon': modelHumphead,
  'Ubur-ubur Kotak': modelJellyfish,
  'Pari Manta': modelManta,
  'Ikan Tuna': modelTuna,
  'Gurita Cincin Biru': modelOctopus,
};

const DEPTH_LAYERS = [
  { id: 'surface', label: 'Permukaan', range: '0m', color: '#90e0ef', bgGrad: 'linear-gradient(180deg, #caf0f8 0%, #90e0ef 100%)' },
  { id: 'shallow', label: 'Dangkal', range: '0-5m', color: '#48cae4', bgGrad: 'linear-gradient(180deg, #90e0ef 0%, #48cae4 100%)' },
  { id: 'mid', label: 'Menengah', range: '5-15m', color: '#0096c7', bgGrad: 'linear-gradient(180deg, #48cae4 0%, #0096c7 100%)' },
  { id: 'deep', label: 'Dalam', range: '15-30m', color: '#023e8a', bgGrad: 'linear-gradient(180deg, #0096c7 0%, #023e8a 100%)' },
];

const BIOTA_BY_DEPTH = {
  'surface': ['Ubur-ubur Kotak', 'Bintang Laut Biru'],
  'shallow': ['Ikan Badut (Nemo)', 'Ikan Kepe-kepe', 'Gurita Cincin Biru'],
  'mid': ['Ikan Buntal', 'Hiu Karang Sirip Hitam', 'Ikan Napoleon', 'Ikan Tuna'],
  'deep': ['Kuda Laut Pygmy', 'Pari Manta'],
};

const DigitalTwinModelViewer = ({ src }) => {
  const viewerRef = useRef(null);
  const [anim, setAnim] = useState(undefined);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const handleLoad = () => {
      const anims = viewer.availableAnimations || [];
      if (anims.length > 0) {
        // Cari yang mengandung kata swim, jika tidak ada pakai animasi pertama
        const swimAnim = anims.find(a => a.toLowerCase().includes('swim'));
        setAnim(swimAnim || anims[0]);
      }
    };
    viewer.addEventListener('load', handleLoad);
    return () => viewer.removeEventListener('load', handleLoad);
  }, []);

  return (
    <model-viewer
      ref={viewerRef}
      src={src}
      auto-rotate
      autoplay
      animation-name={anim}
      interaction-prompt="none"
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    ></model-viewer>
  );
};

function getHealthColor(v) {
  if (v >= 85) return '#16a34a';
  if (v >= 70) return '#22c55e';
  if (v >= 50) return '#eab308';
  if (v >= 30) return '#f97316';
  return '#dc2626';
}

function getHealthLabel(v) {
  if (v >= 85) return 'Sangat Baik';
  if (v >= 70) return 'Baik';
  if (v >= 50) return 'Sedang';
  if (v >= 30) return 'Buruk';
  return 'Kritis';
}

function getTurbidityOpacity(ntu) {
  return Math.min(0.15 + (ntu / 25) * 0.5, 0.6);
}

export default function DigitalTwinPage() {
  const [sensors, setSensors] = useState([]);
  const [biota, setBiota] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simTemp, setSimTemp] = useState(0);
  const [simMode, setSimMode] = useState(false);
  const [playback, setPlayback] = useState(false);
  const [time, setTime] = useState(100);
  const intervalRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/sensors'),
      api.get('/biota'),
      api.get('/alerts?active_only=true&limit=20'),
    ]).then(([s, b, a]) => {
      setSensors(s.data);
      setBiota(b.data);
      setAlerts(a.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (playback) {
      intervalRef.current = setInterval(() => {
        setTime(t => t >= 100 ? 0 : t + 1);
      }, 200);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playback]);

  const avgHealth = sensors.length > 0
    ? Math.round(sensors.reduce((s, x) => s + (x.latest_reading?.health_index || 0), 0) / sensors.length)
    : 0;

  const simulatedHealth = simMode ? Math.max(0, Math.min(100, avgHealth - simTemp * 8)) : avgHealth;
  const healthColor = getHealthColor(simulatedHealth);

  const sensorsByDepth = {
    surface: sensors.filter(s => s.kedalaman_m <= 1),
    shallow: sensors.filter(s => s.kedalaman_m > 1 && s.kedalaman_m <= 5),
    mid: sensors.filter(s => s.kedalaman_m > 5 && s.kedalaman_m <= 15),
    deep: sensors.filter(s => s.kedalaman_m > 15),
  };

  const avgTurbidity = sensors.length > 0
    ? sensors.reduce((s, x) => s + (x.latest_reading?.kekeruhan_ntu || 3), 0) / sensors.length
    : 3;

  if (loading) {
    return <div className="loading-container" style={{ height: '100vh' }}><div className="spinner" /></div>;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h2>Digital Twin</h2>
          <p>Representasi virtual kawasan konservasi laut</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className={`btn btn-sm ${simMode ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSimMode(!simMode)}>
            <Sliders size={14} /> What-If
          </button>
          <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>Live</span>
        </div>
      </header>

      <div className="page-body fade-in">
        {/* What-If Panel */}
        {simMode && (
          <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid var(--secondary)' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 250 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 8 }}>
                  <Thermometer size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Simulasi Kenaikan Suhu: <span style={{ color: simTemp > 0 ? 'var(--danger)' : 'var(--on-surface)' }}>+{simTemp.toFixed(1)}°C</span>
                </div>
                <input type="range" min="0" max="5" step="0.5" value={simTemp}
                  onChange={e => setSimTemp(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--danger)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--on-surface-muted)' }}>
                  <span>Normal</span><span>+2.5°C</span><span>+5°C Kritis</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-muted)', marginBottom: 4 }}>Prediksi Kesehatan</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: healthColor }}>{simulatedHealth}</div>
                <div style={{ fontSize: '0.75rem', color: healthColor, fontWeight: 600 }}>{getHealthLabel(simulatedHealth)}</div>
              </div>
              {simTemp >= 2 && (
                <div style={{ background: 'var(--danger-bg)', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--danger)', maxWidth: 250 }}>
                  <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  <strong>Risiko tinggi!</strong> Kenaikan suhu {simTemp}°C dapat menyebabkan pemutihan karang massal.
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          {/* Main 2.5D Visualization */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header">
              <h3><Layers size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Cross-Section Kawasan Konservasi</h3>
              {/* Playback Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setTime(0); setPlayback(false); }}><SkipBack size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => setPlayback(!playback)}>
                  {playback ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-muted)', minWidth: 80 }}>
                  {playback ? 'Playing...' : 'Live Data'}
                </span>
              </div>
            </div>

            {/* Ocean Cross Section */}
            <div style={{ position: 'relative', height: 520, background: 'linear-gradient(180deg, #e0f7fa 0%, #006994 100%)', overflow: 'hidden' }}>
              {/* Sky */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(180deg, #87CEEB 0%, #B0E0E6 100%)', zIndex: 1 }}>
                <div style={{ position: 'absolute', bottom: 8, left: 20, fontSize: '0.6875rem', fontWeight: 600, color: '#0369a1' }}>
                  Permukaan Laut
                </div>
              </div>

              {/* Wave animation */}
              <svg style={{ position: 'absolute', top: 52, left: 0, width: '200%', height: 20, zIndex: 2 }} viewBox="0 0 1440 20">
                <path d="M0,10 C120,0 240,20 360,10 C480,0 600,20 720,10 C840,0 960,20 1080,10 C1200,0 1320,20 1440,10" fill="none" stroke="#48cae4" strokeWidth="2" opacity="0.6">
                  <animate attributeName="d" dur="3s" repeatCount="indefinite"
                    values="M0,10 C120,0 240,20 360,10 C480,0 600,20 720,10 C840,0 960,20 1080,10 C1200,0 1320,20 1440,10;M0,10 C120,20 240,0 360,10 C480,20 600,0 720,10 C840,20 960,0 1080,10 C1200,20 1320,0 1440,10;M0,10 C120,0 240,20 360,10 C480,0 600,20 720,10 C840,0 960,20 1080,10 C1200,0 1320,20 1440,10" />
                </path>
              </svg>

              {/* Depth Layers */}
              {DEPTH_LAYERS.map((layer, idx) => {
                const top = 60 + idx * 115;
                const isSelected = selectedLayer === layer.id;
                const layerSensors = sensorsByDepth[layer.id] || [];
                const layerBiota = BIOTA_BY_DEPTH[layer.id] || [];
                const turbOpacity = getTurbidityOpacity(simMode ? avgTurbidity + simTemp * 2 : avgTurbidity);

                return (
                  <div key={layer.id}
                    onClick={() => setSelectedLayer(isSelected ? null : layer.id)}
                    style={{
                      position: 'absolute', top, left: 0, right: 0, height: 115,
                      background: layer.bgGrad,
                      borderTop: idx > 0 ? '1px dashed rgba(255,255,255,0.3)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      outline: isSelected ? '2px solid #fff' : 'none',
                      outlineOffset: -2,
                      zIndex: isSelected ? 10 : 3 + idx,
                    }}>
                    {/* Turbidity overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: `rgba(139,119,80,${turbOpacity * (idx + 1) * 0.15})`, pointerEvents: 'none' }} />

                    {/* Layer label */}
                    <div style={{ position: 'absolute', left: 16, top: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 5 }}>
                      <div style={{
                        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 700, color: '#fff',
                      }}>
                        {layer.label} ({layer.range})
                      </div>
                      {layerSensors.length > 0 && (
                        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '3px 8px', borderRadius: 6, fontSize: '0.625rem', color: '#caf0f8' }}>
                          {layerSensors.length} sensor
                        </div>
                      )}
                    </div>

                    {/* Sensor dots */}
                    {layerSensors.map((s, si) => {
                      const x = 15 + ((si + 1) / (layerSensors.length + 1)) * 70;
                      const hi = s.latest_reading?.health_index || 75;
                      const c = getHealthColor(simMode ? Math.max(0, hi - simTemp * 8) : hi);
                      return (
                        <div key={s.sensor_id} style={{
                          position: 'absolute', left: `${x}%`, top: '50%', transform: 'translate(-50%, -50%)', zIndex: 6,
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', background: c,
                            border: '3px solid rgba(255,255,255,0.8)', boxShadow: `0 0 12px ${c}80`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.625rem', fontWeight: 800, color: '#fff',
                          }}>
                            {simMode ? Math.max(0, Math.round(hi - simTemp * 8)) : Math.round(hi)}
                          </div>
                          <div style={{
                            textAlign: 'center', marginTop: 4, fontSize: '0.5625rem', fontWeight: 600,
                            color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
                          }}>
                            {s.sensor_id.replace('OS-SENSOR-', 'S')}
                          </div>
                        </div>
                      );
                    })}

                    {/* Biota icons floating */}
                    {layerBiota.map((biotaName, bi) => {
                      const modelSrc = MODEL_MAP[biotaName];
                      const x = 70 + bi * 10;
                      const y = 15 + (bi % 2) * 35;
                      const animDelay = bi * 0.8;
                      return (
                        <div key={bi} style={{
                          position: 'absolute', left: `${x}%`, top: y, width: 60, height: 60,
                          opacity: 0.85, zIndex: 5, pointerEvents: 'none',
                          animation: `float ${3 + bi}s ease-in-out ${animDelay}s infinite alternate`,
                        }}>
                          {modelSrc ? (
                            <DigitalTwinModelViewer src={modelSrc} />
                          ) : (
                            <span style={{ fontSize: '1.5rem' }}>🐟</span>
                          )}
                        </div>
                      );
                    })}

                    {/* Coral/seabed for deep layer */}
                    {idx === 3 && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(0deg, #1a1a2e 0%, transparent 100%)', zIndex: 4 }}>
                        <div style={{ position: 'absolute', bottom: 5, left: '10%', fontSize: '1.2rem', opacity: 0.5 }}>🪸</div>
                        <div style={{ position: 'absolute', bottom: 3, left: '30%', fontSize: '1rem', opacity: 0.4 }}>🪨</div>
                        <div style={{ position: 'absolute', bottom: 5, left: '55%', fontSize: '1.3rem', opacity: 0.5 }}>🪸</div>
                        <div style={{ position: 'absolute', bottom: 2, left: '75%', fontSize: '0.9rem', opacity: 0.4 }}>🪨</div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Depth scale */}
              <div style={{ position: 'absolute', right: 12, top: 65, bottom: 10, width: 30, zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                {['0m', '5m', '15m', '30m'].map((d, i) => (
                  <div key={d} style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.2)', padding: '2px 5px', borderRadius: 4 }}>{d}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Health Index */}
            <div className="card">
              <div className="card-header"><h3><Heart size={16} style={{ marginRight: 6 }} />Ocean Health Index</h3></div>
              <div className="card-body" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%', margin: '0 auto 1rem',
                  background: `conic-gradient(${healthColor} ${simulatedHealth * 3.6}deg, #e2e8f0 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: healthColor, lineHeight: 1 }}>{simulatedHealth}</div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--on-surface-muted)' }}>/100</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: healthColor }}>{getHealthLabel(simulatedHealth)}</div>
                {simMode && simTemp > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 8 }}>
                    {simTemp > 0 ? `(-${Math.round(simTemp * 8)} dari simulasi +${simTemp}°C)` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Layer Detail */}
            <div className="card">
              <div className="card-header"><h3><Fish size={16} style={{ marginRight: 6 }} />{selectedLayer ? `Zona: ${DEPTH_LAYERS.find(l => l.id === selectedLayer)?.label}` : 'Pilih Zona'}</h3></div>
              <div className="card-body" style={{ padding: '1rem' }}>
                {selectedLayer ? (
                  <>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-muted)', marginBottom: 4 }}>Sensor di zona ini:</div>
                      {(sensorsByDepth[selectedLayer] || []).map(s => {
                        const r = s.latest_reading;
                        return (
                          <div key={s.sensor_id} style={{ padding: '0.5rem', background: 'var(--surface-container)', borderRadius: 8, marginBottom: 4, fontSize: '0.75rem' }}>
                            <div style={{ fontWeight: 700 }}>{s.sensor_id}</div>
                            <div style={{ color: 'var(--on-surface-variant)' }}>{s.nama_lokasi}</div>
                            {r && <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.6875rem' }}>
                              <span>pH: {r.ph}</span>
                              <span>Suhu: {r.suhu_celsius}°C</span>
                              <span>DO: {r.do_mg_l}</span>
                            </div>}
                          </div>
                        );
                      })}
                      {(sensorsByDepth[selectedLayer] || []).length === 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)', padding: '1rem', textAlign: 'center' }}>Tidak ada sensor di zona ini</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-surface-muted)', marginBottom: 4 }}>Biota ditemukan:</div>
                      {(BIOTA_BY_DEPTH[selectedLayer] || []).map((name, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: '0.75rem' }}>
                          <span>🐟</span> {name}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-muted)', textAlign: 'center', padding: '2rem 1rem' }}>
                    Klik salah satu zona kedalaman pada visualisasi untuk melihat detail sensor dan biota
                  </div>
                )}
              </div>
            </div>

            {/* Active Alerts */}
            <div className="card">
              <div className="card-header"><h3><AlertTriangle size={16} style={{ marginRight: 6 }} />Peringatan ({alerts.length})</h3></div>
              <div className="card-body" style={{ padding: '0.5rem', maxHeight: 180, overflowY: 'auto' }}>
                {alerts.slice(0, 5).map(a => (
                  <div key={a.id} className="alert-item" style={{ padding: '0.5rem' }}>
                    <div className={`alert-dot ${a.level}`} />
                    <div style={{ fontSize: '0.6875rem' }}>
                      <strong>{a.sensor_id}</strong>
                      <div style={{ color: 'var(--on-surface-variant)' }}>{a.parameter}: {a.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px); }
          to { transform: translateY(-8px); }
        }
      `}</style>
    </>
  );
}
