import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Cpu, Fish, Plus, Trash2, Edit3, Save, X, Wifi, WifiOff, RefreshCw, ExternalLink, Users, Shield } from 'lucide-react';
import api from '../api';

export default function OperatorPage() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const [activeTab, setActiveTab] = useState(userRole === 'admin' ? 'operator' : 'sensor');
  const [sensors, setSensors] = useState([]);
  const [species, setSpecies] = useState([]);
  const [loadingSensors, setLoadingSensors] = useState(true);
  const [loadingSpecies, setLoadingSpecies] = useState(true);

  // States for Operator Management (Admin only)
  const [operators, setOperators] = useState([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  // ── Fetch dari backend ──
  const fetchSensors = () => {
    setLoadingSensors(true);
    api.get('/sensors').then(res => setSensors(res.data)).catch(() => {}).finally(() => setLoadingSensors(false));
  };

  const fetchSpecies = () => {
    setLoadingSpecies(true);
    api.get('/biota').then(res => setSpecies(res.data)).catch(() => {}).finally(() => setLoadingSpecies(false));
  };

  const fetchOperators = () => {
    if (userRole !== 'admin') return;
    setLoadingOperators(true);
    api.get('/operators').then(res => setOperators(res.data)).catch(() => {}).finally(() => setLoadingOperators(false));
  };

  useEffect(() => { fetchSensors(); fetchSpecies(); fetchOperators(); }, []);

  // ── SENSOR HANDLERS ──
  const handleDeleteSensor = async (s) => {
    if (!window.confirm(`Hapus sensor "${s.nama_lokasi}"? Semua data readingnya akan ikut terhapus.`)) return;
    try {
      await api.delete(`/sensors/${s.sensor_id}/delete`);
      fetchSensors();
    } catch (e) {
      alert('Gagal menghapus: ' + (e.response?.data?.detail || e.message));
    }
  };

  // ── BIOTA HANDLERS ──

  const handleDeleteSpecies = async (s) => {
    if (!window.confirm(`Hapus spesies "${s.nama_umum}"?`)) return;
    try {
      await api.delete(`/biota/${s.biota_id}/delete`);
      fetchSpecies();
    } catch (e) {
      alert('Gagal menghapus: ' + (e.response?.data?.detail || e.message));
    }
  };

  // ── OPERATOR HANDLERS (Admin Only) ──

  const handleDeleteOp = async (op) => {
    if (!window.confirm(`Hapus operator "${op.nama}"?`)) return;
    try {
      await api.delete(`/operators/${op.id}`);
      fetchOperators();
    } catch (e) {
      alert('Gagal menghapus: ' + (e.response?.data?.detail || e.message));
    }
  };

  const inputStyle = { width: '100%', padding: '0.625rem 0.875rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: 0.5 };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #023e8a, #0077b6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Panel Manajemen</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Kelola {userRole === 'admin' && 'Akun Operator, '}Sensor IoT & Katalog Biota Laut — terhubung langsung ke database</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#e2e8f0', padding: '0.25rem', borderRadius: '0.75rem', width: 'fit-content' }}>
        {[
          ...(userRole === 'admin' ? [{ id: 'operator', label: 'Operator Wilayah', icon: Users }] : []),
          { id: 'sensor', label: 'Sensor IoT', icon: Cpu },
          { id: 'biota', label: 'Biota Laut', icon: Fish }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '0.625rem 1.5rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.875rem', background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? '#023e8a' : '#64748b', boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {/* === SENSOR TAB === */}
      {activeTab === 'sensor' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Sensor IoT ({sensors.length}) <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>— Data real dari DB</span></h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={fetchSensors} style={{ padding: '0.5rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer' }} title="Refresh">
                <RefreshCw size={16} color="#64748b" />
              </button>
              <button
                id="btn-tambah-sensor"
                onClick={() => navigate('/operator/sensors/add')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #023e8a, #0096c7)', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,62,138,0.25)' }}>
                <Plus size={16} /> Tambah Sensor
              </button>
            </div>
          </div>

          {loadingSensors ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Memuat data sensor dari database...</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['ID Sensor', 'Nama Lokasi', 'Zona', 'Koordinat', 'Kedalaman', 'Baterai', 'Status', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensors.map((s, i) => (
                    <tr key={s.sensor_id} style={{ borderBottom: i < sensors.length - 1 ? '1px solid #f1f5f9' : 'none' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#023e8a', fontWeight: 600 }}>{s.sensor_id}</td>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{s.nama_lokasi}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#64748b' }}>{s.zona}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#64748b', fontFamily: 'monospace' }}>{s.lat}, {s.lng}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>{s.kedalaman_m}m</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 48, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${s.status_baterai}%`, height: '100%', background: s.status_baterai > 50 ? '#22c55e' : s.status_baterai > 20 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.status_baterai}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: s.status_koneksi === 'online' ? '#dcfce7' : '#fee2e2', color: s.status_koneksi === 'online' ? '#166534' : '#991b1b' }}>
                          {s.status_koneksi === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                          {s.status_koneksi === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => navigate(`/operator/sensors/edit/${s.sensor_id}`)} style={{ padding: '0.375rem 0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', fontWeight: 600 }}>
                            <Edit3 size={14} /> Edit
                          </button>
                          <button onClick={() => handleDeleteSensor(s)} style={{ padding: '0.375rem 0.75rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.5rem', color: '#be123c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', fontWeight: 600 }}>
                            <Trash2 size={14} /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* === BIOTA TAB === */}
      {activeTab === 'biota' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Katalog Biota Laut ({species.length}) <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>— Data real dari DB</span></h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={fetchSpecies} style={{ padding: '0.5rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer' }} title="Refresh"><RefreshCw size={16} color="#64748b" /></button>
              <button onClick={() => navigate('/operator/biota/add')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 1.25rem', background: '#023e8a', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                <Plus size={16} /> Tambah Spesies
              </button>
            </div>
          </div>

          {loadingSpecies ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Memuat data biota dari database...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {species.map(s => {
                const statusColor = {
                  'Critically Endangered': { bg: '#fdf2f8', text: '#86198f', border: '#f5d0fe' },
                  'Endangered': { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
                  'Vulnerable': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
                  'Near Threatened': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
                  'Least Concern': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
                }[s.status_konservasi] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };

                return (
                  <div key={s.biota_id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem', fontSize: '1rem' }}>{s.nama_umum}</h3>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.8125rem', fontStyle: 'italic' }}>{s.nama_ilmiah}</p>
                      </div>
                      <span style={{ padding: '0.25rem 0.625rem', background: statusColor.bg, border: `1px solid ${statusColor.border}`, borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700, color: statusColor.text, whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                        {s.status_konservasi}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{s.deskripsi?.slice(0, 100)}{s.deskripsi?.length > 100 ? '...' : ''}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Habitat: {s.habitat || '-'}</span>
                        <br />
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontFamily: 'monospace' }}>{s.biota_id}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => navigate(`/operator/biota/edit/${s.biota_id}`)} style={{ padding: '0.25rem 0.625rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => handleDeleteSpecies(s)} style={{ padding: '0.25rem 0.625rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.375rem', color: '#be123c', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Hapus</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === OPERATOR TAB (ADMIN ONLY) === */}
      {activeTab === 'operator' && userRole === 'admin' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Daftar Operator Wilayah ({operators.length})</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={fetchOperators} style={{ padding: '0.5rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer' }}><RefreshCw size={16} color="#64748b" /></button>
              <button onClick={() => navigate('/operator/accounts/add')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 1.25rem', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                <Plus size={16} /> Tambah Operator
              </button>
            </div>
          </div>

          {loadingOperators ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Memuat data operator...</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Nama Operator', 'Email Akun', 'Role', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op, i) => (
                    <tr key={op.id} style={{ borderBottom: i < operators.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{op.nama}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#64748b', fontFamily: 'monospace' }}>{op.email}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
                          <Shield size={12} /> {op.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <button onClick={() => handleDeleteOp(op)} style={{ padding: '0.375rem 0.75rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.5rem', color: '#be123c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', fontWeight: 600 }}>
                          <Trash2 size={14} /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {operators.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada operator wilayah yang terdaftar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
