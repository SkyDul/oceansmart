import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Save, AlertCircle, CheckCircle2, Lock, Mail, Users, MapPin, X
} from 'lucide-react';
import api from '../api';

export default function OperatorAccountFormPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nama: '',
    nip: '',
    provinsi: 'Jawa Barat',
    wilayah: 'Pangandaran',
    email: '',
    password: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const validate = () => {
    const e = {};
    if (!form.nama.trim()) e.nama = 'Nama lengkap wajib diisi';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Email tidak valid';
    if (!form.password || form.password.length < 6) e.password = 'Minimal 6 karakter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post('/operators', form);
      showToast('success', 'Akun Operator berhasil didaftarkan!');
      setTimeout(() => navigate('/operator'), 1000);
    } catch (e) {
      showToast('error', e.response?.data?.detail || 'Gagal mendaftarkan operator');
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
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Pendaftaran Operator Baru</h1>
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Identitas Operator</h2>
            </div>

            <div>
              {label(<User size={16} color="#10b981" />, 'Nama Lengkap Operator', true)}
              <input style={inputCls('nama')} value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Contoh: Budi Santoso" />
              {errMsg('nama')}
            </div>

            <div>
              {label(<Lock size={16} color="#10b981" />, 'NIP / NIK')}
              <input style={inputCls('nip')} value={form.nip} onChange={e => set('nip', e.target.value)} placeholder="Misal: 19850123..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                {label(<MapPin size={16} color="#10b981" />, 'Provinsi')}
                <select style={inputCls('provinsi')} value={form.provinsi} onChange={e => set('provinsi', e.target.value)}>
                  <option value="Jawa Barat">Jawa Barat</option>
                  <option value="Jawa Tengah">Jawa Tengah</option>
                  <option value="Jawa Timur">Jawa Timur</option>
                  <option value="DKI Jakarta">DKI Jakarta</option>
                  <option value="Banten">Banten</option>
                  <option value="DI Yogyakarta">DI Yogyakarta</option>
                  <option value="Bali">Bali</option>
                  <option value="Lainnya">Lainnya...</option>
                </select>
              </div>
              <div>
                {label(<Users size={16} color="#10b981" />, 'Wilayah Tugas (Bisa Diketik / Dipilih)')}
                <div style={{ position: 'relative' }}>
                  <input 
                    list="wilayah-options" 
                    style={{ ...inputCls('wilayah'), paddingRight: '3.5rem' }} 
                    value={form.wilayah} 
                    onChange={e => set('wilayah', e.target.value)} 
                    placeholder="Ketik atau pilih..." 
                  />
                  <datalist id="wilayah-options">
                    <option value="Pangandaran" />
                    <option value="Pelabuhan Ratu, Sukabumi" />
                    <option value="Karangsong, Indramayu" />
                    <option value="Kejawanan, Cirebon" />
                    <option value="Pondok Bali, Subang" />
                    <option value="Tanjung Pakis, Karawang" />
                  </datalist>
                  {form.wilayah && (
                    <button 
                      type="button" 
                      onClick={() => set('wilayah', '')}
                      style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', gap: 16, marginTop: 'auto' }}>
              <Users size={24} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.9375rem', color: '#475569', margin: 0, lineHeight: 1.6 }}>
                Akun ini akan memiliki hak akses sebagai <strong>Operator Wilayah</strong>. Mereka dapat mengelola sensor dan membaca peringatan sistem di area penugasannya.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: Kredensial */}
          <div style={{ flex: 1, padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '2rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
                2
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Detail Akses & Keamanan</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, overflow: 'hidden' }}>
              
              <div>
                {label(<Mail size={16} color="#f59e0b" />, 'Alamat Email Akses', true)}
                <input style={inputCls('email')} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="operator@oceansmart.id" />
                {errMsg('email')}
              </div>

              <div>
                {label(<Lock size={16} color="#f59e0b" />, 'Kata Sandi (Password)', true)}
                <input style={inputCls('password')} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimal 6 karakter" />
                {errMsg('password')}
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
                {saving ? 'Mendaftarkan...' : <><CheckCircle2 size={16} /> Daftarkan Operator</>}
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
      `}</style>
    </div>
  );
}
