import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, User, Save, AlertCircle, CheckCircle2, Lock, Mail, Users, MapPin
} from 'lucide-react';
import api from '../api';

export default function OperatorAccountFormPage() {
  const navigate = useNavigate();
  const { operatorId } = useParams();
  const isEdit = Boolean(operatorId);

  const [form, setForm] = useState({
    nama: '',
    nip: '',
    provinsi: '',
    wilayah: '',
    email: '',
    password: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [wilayahList, setWilayahList] = useState([]);

  useEffect(() => {
    api.get('/wilayah')
      .then(res => setWilayahList(res.data))
      .catch(() => {});
  }, []);

  // Load existing operator data for edit mode
  useEffect(() => {
    if (isEdit) {
      api.get('/operators')
        .then(res => {
          const op = res.data.find(o => String(o.id) === String(operatorId));
          if (op) {
            setForm({
              nama: op.nama || '',
              nip: op.nip || '',
              provinsi: op.provinsi || '',
              wilayah: op.wilayah || '',
              email: op.email || '',
              password: ''
            });
          }
        })
        .catch(() => {});
    }
  }, [operatorId, isEdit]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.nama.trim()) e.nama = 'Nama lengkap wajib diisi';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Email tidak valid';
    if (!isEdit && (!form.password || form.password.length < 6)) e.password = 'Minimal 6 karakter';
    if (isEdit && form.password && form.password.length < 6) e.password = 'Minimal 6 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // jangan kirim password kosong saat edit
      if (isEdit) {
        await api.put(`/operators/${operatorId}`, payload);
        showToast('success', 'Akun Operator berhasil diperbarui!');
      } else {
        await api.post('/operators', payload);
        showToast('success', 'Akun Operator berhasil didaftarkan!');
      }
      setTimeout(() => navigate('/operator'), 1000);
    } catch (e) {
      showToast('error', e.response?.data?.detail || (isEdit ? 'Gagal memperbarui operator' : 'Gagal mendaftarkan operator'));
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
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
      {icon} {text} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
  );

  const errMsg = (field) => errors[field] && (
    <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
      <AlertCircle size={12} /> {errors[field]}
    </p>
  );

  return (
    <div style={{ height: '100vh', width: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      
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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{isEdit ? `Edit Operator #${operatorId}` : 'Pendaftaran Operator Baru'}</h1>
      </div>

      {/* Main Content */}
      <div style={{ padding: '0.5rem 2.5rem 1.5rem 2.5rem', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Title area matching the image */}
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              {isEdit ? 'Edit Data Operator' : 'Pendaftaran Operator Baru'}
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>
              {isEdit ? 'Perbarui informasi akun operator wilayah.' : 'Registrasikan akun operator baru untuk wilayah tugas konservasi tertentu.'}
            </p>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#0284c7" />
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
            
            {/* Column Left: Identitas */}
            <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: '3.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Identitas Operator Wilayah</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  {label(<User size={14} color="#0284c7" />, 'Nama Lengkap Operator', true)}
                  <input style={{ ...inputCls('nama'), padding: '0.75rem 0.875rem', fontSize: '0.9375rem' }} value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Contoh: Budi Santoso" />
                  {errMsg('nama')}
                </div>

                <div>
                  {label(<Lock size={14} color="#0284c7" />, 'NIP / NIK Operator')}
                  <input style={{ ...inputCls('nip'), padding: '0.75rem 0.875rem', fontSize: '0.9375rem' }} value={form.nip} onChange={e => set('nip', e.target.value)} placeholder="Masukkan NIP atau nomor identifikasi kepegawaian..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    {label(<MapPin size={14} color="#0284c7" />, 'Provinsi Tugas')}
                    <select style={{ ...inputCls('provinsi'), padding: '0.75rem 0.875rem', fontSize: '0.9375rem' }} value={form.provinsi} onChange={e => set('provinsi', e.target.value)}>
                      <option value="">Pilih Provinsi...</option>
                      <option value="Jawa Barat">Jawa Barat</option>
                      <option value="Jawa Tengah">Jawa Tengah</option>
                      <option value="Jawa Timur">Jawa Timur</option>
                      <option value="DKI Jakarta">DKI Jakarta</option>
                      <option value="Banten">Banten</option>
                      <option value="DI Yogyakarta">DI Yogyakarta</option>
                      <option value="Bali">Bali</option>
                      <option value="Nusa Tenggara Timur">Nusa Tenggara Timur</option>
                      <option value="Sulawesi Tenggara">Sulawesi Tenggara</option>
                      <option value="Sulawesi Utara">Sulawesi Utara</option>
                      <option value="Maluku">Maluku</option>
                      <option value="Papua Barat Daya">Papua Barat Daya</option>
                      <option value="Lainnya">Lainnya...</option>
                    </select>
                  </div>
                  <div>
                    {label(<Users size={14} color="#0284c7" />, 'Wilayah Tugas')}
                    <select
                      style={{ ...inputCls('wilayah'), padding: '0.75rem 0.875rem', fontSize: '0.9375rem' }}
                      value={form.wilayah}
                      onChange={e => {
                        const selected = wilayahList.find(w => w.wilayah === e.target.value);
                        set('wilayah', e.target.value);
                        if (selected) set('provinsi', selected.provinsi);
                      }}
                    >
                      <option value="">Pilih Wilayah Tugas...</option>
                      {wilayahList.map(w => (
                        <option key={w.wilayah} value={w.wilayah}>{w.wilayah} — {w.provinsi}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Column Right: Kredensial */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={16} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Kredensial Akun</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  {label(<Mail size={14} color="#d97706" />, 'Alamat Email Akses', true)}
                  <input style={{ ...inputCls('email'), padding: '0.75rem 0.875rem', fontSize: '0.9375rem' }} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="operator@oceansmart.id" />
                  {errMsg('email')}
                </div>

                <div>
                  {label(<Lock size={14} color="#d97706" />, 'Kata Sandi (Password)', true)}
                  <input style={{ ...inputCls('password'), padding: '0.75rem 0.875rem', fontSize: '0.9375rem' }} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimal 6 karakter" />
                  {errMsg('password')}
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
              {saving ? (isEdit ? 'Menyimpan...' : 'Mendaftarkan...') : <><CheckCircle2 size={14} /> {isEdit ? 'Simpan Perubahan' : 'Daftarkan'}</>}
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
}
