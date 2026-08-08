import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Cpu, Save, Wifi, WifiOff, MapPin,
  Layers, Battery, Ruler, AlertCircle, CheckCircle2, Navigation
} from 'lucide-react';
import api from '../api';

const ZONA_OPTIONS = [
  { value: 'inti', label: 'Zona Inti' },
  { value: 'pemanfaatan_terbatas', label: 'Terbatas' },
  { value: 'rehabilitasi', label: 'Rehabilitasi' },
  { value: 'pemanfaatan_umum', label: 'Umum' },
];

export default function SensorFormPage() {
  const navigate = useNavigate();
  const { sensorId } = useParams();
  const isEdit = Boolean(sensorId);

  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const [form, setForm] = useState({
    nama_lokasi: '',
    zona: 'pemanfaatan_umum',
    lat: '',
    lng: '',
    kedalaman_m: 0,
    status_koneksi: 'online',
    status_baterai: 100,
    provinsi: userRole === 'operator' ? (localStorage.getItem('ocean_provinsi') || '') : '',
    wilayah: userRole === 'operator' ? (localStorage.getItem('ocean_wilayah') || '') : '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isEdit) {
      api.get(`/sensors/${sensorId}`)
        .then(res => {
          const s = res.data;
          setForm({
            nama_lokasi: s.nama_lokasi,
            zona: s.zona,
            lat: s.lat,
            lng: s.lng,
            kedalaman_m: s.kedalaman_m,
            status_koneksi: s.status_koneksi,
            status_baterai: s.status_baterai,
            provinsi: s.provinsi || '',
            wilayah: s.wilayah || '',
          });
        })
        .catch(() => {
          showToast('error', 'Sensor tidak ditemukan');
          navigate('/operator');
        })
        .finally(() => setLoading(false));
    }
  }, [sensorId, navigate, isEdit]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.nama_lokasi.trim()) e.nama_lokasi = 'Nama wajib diisi';
    if (form.lat === '' || isNaN(Number(form.lat))) e.lat = 'Latitude tidak valid';
    if (form.lng === '' || isNaN(Number(form.lng))) e.lng = 'Longitude tidak valid';
    if (form.kedalaman_m < 0) e.kedalaman_m = 'Minimal 0';
    if (form.status_baterai < 0 || form.status_baterai > 100) e.status_baterai = 'Baterai 0-100';
    if (!form.provinsi.trim()) e.provinsi = 'Provinsi wajib diisi';
    if (!form.wilayah.trim()) e.wilayah = 'Wilayah wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        kedalaman_m: parseFloat(form.kedalaman_m),
        status_baterai: parseInt(form.status_baterai),
      };
      if (userRole === 'operator') {
        payload.provinsi = localStorage.getItem('ocean_provinsi') || '';
        payload.wilayah = localStorage.getItem('ocean_wilayah') || '';
      }
      if (isEdit) {
        await api.put(`/sensors/${sensorId}/update`, payload);
        showToast('success', 'Berhasil diperbarui!');
      } else {
        await api.post('/sensors', payload);
        showToast('success', 'Sensor berhasil ditambahkan!');
      }
      setTimeout(() => navigate('/operator'), 1000);
    } catch (e) {
      showToast('error', e.response?.data?.detail || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  };

  const inputCls = (field) => ({
    width: '100%', padding: '0.875rem 1rem',
    background: errors[field] ? '#fff5f5' : '#f8fafc',
    border: `1px solid ${errors[field] ? '#fca5a5' : '#cbd5e1'}`,
    borderRadius: '0.5rem', color: '#0f172a', fontSize: '1rem',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
  });

  const label = (icon, text, required = false) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
      {icon} {text} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  );

  const errMsg = (field) => errors[field] && (
    <p style={{ color: '#ef4444', fontSize: '0.7rem', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
      <AlertCircle size={12} /> {errors[field]}
    </p>
  );

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#94a3b8' }}>Memuat data...</div>;

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#f8fafc', paddingBottom: '3rem' }}>
      
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '0.75rem 1.25rem',
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
          borderRadius: '0.75rem', color: toast.type === 'success' ? '#166534' : '#b91c1c',
          fontWeight: 600, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', animation: 'slideIn 0.3s ease',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Top Bar minimal */}
      <div style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: 16, maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/operator')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#475569', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#023e8a'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
        >
          <ArrowLeft size={18} /> Kembali
        </button>
        <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{isEdit ? `Edit Sensor: ${sensorId}` : 'Tambah Sensor Baru'}</h1>
      </div>

      {/* Main Content */}
      <div style={{ padding: '0 2rem', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Title area matching the image */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              {isEdit ? 'Edit Data Stasiun Sensor' : 'Pendaftaran Sensor Baru'}
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
              Input data spesifikasi stasiun telemetri IoT dan koordinat stasiun di kawasan konservasi.
            </p>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={22} color="#0284c7" />
          </div>
        </div>

        {/* 2-column separated cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '2.5rem' }}>
          
          {/* Card Left: Identitas & Lokasi */}
          <div style={{ 
            background: '#fff', 
            borderRadius: '1.25rem', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 10px 30px rgba(15,23,42,0.03)',
            padding: '2.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Faded Background Number "01" */}
            <div style={{ position: 'absolute', right: '1.5rem', top: '0.75rem', fontSize: '6rem', fontWeight: 900, color: '#f8fafc', userSelect: 'none', zIndex: 0, lineHeight: 1 }}>01</div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Identitas & Lokasi Stasiun</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  {label(<MapPin size={16} color="#0284c7" />, 'Nama Lokasi Stasiun', true)}
                  <input style={inputCls('nama_lokasi')} value={form.nama_lokasi} onChange={e => set('nama_lokasi', e.target.value)} placeholder="Contoh: Cagar Alam Laut Pangandaran" />
                  {errMsg('nama_lokasi')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    {label(<MapPin size={16} color="#0284c7" />, 'Provinsi', true)}
                    {userRole === 'admin' ? (
                      <select style={inputCls('provinsi')} value={form.provinsi} onChange={e => set('provinsi', e.target.value)}>
                        <option value="">Pilih Provinsi...</option>
                        <option value="Jawa Barat">Jawa Barat</option>
                        <option value="Jawa Tengah">Jawa Tengah</option>
                        <option value="Jawa Timur">Jawa Timur</option>
                        <option value="Bali">Bali</option>
                        <option value="Nusa Tenggara Timur">Nusa Tenggara Timur</option>
                        <option value="Maluku">Maluku</option>
                        <option value="Papua Barat Daya">Papua Barat Daya</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    ) : (
                      <input style={{ ...inputCls('provinsi'), background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} value={form.provinsi} readOnly />
                    )}
                    {errMsg('provinsi')}
                  </div>
                  <div>
                    {label(<MapPin size={16} color="#0284c7" />, 'Wilayah / Kota', true)}
                    {userRole === 'admin' ? (
                      <input style={inputCls('wilayah')} value={form.wilayah} onChange={e => set('wilayah', e.target.value)} placeholder="Contoh: Pangandaran, Raja Ampat..." />
                    ) : (
                      <input style={{ ...inputCls('wilayah'), background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} value={form.wilayah} readOnly />
                    )}
                    {errMsg('wilayah')}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    {label(<MapPin size={16} color="#0284c7" />, 'Latitude', true)}
                    <input style={inputCls('lat')} value={form.lat} onChange={e => set('lat', e.target.value.replace(/[^0-9.-]/g, ''))} placeholder="-7.7100" />
                    {errMsg('lat')}
                  </div>
                  <div>
                    {label(<MapPin size={16} color="#0284c7" />, 'Longitude', true)}
                    <input style={inputCls('lng')} value={form.lng} onChange={e => set('lng', e.target.value.replace(/[^0-9.-]/g, ''))} placeholder="108.6500" />
                    {errMsg('lng')}
                  </div>
                </div>

                <div>
                  {label(<Layers size={16} color="#0284c7" />, 'Zona Konservasi')}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                    {ZONA_OPTIONS.map(z => (
                      <button
                        key={z.value} type="button" onClick={() => set('zona', z.value)}
                        style={{
                          padding: '0.65rem 0.5rem', background: form.zona === z.value ? '#eff6ff' : '#fff',
                          border: `1px solid ${form.zona === z.value ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '0.5rem',
                          cursor: 'pointer', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem',
                          color: form.zona === z.value ? '#1d4ed8' : '#475569', transition: 'all 0.2s'
                        }}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Right: Spesifikasi Teknis */}
          <div style={{ 
            background: '#fff', 
            borderRadius: '1.25rem', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 10px 30px rgba(15,23,42,0.03)',
            padding: '2.5rem',
            position: 'relative',
            overflow: 'hidden',
            height: '100%'
          }}>
            {/* Faded Background Number "02" */}
            <div style={{ position: 'absolute', right: '1.5rem', top: '0.75rem', fontSize: '6rem', fontWeight: 900, color: '#f8fafc', userSelect: 'none', zIndex: 0, lineHeight: 1 }}>02</div>

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cpu size={18} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Spesifikasi Teknis</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                <div>
                  {label(<Ruler size={16} color="#d97706" />, 'Kedalaman Laut', true)}
                  <div style={{ position: 'relative' }}>
                    <input style={{ ...inputCls('kedalaman_m'), paddingRight: '3rem' }} type="number" min="0" step="0.5" value={form.kedalaman_m} onChange={e => set('kedalaman_m', Number(e.target.value))} placeholder="Misal: 15" />
                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8125rem', color: '#64748b', fontWeight: 700 }}>meter</span>
                  </div>
                  {errMsg('kedalaman_m')}
                </div>

                <div>
                  {label(<Wifi size={16} color="#d97706" />, 'Status Konektivitas')}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['online', 'offline'].map(status => (
                      <button
                        key={status} type="button" onClick={() => set('status_koneksi', status)}
                        style={{
                          flex: 1, padding: '0.65rem', borderRadius: '0.5rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase',
                          background: form.status_koneksi === status ? (status === 'online' ? '#f0fdf4' : '#fef2f2') : '#fff',
                          border: `1px solid ${form.status_koneksi === status ? (status === 'online' ? '#22c55e' : '#ef4444') : '#cbd5e1'}`,
                          color: form.status_koneksi === status ? (status === 'online' ? '#15803d' : '#b91c1c') : '#475569',
                          transition: 'all 0.2s'
                        }}
                      >
                        {status === 'online' ? <Wifi size={14} /> : <WifiOff size={14} />} {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  {label(<Battery size={16} color="#d97706" />, 'Daya Baterai Perangkat')}
                  <div style={{ position: 'relative' }}>
                    <input style={{ ...inputCls('status_baterai'), paddingRight: '3rem' }} type="number" min="0" max="100" value={form.status_baterai} onChange={e => set('status_baterai', Number(e.target.value))} />
                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8125rem', color: '#64748b', fontWeight: 700 }}>%</span>
                  </div>
                  {errMsg('status_baterai')}
                </div>
              </div>

              {/* Form Actions inside Card 2 Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '2.5rem' }}>
                <button type="button" onClick={() => navigate('/operator')} style={{ padding: '0.65rem 1.25rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#475569', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  Batal
                </button>
                <button
                  onClick={handleSave} disabled={saving}
                  className="btn-gradient"
                  style={{
                    padding: '0.65rem 1.75rem', border: 'none', borderRadius: '0.5rem',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(2,62,138,0.15)'
                  }}
                >
                  {saving ? 'Menyimpan...' : <><Save size={14} /> {isEdit ? 'Simpan' : 'Daftarkan'}</>}
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        /* Hide scrollbar for clean UI */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
