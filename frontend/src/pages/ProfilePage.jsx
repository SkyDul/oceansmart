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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* Header Bar - Fixed Top */}
      <header className="page-header" style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Pengaturan Akun</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.15rem 0 0' }}>Kelola informasi pribadi dan keamanan akun Anda</p>
        </div>
      </header>

      {/* Main Content Area - Full Height, No Scroll */}
      <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem', overflow: 'hidden' }}>
        
        {/* Left Column: Profile Card */}
        <div style={{ 
          width: '320px', 
          background: '#ffffff', 
          borderRadius: '1rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          height: '100%'
        }}>
          {/* Avatar Area */}
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            {userPhoto && !imgError ? (
              <img 
                src={userPhoto} 
                alt="avatar" 
                onError={() => setImgError(true)}
                style={{ 
                  width: 100, height: 100, borderRadius: '24px', 
                  objectFit: 'cover', border: '1px solid #e2e8f0'
                }} 
              />
            ) : (
              <div style={{ 
                width: 100, height: 100, borderRadius: '24px', 
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '2.5rem', fontWeight: 800, color: '#ffffff',
              }}>
                {initialLetter}
              </div>
            )}
            
            <div style={{
              position: 'absolute', bottom: -6, right: -6,
              background: '#ffffff', border: '1px solid #e2e8f0',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer'
            }}>
              <Camera size={14} color="#64748b" />
            </div>
          </div>

          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0', textAlign: 'center' }}>{userData.name}</h2>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0284c7', marginBottom: '1.5rem' }}>{usernameHandle}</span>

          <div style={{ width: '100%', height: '1px', background: '#f1f5f9', margin: '0.5rem 0 1.25rem 0' }} />

          {/* Registration Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
            <div style={{ 
              background: '#e0f2fe', width: 32, height: 32, borderRadius: '6px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <Calendar size={16} color="#0284c7" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bergabung Pada</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>{formatDate(userData.created_at)}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
            <div style={{ 
              background: '#e0f2fe', width: 32, height: 32, borderRadius: '6px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <Shield size={16} color="#0284c7" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Jenis Akun</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', textTransform: 'capitalize' }}>
                {role === 'operator' ? 'Operator Wilayah' : 'Pengguna Umum'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Form */}
        <div style={{ 
          flex: 1,
          background: '#ffffff', 
          borderRadius: '1rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' }}>
              {/* 1. Informasi Pribadi */}
              <h3 style={{ 
                fontSize: '1rem', fontWeight: 700, color: '#0f172a', 
                marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 
              }}>
                <User size={18} color="#0284c7" /> Informasi Dasar
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                <div className="form-control">
                  <label className="label" style={{ fontWeight: 600, color: '#475569', marginBottom: 6, fontSize: '0.8125rem' }}>Nama Lengkap</label>
                  <input 
                    type="text" 
                    className="input input-bordered w-full" 
                    value={form.nama}
                    onChange={e => setForm({...form, nama: e.target.value})}
                    required
                    style={{ background: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div className="form-control">
                  <label className="label" style={{ fontWeight: 600, color: '#475569', marginBottom: 6, fontSize: '0.8125rem' }}>Email Akun</label>
                  <input 
                    type="email" 
                    className="input input-bordered w-full" 
                    value={form.email}
                    disabled
                    style={{ background: '#f8fafc', color: '#94a3b8', borderColor: '#e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="form-control">
                  <label className="label" style={{ fontWeight: 600, color: '#475569', marginBottom: 6, fontSize: '0.8125rem' }}>Nomor WhatsApp/HP</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                      <Phone size={14} />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Contoh: 0812XXXXXXXX"
                      className="input input-bordered w-full" 
                      value={form.no_hp}
                      onChange={e => setForm({...form, no_hp: e.target.value})}
                      style={{ background: '#ffffff', borderColor: '#cbd5e1', borderRadius: '0.5rem', fontSize: '0.875rem', paddingLeft: '2.25rem' }}
                    />
                  </div>
                </div>
                {role === 'operator' && (
                  <div className="form-control">
                    <label className="label" style={{ fontWeight: 600, color: '#475569', marginBottom: 6, fontSize: '0.8125rem' }}>
                      Wilayah Kelolaan
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                        <MapPin size={14} />
                      </span>
                      <input 
                        type="text" 
                        className="input input-bordered w-full" 
                        value={`${provinsi} (${wilayah})`} 
                        disabled
                        style={{ background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', paddingLeft: '2.25rem', fontWeight: 600 }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '1.5rem 0' }} />

              {/* 2. Keamanan Akun */}
              <h3 style={{ 
                fontSize: '1rem', fontWeight: 700, color: '#0f172a', 
                marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 
              }}>
                <Lock size={18} color="#0284c7" /> Keamanan Akun
              </h3>

              <div style={{ 
                background: '#ffffff', 
                borderRadius: '0.75rem', 
                padding: '1.25rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                border: '1px solid #e2e8f0',
              }}>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>Kata Sandi Akses</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun.</p>
                </div>
                
                {!isChangingPassword ? (
                  <button 
                    type="button"
                    onClick={() => setIsChangingPassword(true)}
                    style={{
                      background: '#ffffff', border: '1px solid #cbd5e1',
                      borderRadius: '0.5rem', padding: '0.4rem 0.85rem', fontSize: '0.75rem',
                      fontWeight: 650, color: '#334155', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    Ganti Password
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '220px' }}>
                    <input 
                      type="password"
                      placeholder="Masukkan kata sandi baru"
                      className="input input-bordered input-sm w-full"
                      value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})}
                      style={{ borderRadius: '0.375rem', fontSize: '0.75rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        onClick={() => { setIsChangingPassword(false); setForm(f => ({ ...f, password: '' })); }} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Footer / Submit Button */}
            <div style={{ 
              padding: '1.25rem 2.5rem', 
              background: '#f8fafc', 
              borderTop: '1px solid #e2e8f0',
              display: 'flex', 
              justifyContent: 'flex-end',
              borderBottomLeftRadius: '1rem',
              borderBottomRightRadius: '1rem'
            }}>
              <button 
                type="submit" 
                disabled={isSaving}
                style={{ 
                  background: '#0284c7', 
                  border: 'none', color: '#ffffff', padding: '0.6rem 1.75rem', 
                  fontWeight: 650, borderRadius: '0.5rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#0369a1'}
                onMouseLeave={e => e.currentTarget.style.background = '#0284c7'}
              >
                <CheckCircle2 size={14} /> {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '12px 24px', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{toast.msg}</span>
        </div>
      )}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
