import { useState, useEffect } from 'react';
import { User, Mail, Lock, CheckCircle2, Shield, MapPin, Globe, Calendar, Phone, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState('pengguna');
  const [wilayah, setWilayah] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [form, setForm] = useState({
    nama: '',
    email: '',
    password: '',
    no_hp: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('ocean_user');
    const r = localStorage.getItem('ocean_role') || 'pengguna';
    const w = localStorage.getItem('ocean_wilayah') || '';
    const p = localStorage.getItem('ocean_provinsi') || '';
    
    if (r === 'admin') {
      navigate('/dashboard');
      return;
    }

    setRole(r);
    setWilayah(w);
    setProvinsi(p);

    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        setUserData(userObj);
        setForm({
          nama: userObj.name || '',
          email: userObj.email || '',
          password: '',
          no_hp: userObj.no_hp || ''
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userData?.id) {
      showToast('error', 'Gagal memuat ID pengguna.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        nama: form.nama,
        email: form.email,
        no_hp: form.no_hp
      };
      if (form.password) payload.password = form.password;

      const res = await api.put(`/users/${userData.id}/profile`, payload);
      
      const newUserData = { 
        ...userData, 
        name: res.data.user.name, 
        email: res.data.user.email,
        no_hp: res.data.user.no_hp 
      };
      localStorage.setItem('ocean_user', JSON.stringify(newUserData));
      setUserData(newUserData);
      setForm(f => ({ ...f, password: '' }));
      setIsChangingPassword(false);
      
      showToast('success', 'Profil berhasil diperbarui!');
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Gagal menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Agustus 2026';
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return 'Agustus 2026';
    }
  };

  if (!userData || role === 'admin') return null;

  const userPhoto = userData?.picture || null;
  const initialLetter = form.nama ? form.nama.charAt(0).toUpperCase() : 'U';
  const usernameHandle = form.email ? `@${form.email.split('@')[0]}` : '@pengguna';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      
      {/* Header Bar */}
      <header style={{ 
        padding: '1.25rem 2rem', 
        background: '#ffffff', 
        borderBottom: '1px solid #e2e8f0', 
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #023e8a)', padding: '0.6rem', borderRadius: '0.75rem' }}>
          <User size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Pengaturan Profil</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.15rem 0 0', fontWeight: 500 }}>Kelola informasi pribadi dan preferensi akun Anda</p>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '3rem 2rem', display: 'flex', justifyContent: 'center' }}>
        
        {/* Unified Profile Card */}
        <div style={{ 
          width: '100%', maxWidth: '640px',
          background: '#ffffff', 
          borderRadius: '1.25rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 10px 40px rgba(2,62,138,0.06)',
          overflow: 'hidden'
        }}>
          
          {/* Cover Photo Area */}
          <div style={{ height: '120px', background: 'linear-gradient(135deg, #0ea5e9 0%, #023e8a 100%)', position: 'relative' }}>
            {/* Avatar */}
            <div style={{ position: 'absolute', bottom: '-40px', left: '2rem', padding: '4px', background: '#fff', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {userPhoto && !imgError ? (
                <img 
                  src={userPhoto} 
                  alt="avatar" 
                  onError={() => setImgError(true)}
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ 
                  width: 80, height: 80, borderRadius: '50%', 
                  background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '2.5rem', fontWeight: 800, color: '#023e8a'
                }}>
                  {initialLetter}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ padding: '3.5rem 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Profile Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>{userData.name}</h3>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>{usernameHandle} • {role === 'operator' ? 'Operator Wilayah' : 'Pengguna Umum'}</span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />

            {/* Profile Form */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem', display: 'block' }}>Nama Lengkap</label>
                  <input 
                    type="text" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} required
                    style={{ width: '100%', padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem', display: 'block' }}>Email Akun</label>
                  <input 
                    type="email" value={form.email} disabled
                    style={{ width: '100%', padding: '0.85rem 1rem', background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem', display: 'block' }}>Nomor WhatsApp/HP</label>
                  <input 
                    type="text" placeholder="Contoh: 0812XXXXXXXX" value={form.no_hp} onChange={e => setForm({...form, no_hp: e.target.value})}
                    style={{ width: '100%', padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                {role === 'operator' && (
                  <div>
                    <label style={{ fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem', display: 'block' }}>Wilayah Kelolaan</label>
                    <input 
                      type="text" value={`${provinsi} (${wilayah})`} disabled
                      style={{ width: '100%', padding: '0.85rem 1rem', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', cursor: 'not-allowed' }}
                    />
                  </div>
                )}
              </div>

              {/* Password Section */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={16} /> Keamanan & Kata Sandi</h4>
                
                {!isChangingPassword ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Perbarui kata sandi untuk menjaga keamanan akun Anda.</span>
                    <button type="button" onClick={() => setIsChangingPassword(true)} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                      Ganti Password
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="password" placeholder="Masukkan kata sandi baru" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem 1rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => { setIsChangingPassword(false); setForm(f => ({ ...f, password: '' })); }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="submit" disabled={isSaving}
                  style={{ 
                    background: 'linear-gradient(135deg, #0ea5e9, #023e8a)', 
                    border: 'none', color: '#fff', padding: '0.75rem 2.5rem', 
                    fontWeight: 700, borderRadius: '0.5rem', cursor: isSaving ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem'
                  }}
                >
                  {isSaving ? 'Menyimpan...' : <><CheckCircle2 size={16} /> Simpan Perubahan</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '1rem 1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, animation: 'slideIn 0.3s ease-out' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 600 }}>{toast.msg}</span>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
