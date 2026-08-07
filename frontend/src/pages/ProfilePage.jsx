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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', overflow: 'hidden', position: 'relative' }}>
      
      {/* Decorative background blobs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(2,132,199,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }}></div>

      {/* Header Bar */}
      <header style={{ 
        padding: '1.25rem 2rem', 
        background: 'rgba(255, 255, 255, 0.6)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.8)', 
        flexShrink: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', padding: '0.6rem', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(2,132,199,0.2)' }}>
          <User size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Pengaturan Akun</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.15rem 0 0', fontWeight: 500 }}>Kelola informasi pribadi dan profil Anda</p>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '2rem', display: 'flex', gap: '2rem', overflow: 'hidden', zIndex: 10, maxWidth: '1200px', margin: '0 auto', width: '100%', animation: 'fadeInUp 0.5s ease-out' }}>
        
        {/* Left Column: Profile Card */}
        <div style={{ 
          width: '340px', 
          background: 'rgba(255, 255, 255, 0.7)', 
          backdropFilter: 'blur(16px)',
          borderRadius: '1.5rem', 
          border: '1px solid rgba(255, 255, 255, 0.8)', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
          padding: '2.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          height: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Card Top Decoration */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', opacity: 0.1, zIndex: 0 }}></div>

          {/* Avatar Area */}
          <div style={{ position: 'relative', marginBottom: '1.5rem', zIndex: 1 }}>
            <div style={{
              padding: '4px',
              background: 'linear-gradient(135deg, #0ea5e9, #38bdf8, #bae6fd)',
              borderRadius: '28px',
              boxShadow: '0 8px 24px rgba(14, 165, 233, 0.2)'
            }}>
              {userPhoto && !imgError ? (
                <img 
                  src={userPhoto} 
                  alt="avatar" 
                  onError={() => setImgError(true)}
                  style={{ 
                    width: 110, height: 110, borderRadius: '24px', 
                    objectFit: 'cover', border: '4px solid #ffffff'
                  }} 
                />
              ) : (
                <div style={{ 
                  width: 110, height: 110, borderRadius: '24px', 
                  background: '#ffffff', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '3rem', fontWeight: 800, color: '#0284c7',
                  border: '4px solid #ffffff'
                }}>
                  {initialLetter}
                </div>
              )}
            </div>
            
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              background: '#ffffff', border: '2px solid #f0f9ff',
              borderRadius: '50%', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            className="hover-scale"
            >
              <Camera size={16} color="#0284c7" />
            </div>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', textAlign: 'center', zIndex: 1 }}>{userData.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, zIndex: 1 }}>
            <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}></div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>{usernameHandle}</span>
          </div>

          <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(226,232,240,0.8), transparent)', margin: '1.75rem 0' }} />

          {/* Registration Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.6)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.8)', transition: 'transform 0.2s', cursor: 'default' }} className="hover-lift">
              <div style={{ background: '#e0f2fe', width: 40, height: 40, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>
                <Calendar size={18} color="#0284c7" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Bergabung Pada</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{formatDate(userData.created_at)}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.6)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.8)', transition: 'transform 0.2s', cursor: 'default' }} className="hover-lift">
              <div style={{ background: '#e0f2fe', width: 40, height: 40, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>
                <Shield size={18} color="#0284c7" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Jenis Akun</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', textTransform: 'capitalize' }}>
                  {role === 'operator' ? 'Operator Wilayah' : 'Pengguna Umum'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Form */}
        <div style={{ 
          flex: 1,
          background: 'rgba(255, 255, 255, 0.7)', 
          backdropFilter: 'blur(16px)',
          borderRadius: '1.5rem', 
          border: '1px solid rgba(255, 255, 255, 0.8)', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }} className="custom-scrollbar">
              
              {/* 1. Informasi Pribadi */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} color="#0284c7" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Informasi Dasar</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-control">
                  <label style={{ fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem', display: 'block' }}>Nama Lengkap</label>
                  <input 
                    type="text" 
                    value={form.nama}
                    onChange={e => setForm({...form, nama: e.target.value})}
                    required
                    style={{ 
                      width: '100%', padding: '0.85rem 1rem', background: '#ffffff', 
                      border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontSize: '0.9rem',
                      outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
                  />
                </div>
                <div className="form-control">
                  <label style={{ fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem', display: 'block' }}>Email Akun</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Mail size={16} />
                    </span>
                    <input 
                      type="email" 
                      value={form.email}
                      disabled
                      style={{ 
                        width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', background: 'rgba(241,245,249,0.5)', 
                        color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '0.9rem', 
                        cursor: 'not-allowed', fontWeight: 500
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="form-control">
                  <label style={{ fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem', display: 'block' }}>Nomor WhatsApp/HP</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Phone size={16} />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Contoh: 0812XXXXXXXX"
                      value={form.no_hp}
                      onChange={e => setForm({...form, no_hp: e.target.value})}
                      style={{ 
                        width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', background: '#ffffff', 
                        border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontSize: '0.9rem',
                        outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
                    />
                  </div>
                </div>
                {role === 'operator' && (
                  <div className="form-control">
                    <label style={{ fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: '0.85rem', display: 'block' }}>Wilayah Kelolaan</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        <MapPin size={16} />
                      </span>
                      <input 
                        type="text" 
                        value={`${provinsi} (${wilayah})`} 
                        disabled
                        style={{ 
                          width: '100%', padding: '0.85rem 1rem 0.85rem 2.5rem', background: 'rgba(241,245,249,0.5)', 
                          color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '0.9rem', 
                          cursor: 'not-allowed', fontWeight: 600
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, rgba(226,232,240,0.8), transparent)', marginBottom: '2.5rem' }} />

              {/* 2. Keamanan Akun */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={16} color="#ef4444" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Keamanan Akun</h3>
              </div>

              <div style={{ 
                background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0.5))', 
                borderRadius: '1rem', 
                padding: '1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                border: '1px solid rgba(226,232,240,0.8)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', margin: '0 0 6px 0' }}>Kata Sandi Akses</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', maxWidth: '300px', lineHeight: 1.5 }}>Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun dari akses tidak sah.</p>
                </div>
                
                {!isChangingPassword ? (
                  <button 
                    type="button"
                    onClick={() => setIsChangingPassword(true)}
                    style={{
                      background: '#ffffff', border: '1px solid #cbd5e1',
                      borderRadius: '0.75rem', padding: '0.6rem 1rem', fontSize: '0.85rem',
                      fontWeight: 700, color: '#334155', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  >
                    Ganti Password
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '260px', animation: 'fadeIn 0.3s ease-out' }}>
                    <input 
                      type="password"
                      placeholder="Masukkan kata sandi baru"
                      value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})}
                      style={{ 
                        width: '100%', padding: '0.75rem 1rem', background: '#ffffff', 
                        border: '1px solid #cbd5e1', borderRadius: '0.75rem', fontSize: '0.85rem',
                        outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        onClick={() => { setIsChangingPassword(false); setForm(f => ({ ...f, password: '' })); }} 
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
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
              padding: '1.5rem 2.5rem', 
              background: 'rgba(255, 255, 255, 0.4)', 
              borderTop: '1px solid rgba(255, 255, 255, 0.8)',
              display: 'flex', 
              justifyContent: 'flex-end',
              backdropFilter: 'blur(8px)'
            }}>
              <button 
                type="submit" 
                disabled={isSaving}
                style={{ 
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)', 
                  border: 'none', color: '#ffffff', padding: '0.75rem 2rem', 
                  fontWeight: 700, borderRadius: '0.75rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  opacity: isSaving ? 0.7 : 1,
                  transform: isSaving ? 'none' : 'translateY(0)'
                }}
                onMouseEnter={e => { if(!isSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(2, 132, 199, 0.4)'; } }}
                onMouseLeave={e => { if(!isSaving) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.3)'; } }}
              >
                {isSaving ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Simpan Perubahan
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff', padding: '14px 28px', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>!</div>}
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{toast.msg}</span>
        </div>
      )}
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hover-scale:hover {
          transform: scale(1.1);
        }
        .hover-lift:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.05);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
