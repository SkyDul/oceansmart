import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Fish, Save, AlertCircle, CheckCircle2, FileText, Image as ImageIcon, Map, Shield
} from 'lucide-react';
import api from '../api';

const CONSERVATION_STATUS = [
  'Least Concern', 'Near Threatened', 'Vulnerable', 
  'Endangered', 'Critically Endangered', 'Data Deficient'
];

export default function BiotaFormPage() {
  const navigate = useNavigate();
  const { biotaId } = useParams();
  const isEdit = Boolean(biotaId);

  const [form, setForm] = useState({
    nama_umum: '',
    nama_ilmiah: '',
    status_konservasi: 'Data Deficient',
    habitat: '',
    zona_kedalaman: 'epipelagik',
    deskripsi: '',
    foto_url: ''
  });
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isEdit) {
      // Fetch biota data. Since we don't have a GET /biota/:id endpoint yet, we fetch all and find it.
      api.get('/biota')
        .then(res => {
          const s = res.data.find(b => b.biota_id === biotaId);
          if (s) {
            setForm({
              nama_umum: s.nama_umum,
              nama_ilmiah: s.nama_ilmiah || '',
              status_konservasi: s.status_konservasi || 'Data Deficient',
              habitat: s.habitat || '',
              zona_kedalaman: s.zona_kedalaman || 'epipelagik',
              deskripsi: s.deskripsi || '',
              foto_url: s.foto_url || ''
            });
          } else {
            showToast('error', 'Spesies tidak ditemukan');
            navigate('/operator');
          }
        })
        .catch(() => {
          showToast('error', 'Gagal memuat data spesies');
          navigate('/operator');
        })
        .finally(() => setLoading(false));
    }
  }, [biotaId, navigate]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.nama_umum.trim()) e.nama_umum = 'Nama umum wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/biota/${biotaId}/update`, form);
        showToast('success', 'Berhasil diperbarui!');
      } else {
        await api.post('/biota', form);
        showToast('success', 'Spesies berhasil ditambahkan!');
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

      {/* Top Bar */}
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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{isEdit ? `Edit Biota: ${form.nama_umum}` : 'Tambah Biota Baru'}</h1>
      </div>

      {/* Main Content */}
      <div style={{ padding: '0 2rem', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Title area matching the image */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              {isEdit ? 'Edit Data Biota Laut' : 'Tambah Spesies Biota Baru'}
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
              Input data katalog spesies hayati laut yang terpantau di kawasan konservasi maritim.
            </p>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Fish size={22} color="#0284c7" />
          </div>
        </div>

        {/* 2-column separated cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '2rem', alignItems: 'start', marginBottom: '2.5rem' }}>
          
          {/* Card Left: Identitas */}
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
                  <Fish size={18} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Identitas Biota</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div>
                    {label(<Fish size={16} color="#0284c7" />, 'Nama Umum', true)}
                    <input style={inputCls('nama_umum')} value={form.nama_umum} onChange={e => set('nama_umum', e.target.value)} placeholder="Contoh: Penyu Hijau" />
                    {errMsg('nama_umum')}
                  </div>

                  <div>
                    {label(<FileText size={16} color="#0284c7" />, 'Nama Ilmiah (Spesies)')}
                    <input style={inputCls('nama_ilmiah')} value={form.nama_ilmiah} onChange={e => set('nama_ilmiah', e.target.value)} placeholder="Contoh: Chelonia mydas" />
                  </div>
                </div>

                <div>
                  {label(<ImageIcon size={16} color="#0284c7" />, 'URL Foto / Gambar')}
                  <input style={inputCls('foto_url')} value={form.foto_url} onChange={e => set('foto_url', e.target.value)} placeholder="Contoh: /images/biota/green_turtle.jpg" />
                </div>

                <div>
                  {label(<FileText size={16} color="#0284c7" />, 'Deskripsi Singkat')}
                  <textarea 
                    style={{ ...inputCls('deskripsi'), resize: 'none', minHeight: 140 }} 
                    value={form.deskripsi} 
                    onChange={e => set('deskripsi', e.target.value)} 
                    placeholder="Tuliskan keterangan habitat, kebiasaan, atau keunikan spesies ini..." 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card Right: Habitat & Konservasi */}
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
                  <Shield size={18} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Habitat & Konservasi</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                <div>
                  {label(<Shield size={16} color="#d97706" />, 'Status Konservasi (IUCN)')}
                  <select style={inputCls('status_konservasi')} value={form.status_konservasi} onChange={e => set('status_konservasi', e.target.value)}>
                    {CONSERVATION_STATUS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div>
                    {label(<Map size={16} color="#d97706" />, 'Habitat Utama')}
                    <input style={inputCls('habitat')} value={form.habitat} onChange={e => set('habitat', e.target.value)} placeholder="Contoh: Terumbu karang, padang lamun" />
                  </div>

                  <div>
                    {label(<Map size={16} color="#d97706" />, 'Zona Kedalaman / Kolom Air')}
                    <input style={inputCls('zona_kedalaman')} value={form.zona_kedalaman} onChange={e => set('zona_kedalaman', e.target.value)} placeholder="Contoh: 0-15m, epipelagik" />
                  </div>
                </div>
              </div>

              {/* Form Actions inside Card 2 Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '2.5rem' }}>
                <button type="button" onClick={() => navigate('/operator')} style={{ padding: '0.65rem 1.25rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', color: '#475569', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  Batal
                </button>
                <button
                  onClick={handleSave} disabled={saving}
                  style={{
                    padding: '0.65rem 1.75rem', background: 'linear-gradient(135deg, #0ea5e9, #023e8a)', border: 'none', borderRadius: '0.5rem',
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
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
