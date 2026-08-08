import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Cpu, Fish, Plus, Trash2, Edit3, Wifi, WifiOff,
  RefreshCw, Users, Shield, MapPin, Anchor, HelpCircle, Bell
} from 'lucide-react';
import api from '../api';

export default function OperatorPage() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const userWilayah = localStorage.getItem('ocean_wilayah') || '';
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
    api.get('/sensors')
      .then(res => {
        let list = res.data;
        if (userRole === 'operator' && userWilayah) {
          list = list.filter(s => s.wilayah === userWilayah);
        }
        setSensors(list);
      })
      .catch(() => {})
      .finally(() => setLoadingSensors(false));
  };

  const fetchSpecies = () => {
    setLoadingSpecies(true);
    api.get('/biota')
      .then(res => setSpecies(res.data))
      .catch(() => {})
      .finally(() => setLoadingSpecies(false));
  };

  const fetchOperators = () => {
    if (userRole !== 'admin') return;
    setLoadingOperators(true);
    api.get('/operators')
      .then(res => setOperators(res.data))
      .catch(() => {})
      .finally(() => setLoadingOperators(false));
  };

  useEffect(() => {
    fetchSensors();
    fetchSpecies();
    fetchOperators();
  }, []);

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

  return (
    <div style={{ padding: '2.5rem', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ 
            width: 48, height: 48, 
            background: 'linear-gradient(135deg, #0f172a, #1e293b)', 
            borderRadius: 14, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(15,23,42,0.15)'
          }}>
            <Settings size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Panel Manajemen</h1>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
              {userRole === 'admin' ? 'Kelola stasiun sensor, katalog biota laut, dan akun operator wilayah nasional.' : `Kelola stasiun sensor wilayah ${userWilayah} & katalog biota.`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div style={{ 
        display: 'flex', 
        gap: '0.375rem', 
        marginBottom: '2rem', 
        background: '#e2e8f0', 
        padding: '0.375rem', 
        borderRadius: '0.75rem', 
        width: 'fit-content',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
      }}>
        {[
          ...(userRole === 'admin' ? [{ id: 'operator', label: 'Operator Wilayah', icon: Users, accentColor: '#023e8a' }] : []),
          { id: 'sensor', label: 'Stasiun Sensor IoT', icon: Cpu, accentColor: '#023e8a' },
          { id: 'biota', label: 'Katalog Biota', icon: Fish, accentColor: '#023e8a' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              style={{ 
                padding: '0.625rem 1.5rem', 
                borderRadius: '0.5rem', 
                border: 'none', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                fontWeight: 700, 
                fontSize: '0.875rem', 
                background: isActive ? '#fff' : 'transparent', 
                color: isActive ? tab.accentColor : '#475569', 
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* === SENSOR TAB === */}
      {activeTab === 'sensor' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Daftar Stasiun Sensor <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>(Total: {sensors.length})</span>
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={fetchSensors} 
                style={{ padding: '0.625rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }} 
                title="Refresh"
              >
                <RefreshCw size={16} color="#475569" />
              </button>
              
              <button
                id="btn-tambah-sensor"
                onClick={() => navigate('/operator/sensors/add')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '0.625rem 1.25rem', 
                  background: 'linear-gradient(135deg, #0ea5e9, #023e8a)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  fontWeight: 700, 
                  fontSize: '0.875rem', 
                  cursor: 'pointer', 
                  boxShadow: '0 2px 8px rgba(2,62,138,0.25)' 
                }}
              >
                <Plus size={16} /> Tambah Sensor
              </button>
            </div>
          </div>

          {loadingSensors ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px auto' }} />
              <span>Memuat data sensor...</span>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['ID Sensor', 'Nama Lokasi / Wilayah', 'Zona', 'Koordinat', 'Kedalaman', 'Daya Baterai', 'Status', 'Aksi'].map(h => (
                        <th key={h} style={{ padding: '1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.map((s, i) => (
                      <tr 
                        key={s.sensor_id} 
                        style={{ borderBottom: i < sensors.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s' }} 
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} 
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: '#023e8a', fontWeight: 700 }}>
                          {s.sensor_id}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{s.nama_lokasi}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{s.wilayah}, {s.provinsi}</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.8125rem', color: '#64748b', textTransform: 'capitalize' }}>
                          {s.zona ? s.zona.replace('_', ' ') : "-"}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.8125rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                          {s.kedalaman_m}m
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 56, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${s.status_baterai}%`, height: '100%', background: s.status_baterai > 50 ? '#10b981' : s.status_baterai > 20 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{s.status_baterai}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            padding: '0.25rem 0.625rem', 
                            borderRadius: 999, 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            textTransform: 'uppercase',
                            background: s.status_koneksi === 'online' ? '#dcfce7' : s.status_koneksi === 'maintenance' ? '#fef3c7' : '#fee2e2', 
                            color: s.status_koneksi === 'online' ? '#166534' : s.status_koneksi === 'maintenance' ? '#92400e' : '#991b1b' 
                          }}>
                            {s.status_koneksi === 'online' ? <Wifi size={11} /> : <WifiOff size={11} />}
                            {s.status_koneksi}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              onClick={() => navigate(`/operator/sensors/edit/${s.sensor_id}`)} 
                              style={{ padding: '0.4rem 0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem', color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 700 }}
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteSensor(s)} 
                              style={{ padding: '0.4rem 0.75rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.375rem', color: '#be123c', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 700 }}
                            >
                              <Trash2 size={12} /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sensors.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                          Belum ada sensor terdaftar untuk wilayah Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === BIOTA TAB === */}
      {activeTab === 'biota' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Katalog Spesies Biota Laut <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>(Total: {species.length})</span>
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={fetchSpecies} 
                style={{ padding: '0.625rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }} 
                title="Refresh"
              >
                <RefreshCw size={16} color="#475569" />
              </button>
              
              <button 
                onClick={() => navigate('/operator/biota/add')} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '0.625rem 1.25rem', 
                  background: 'linear-gradient(135deg, #0ea5e9, #023e8a)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  fontWeight: 700, 
                  fontSize: '0.875rem', 
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2,62,138,0.25)' 
                }}
              >
                <Plus size={16} /> Tambah Spesies
              </button>
            </div>
          </div>

          {loadingSpecies ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px auto' }} />
              <span>Memuat data biota...</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.25rem' }}>
              {species.map(s => {
                const statusColor = {
                  'Critically Endangered': { bg: '#fdf2f8', text: '#86198f', border: '#f5d0fe' },
                  'Endangered': { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
                  'Vulnerable': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
                  'Near Threatened': { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
                  'Least Concern': { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
                  'Data Deficient': { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }
                }[s.status_konservasi] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };

                return (
                  <div 
                    key={s.biota_id} 
                    style={{ 
                      background: '#fff', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '1rem', 
                      padding: '1.25rem', 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.01)', 
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '240px'
                    }} 
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.04)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }} 
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.01)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      {/* Biota Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: 6 }}>
                        <div style={{ overflow: 'hidden' }}>
                          <h3 style={{ fontWeight: 800, color: '#0f172a', margin: 0, fontSize: '0.975rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nama_umum}</h3>
                          <p style={{ color: '#64748b', margin: '0.15rem 0 0 0', fontSize: '0.78rem', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nama_ilmiah}</p>
                        </div>
                        <span style={{ 
                          padding: '0.2rem 0.625rem', 
                          background: statusColor.bg, 
                          border: `1px solid ${statusColor.border}`, 
                          borderRadius: 999, 
                          fontSize: '0.66rem', 
                          fontWeight: 700, 
                          color: statusColor.text, 
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {s.status_konservasi}
                        </span>
                      </div>

                      {/* Description */}
                      <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {s.deskripsi || "Tidak ada deskripsi."}
                      </p>
                    </div>

                    {/* Metadata & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                        <MapPin size={12} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>Kedalaman: {s.zona_kedalaman || "-"}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button 
                          onClick={() => navigate(`/operator/biota/edit/${s.biota_id}`)} 
                          style={{ padding: '0.3rem 0.625rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteSpecies(s)} 
                          style={{ padding: '0.3rem 0.625rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.375rem', color: '#be123c', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {species.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#94a3b8', background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                  Belum ada biota terdaftar di database.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === OPERATOR TAB (ADMIN ONLY) === */}
      {activeTab === 'operator' && userRole === 'admin' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Manajemen Operator Wilayah <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>(Total: {operators.length})</span>
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={fetchOperators} 
                style={{ padding: '0.625rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
              >
                <RefreshCw size={16} color="#475569" />
              </button>
              
              <button 
                onClick={() => navigate('/operator/accounts/add')} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '0.625rem 1.25rem', 
                  background: 'linear-gradient(135deg, #0ea5e9, #023e8a)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  fontWeight: 700, 
                  fontSize: '0.875rem', 
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2,62,138,0.25)'
                }}
              >
                <Plus size={16} /> Tambah Operator
              </button>
            </div>
          </div>

          {loadingOperators ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px auto' }} />
              <span>Memuat data operator...</span>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Nama Operator', 'Email Akun', 'Wilayah / Provinsi Tugas', 'Hak Akses', 'Aksi Akun'].map(h => (
                        <th key={h} style={{ padding: '1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {operators.map((op, i) => (
                      <tr 
                        key={op.id} 
                        style={{ borderBottom: i < operators.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} 
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                          {op.nama}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {op.email}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                          {op.wilayah ? `${op.wilayah}, ${op.provinsi || ''}` : "Nasional (Semua Wilayah)"}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            padding: '0.25rem 0.625rem', 
                            borderRadius: 999, 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            textTransform: 'uppercase',
                            background: '#faf5ff', 
                            color: '#7c3aed', 
                            border: '1px solid #e9d5ff' 
                          }}>
                            <Shield size={11} /> {op.role}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button 
                            onClick={() => handleDeleteOp(op)} 
                            style={{ 
                              padding: '0.4rem 0.75rem', 
                              background: '#fff1f2', 
                              border: '1px solid #fecdd3', 
                              borderRadius: '0.375rem', 
                              color: '#be123c', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 4, 
                              fontSize: '0.78rem', 
                              fontWeight: 700 
                            }}
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                    {operators.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                          Belum ada operator wilayah terdaftar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
