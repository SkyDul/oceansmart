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

  const [form, setForm] = useState({
    nama_lokasi: '',
    zona: 'pemanfaatan_umum',
    lat: '',
    lng: '',
    kedalaman_m: 0,
    status_koneksi: 'online',
    status_baterai: 100,
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
          });
        })
        .catch(() => {
          showToast('error', 'Sensor tidak ditemukan');
          navigate('/operator');
        })
        .finally(() => setLoading(false));
    }
  }, [sensorId, navigate]);

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
        provinsi: localStorage.getItem('ocean_provinsi') || '',
        wilayah: localStorage.getItem('ocean_wilayah') || ''
      };
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
    <div style={{ height: '100vh', width: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
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
      <div style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
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
      <div style={{ flex: 1, display: 'flex', padding: '0 2rem 2rem', overflow: 'hidden' }}>
        
        {/* Split Card */}
        <div style={{ 
          display: 'flex', 
          width: '100%', 
          maxWidth: 1400,
          margin: '0 auto',
          height: '100%',
          background: '#fff', 
          borderRadius: '1rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.04)' 
        }}>
          
          {/* LEFT SIDE: Identitas */}
          <div style={{ flex: 1, padding: '2.5rem', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '0.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#023e8a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
                1
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Identitas & Lokasi</h2>
            </div>

            <div>
              {label(<MapPin size={16} color="#10b981" />, 'Nama Lokasi', true)}
              <input style={inputCls('nama_lokasi')} value={form.nama_lokasi} onChange={e => set('nama_lokasi', e.target.value)} placeholder="Contoh: Terumbu Karang Barat" />
              {errMsg('nama_lokasi')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                {label(<MapPin size={16} color="#10b981" />, 'Latitude', true)}
                <input style={inputCls('lat')} value={form.lat} onChange={e => set('lat', e.target.value.replace(/[^0-9.-]/g, ''))} placeholder="-7.765" />
                {errMsg('lat')}
              </div>
              <div>
                {label(<MapPin size={16} color="#10b981" />, 'Longitude', true)}
                <input style={inputCls('lng')} value={form.lng} onChange={e => set('lng', e.target.value.replace(/[^0-9.-]/g, ''))} placeholder="108.654" />
                {errMsg('lng')}
              </div>
            </div>

            <div>
              {label(<Layers size={16} color="#10b981" />, 'Zona Konservasi')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {ZONA_OPTIONS.map(z => (
                  <button
                    key={z.value} type="button" onClick={() => set('zona', z.value)}
                    style={{
                      padding: '0.8rem', background: form.zona === z.value ? '#eff6ff' : '#fff',
                      border: `1px solid ${form.zona === z.value ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '0.5rem',
                      cursor: 'pointer', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem',
                      color: form.zona === z.value ? '#1d4ed8' : '#475569', transition: 'all 0.2s'
                    }}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Teknis */}
          <div style={{ flex: 1, padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '2rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
                2
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Spesifikasi Teknis</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, overflow: 'hidden' }}>
              
              <div>
                {label(<Navigation size={16} color="#f59e0b" />, 'Kedalaman Laut (m)', true)}
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inputCls('kedalaman_m'), paddingRight: '2.5rem' }} type="number" min="0" step="0.5" value={form.kedalaman_m} onChange={e => set('kedalaman_m', Number(e.target.value))} placeholder="Misal: 15.5" />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>m</span>
                </div>
                {errMsg('kedalaman_m')}
              </div>

              <div>
                {label(<Wifi size={16} color="#f59e0b" />, 'Status Konektivitas')}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {['online', 'offline'].map(status => (
                    <button
                      key={status} type="button" onClick={() => set('status_koneksi', status)}
                      style={{
                        flex: 1, padding: '0.875rem', borderRadius: '0.5rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        fontWeight: 700, fontSize: '0.9375rem', textTransform: 'uppercase',
                        background: form.status_koneksi === status ? (status === 'online' ? '#f0fdf4' : '#fef2f2') : '#fff',
                        border: `1px solid ${form.status_koneksi === status ? (status === 'online' ? '#22c55e' : '#ef4444') : '#cbd5e1'}`,
                        color: form.status_koneksi === status ? (status === 'online' ? '#15803d' : '#b91c1c') : '#475569',
                        transition: 'all 0.2s'
                      }}
                    >
                      {status === 'online' ? <Wifi size={16} /> : <WifiOff size={16} />} {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                {label(<Battery size={16} color="#f59e0b" />, 'Level Baterai (%)')}
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inputCls('status_baterai'), paddingRight: '2.5rem' }} type="number" min="0" max="100" value={form.status_baterai} onChange={e => set('status_baterai', Number(e.target.value))} />
                  <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>%</span>
                </div>
                {errMsg('status_baterai')}
              </div>
            </div>

            {/* Footer / Actions */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => navigate('/operator')} style={{ padding: '0.625rem 1.25rem', background: 'transparent', border: 'none', color: '#0f172a', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>
                Batal
              </button>
              <button
                onClick={handleSave} disabled={saving}
                style={{
                  padding: '0.625rem 1.5rem', background: '#023e8a', border: 'none', borderRadius: '0.5rem',
                  color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(2,62,138,0.2)'
                }}
              >
                {saving ? 'Menyimpan...' : <><Save size={16} /> {isEdit ? 'Simpan Perubahan' : 'Daftarkan Sensor'}</>}
              </button>
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
