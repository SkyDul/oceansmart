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

      {/* Top Bar */}
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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{isEdit ? `Edit Biota: ${form.nama_umum}` : 'Tambah Biota Baru'}</h1>
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Identitas Biota</h2>
            </div>

            <div>
              {label(<Fish size={16} color="#10b981" />, 'Nama Umum', true)}
              <input style={inputCls('nama_umum')} value={form.nama_umum} onChange={e => set('nama_umum', e.target.value)} placeholder="Contoh: Penyu Hijau" />
              {errMsg('nama_umum')}
            </div>

            <div>
              {label(<FileText size={16} color="#10b981" />, 'Nama Ilmiah (Spesies)')}
              <input style={inputCls('nama_ilmiah')} value={form.nama_ilmiah} onChange={e => set('nama_ilmiah', e.target.value)} placeholder="Contoh: Chelonia mydas" />
            </div>

            <div>
              {label(<ImageIcon size={16} color="#10b981" />, 'URL Foto / Gambar')}
              <input style={inputCls('foto_url')} value={form.foto_url} onChange={e => set('foto_url', e.target.value)} placeholder="/images/biota/..." />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {label(<FileText size={16} color="#10b981" />, 'Deskripsi Singkat')}
              <textarea 
                style={{ ...inputCls('deskripsi'), flex: 1, resize: 'none', minHeight: 100 }} 
                value={form.deskripsi} 
                onChange={e => set('deskripsi', e.target.value)} 
                placeholder="Penjelasan singkat mengenai biota..." 
              />
            </div>
          </div>

          {/* RIGHT SIDE: Habitat & Konservasi */}
          <div style={{ flex: 1, padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '2rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
                2
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Habitat & Konservasi</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, overflow: 'hidden' }}>
              
              <div>
                {label(<Shield size={16} color="#f59e0b" />, 'Status Konservasi (IUCN)')}
                <select style={inputCls('status_konservasi')} value={form.status_konservasi} onChange={e => set('status_konservasi', e.target.value)}>
                  {CONSERVATION_STATUS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                {label(<Map size={16} color="#f59e0b" />, 'Habitat Utama')}
                <input style={inputCls('habitat')} value={form.habitat} onChange={e => set('habitat', e.target.value)} placeholder="Contoh: Terumbu karang, lamun..." />
              </div>

              <div>
                {label(<Map size={16} color="#f59e0b" />, 'Zona Kedalaman (Pelagik)')}
                <input style={inputCls('zona_kedalaman')} value={form.zona_kedalaman} onChange={e => set('zona_kedalaman', e.target.value)} placeholder="Contoh: epipelagik, 0-5m..." />
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
                {saving ? 'Menyimpan...' : <><Save size={16} /> {isEdit ? 'Simpan Perubahan' : 'Daftarkan Biota'}</>}
              </button>
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
