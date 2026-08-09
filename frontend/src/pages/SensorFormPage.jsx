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
  const [wilayahList, setWilayahList] = useState([]);

  // Fetch wilayah list for dropdown
  useEffect(() => {
    api.get('/wilayah')
      .then(res => setWilayahList(res.data))
      .catch(() => {});
  }, []);

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
    width: '100%', padding: '0.75rem 0.875rem',
    background: errors[field] ? '#fff5f5' : '#f8fafc',
    border: `1px solid ${errors[field] ? '#fca5a5' : '#cbd5e1'}`,
    borderRadius: '0.5rem', color: '#0f172a', fontSize: '1rem',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
  });

  const label = (icon, text, required = false) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
      {icon} {text} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  );

  const errMsg = (field) => errors[field] && (
    <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
      <AlertCircle size={12} /> {errors[field]}
    </p>
  );

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#94a3b8' }}>Memuat data...</div>;

  return (
    <div style={{ height: '100vh', width: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '0.75rem 1.25rem',
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
          borderRadius: '0.75rem', color: toast.type === 'success' ? '#166534' : '#b91c1c',
          fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', animation: 'slideIn 0.3s ease',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Top Bar */}
      <div style={{ padding: '0.75rem 2.5rem 0.5rem', display: 'flex', alignItems: 'center', gap: 16, width: '100%', boxSizing: 'border-box' }}>
        <button
          onClick={() => navigate('/operator')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#475569', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#023e8a'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
        >
          <ArrowLeft size={18} /> Kembali
        </button>
        <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{isEdit ? `Edit Sensor: ${sensorId}` : 'Pendaftaran Sensor Baru'}</h1>
      </div>

      {/* Main Content */}
      <div style={{ padding: '0.5rem 2.5rem 1.5rem 2.5rem', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Title area */}
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              {isEdit ? 'Edit Data Stasiun Sensor' : 'Pendaftaran Sensor Baru'}
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
              Input data spesifikasi stasiun telemetri IoT dan koordinat stasiun di kawasan konservasi.
            </p>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={20} color="#0284c7" />
          </div>
        </div>

        {/* Single Card Layout with divider */}
        <div style={{ 
          background: '#fff', 
          borderRadius: '1.25rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 10px 30px rgba(15,23,42,0.03)',
          padding: '1.75rem 2.25rem',
          position: 'relative',
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          {/* Faded Background Numbers */}
          <div style={{ position: 'absolute', left: '2.5rem', top: '1.5rem', fontSize: '6rem', fontWeight: 900, color: '#f8fafc', userSelect: 'none', zIndex: 0, lineHeight: 1 }}>01</div>
          <div style={{ position: 'absolute', right: '2.5rem', top: '1.5rem', fontSize: '6rem', fontWeight: 900, color: '#f8fafc', userSelect: 'none', zIndex: 0, lineHeight: 1 }}>02</div>

          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', flex: 1, overflow: 'hidden' }}>
            
            {/* Column Left: Identitas & Lokasi */}
            <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: '3.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={16} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Identitas & Lokasi Stasiun</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  {label(<MapPin size={14} color="#0284c7" />, 'Nama Lokasi Stasiun', true)}
                  <input style={inputCls('nama_lokasi')} value={form.nama_lokasi} onChange={e => set('nama_lokasi', e.target.value)} placeholder="Contoh: Cagar Alam Laut Pangandaran" />
                  {errMsg('nama_lokasi')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    {label(<MapPin size={14} color="#0284c7" />, 'Provinsi', true)}
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
                    {label(<MapPin size={14} color="#0284c7" />, 'Wilayah', true)}
                    {userRole === 'admin' ? (
                      <select
                        style={inputCls('wilayah')}
                        value={form.wilayah}
                        onChange={e => {
                          const selected = wilayahList.find(w => w.wilayah === e.target.value);
                          set('wilayah', e.target.value);
                          if (selected) set('provinsi', selected.provinsi);
                        }}
                      >
                        <option value="">Pilih Wilayah...</option>
                        {wilayahList.map(w => (
                          <option key={w.wilayah} value={w.wilayah}>{w.wilayah} — {w.provinsi}</option>
                        ))}
                      </select>
                    ) : (
                      <input style={{ ...inputCls('wilayah'), background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} value={form.wilayah} readOnly />
                    )}
                    {errMsg('wilayah')}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    {label(<MapPin size={14} color="#0284c7" />, 'Latitude', true)}
                    <input style={inputCls('lat')} value={form.lat} onChange={e => set('lat', e.target.value.replace(/[^0-9.-]/g, ''))} placeholder="-7.7100" />
                    {errMsg('lat')}
                  </div>
                  <div>
                    {label(<MapPin size={14} color="#0284c7" />, 'Longitude', true)}
                    <input style={inputCls('lng')} value={form.lng} onChange={e => set('lng', e.target.value.replace(/[^0-9.-]/g, ''))} placeholder="108.6500" />
                    {errMsg('lng')}
                  </div>
                </div>

                <div>
                  {label(<Layers size={14} color="#0284c7" />, 'Zona Konservasi')}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                    {ZONA_OPTIONS.map(z => (
                      <button
                        key={z.value} type="button" onClick={() => set('zona', z.value)}
                        style={{
                          padding: '0.55rem 0.5rem', background: form.zona === z.value ? '#eff6ff' : '#fff',
                          border: `1px solid ${form.zona === z.value ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '0.5rem',
                          cursor: 'pointer', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem',
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

            {/* Column Right: Spesifikasi Teknis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cpu size={16} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Spesifikasi Teknis</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  {label(<Ruler size={14} color="#d97706" />, 'Kedalaman Laut', true)}
                  <div style={{ position: 'relative' }}>
                    <input style={{ ...inputCls('kedalaman_m'), paddingRight: '3rem' }} type="number" min="0" step="0.5" value={form.kedalaman_m} onChange={e => set('kedalaman_m', Number(e.target.value))} placeholder="Misal: 15" />
                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#64748b', fontWeight: 700 }}>meter</span>
                  </div>
                  {errMsg('kedalaman_m')}
                </div>

                <div>
                  {label(<Wifi size={14} color="#d97706" />, 'Status Konektivitas')}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['online', 'offline'].map(status => (
                      <button
                        key={status} type="button" onClick={() => set('status_koneksi', status)}
                        style={{
                          flex: 1, padding: '0.55rem', borderRadius: '0.5rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase',
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
                  {label(<Battery size={14} color="#d97706" />, 'Daya Baterai Perangkat')}
                  <div style={{ position: 'relative' }}>
                    <input style={{ ...inputCls('status_baterai'), paddingRight: '3rem' }} type="number" min="0" max="100" value={form.status_baterai} onChange={e => set('status_baterai', Number(e.target.value))} />
                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#64748b', fontWeight: 700 }}>%</span>
                  </div>
                  {errMsg('status_baterai')}
                </div>
              </div>
            </div>

          </div>

          {/* Unified Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => navigate('/operator')} style={{ padding: '0.6rem 1.25rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#475569', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              Batal
            </button>
            <button
              onClick={handleSave} disabled={saving}
              className="btn-gradient"
              style={{
                padding: '0.6rem 1.75rem', background: 'linear-gradient(135deg, #0ea5e9, #023e8a)', border: 'none', borderRadius: '0.5rem',
                color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(2,62,138,0.15)'
              }}
            >
              {saving ? 'Menyimpan...' : <><Save size={14} /> {isEdit ? 'Simpan' : 'Daftarkan'}</>}
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
