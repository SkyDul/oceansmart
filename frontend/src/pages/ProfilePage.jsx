import { useState, useEffect } from 'react';
import {
  User, Mail, Lock, CheckCircle2, MapPin, Phone, Calendar,
  Shield, Save, Eye, EyeOff, KeyRound, X, AlertCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

/* ─── Forgot Password Modal ───────────────────────────────────── */
function ForgotPasswordModal({ onClose }) {
  const [step, setStep]     = useState(1); // 1=email, 2=token+new pass
  const [email, setEmail]   = useState('');
  const [token, setToken]   = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState(null); // { type, text }

  const requestReset = async () => {
    if (!email.trim()) { setMsg({ type: 'error', text: 'Masukkan email terlebih dahulu.' }); return; }
    setLoading(true); setMsg(null);
    try {
      await api.post('/forgot-password', { email });
      setMsg({ type: 'success', text: 'Kode reset telah dikirim ke email Anda. Periksa inbox / spam.' });
      setStep(2);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Email tidak ditemukan.' });
    } finally { setLoading(false); }
  };

  const doReset = async () => {
    if (!token.trim() || !newPass) { setMsg({ type: 'error', text: 'Semua field wajib diisi.' }); return; }
    if (newPass.length < 6) { setMsg({ type: 'error', text: 'Password minimal 6 karakter.' }); return; }
    setLoading(true); setMsg(null);
    try {
      await api.post('/reset-password', { email, token, new_password: newPass });
      setMsg({ type: 'success', text: 'Password berhasil direset! Silakan login dengan password baru.' });
      setTimeout(onClose, 2000);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Kode tidak valid atau sudah kadaluarsa.' });
    } finally { setLoading(false); }
  };

  const inputSt = {
    width: '100%', padding: '0.7rem 1rem',
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.9375rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', width: '100%', maxWidth: 420, padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} color="#0369a1" />
            <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>Lupa Password</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {msg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 0.875rem', background: msg.type === 'success' ? '#f0fdf4' : '#fff1f2', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: '0.5rem', color: msg.type === 'success' ? '#15803d' : '#b91c1c', fontSize: '0.8125rem', marginBottom: '1rem', fontWeight: 500 }}>
            {msg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </div>
        )}

        {step === 1 && (
          <>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem', margin: '0 0 1.25rem' }}>
              Masukkan email akun Anda. Kami akan mengirimkan kode reset password.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Akun</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contoh@email.com" style={inputSt}
                onFocus={e => e.target.style.borderColor = '#0369a1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <button onClick={requestReset} disabled={loading} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #023e8a, #0077b6)', border: 'none', borderRadius: '0.5rem', color: '#fff', fontWeight: 700, fontSize: '0.9375rem', cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? 'Mengirim...' : 'Kirim Kode Reset'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
              Masukkan kode 6-digit yang dikirim ke <strong>{email}</strong> dan buat password baru.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kode Reset</label>
              <input value={token} onChange={e => setToken(e.target.value)} placeholder="123456" maxLength={10} style={inputSt}
                onFocus={e => e.target.style.borderColor = '#0369a1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 karakter" style={{ ...inputSt, paddingRight: '2.5rem' }}
                  onFocus={e => e.target.style.borderColor = '#0369a1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '0.75rem', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', color: '#475569', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Kembali</button>
              <button onClick={doReset} disabled={loading} style={{ flex: 2, padding: '0.75rem', background: 'linear-gradient(135deg, #023e8a, #0077b6)', border: 'none', borderRadius: '0.5rem', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? 'Menyimpan...' : 'Reset Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Change Password Section ─────────────────────────────────── */
function ChangePasswordSection({ userId, onClose, showToast }) {
  const [oldPass, setOldPass]   = useState('');
  const [newPass, setNewPass]   = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const inputSt = {
    width: '100%', padding: '0.7rem 2.5rem 0.7rem 1rem',
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  const handleChangePass = async () => {
    setError('');
    if (!oldPass || !newPass || !confirmPass) { setError('Semua field wajib diisi.'); return; }
    if (newPass.length < 6) { setError('Password baru minimal 6 karakter.'); return; }
    if (newPass !== confirmPass) { setError('Konfirmasi password tidak cocok.'); return; }
    setLoading(true);
    try {
      await api.post(`/users/${userId}/change-password`, {
        old_password: oldPass,
        new_password: newPass,
      });
      showToast('success', 'Password berhasil diperbarui!');
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal memperbarui password.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: '#f8fafc', borderRadius: '0.625rem', padding: '1.25rem', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {/* Old Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password Lama</label>
          <div style={{ position: 'relative' }}>
            <input type={showOld ? 'text' : 'password'} value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Password saat ini" style={inputSt}
              onFocus={e => e.target.style.borderColor = '#0369a1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            <button type="button" onClick={() => setShowOld(!showOld)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        {/* New Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password Baru</label>
          <div style={{ position: 'relative' }}>
            <input type={showNew ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 karakter" style={inputSt}
              onFocus={e => e.target.style.borderColor = '#0369a1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        {/* Confirm Password */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Konfirmasi Password Baru</label>
          <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Ulangi password baru" style={{ ...inputSt, paddingRight: '1rem' }}
            onFocus={e => e.target.style.borderColor = '#0369a1'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.75rem', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '0.4rem', color: '#b91c1c', fontSize: '0.8125rem', marginTop: '0.75rem', fontWeight: 500 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={{ padding: '0.55rem 1.1rem', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', color: '#475569', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}>
          Batal
        </button>
        <button type="button" onClick={handleChangePass} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.55rem 1.25rem', background: 'linear-gradient(135deg, #023e8a, #0077b6)', border: 'none', borderRadius: '0.5rem', color: '#fff', fontSize: '0.8125rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
          <Lock size={13} /> {loading ? 'Menyimpan...' : 'Perbarui Password'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main ProfilePage ─────────────────────────────────────────── */
export default function ProfilePage() {
  const navigate = useNavigate();
  const [userData, setUserData]           = useState(null);
  const [role, setRole]                   = useState('pengguna');
  const [wilayah, setWilayah]             = useState('');
  const [provinsi, setProvinsi]           = useState('');
  const [imgError, setImgError]           = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [form, setForm]                   = useState({ nama: '', email: '', no_hp: '' });
  const [isSaving, setIsSaving]           = useState(false);
  const [toast, setToast]                 = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('ocean_user');
    const r       = localStorage.getItem('ocean_role') || 'pengguna';
    const w       = localStorage.getItem('ocean_wilayah') || '';
    const p       = localStorage.getItem('ocean_provinsi') || '';

    if (r === 'admin') { navigate('/dashboard'); return; }

    setRole(r); setWilayah(w); setProvinsi(p);

    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        setUserData(userObj);
        setForm({ nama: userObj.name || '', email: userObj.email || '', no_hp: userObj.no_hp || '' });
      } catch (e) { console.error(e); }
    } else { navigate('/login'); }
  }, [navigate]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userData?.id) {
      showToast('error', 'Sesi tidak valid. Silakan login ulang.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.put(`/users/${userData.id}/profile`, {
        nama: form.nama,
        email: form.email,
        no_hp: form.no_hp,
      });
      const updated = {
        ...userData,
        name:  res.data.user.name,
        email: res.data.user.email,
        no_hp: res.data.user.no_hp,
      };
      localStorage.setItem('ocean_user', JSON.stringify(updated));
      setUserData(updated);
      showToast('success', 'Profil berhasil diperbarui!');
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Gagal menyimpan profil.');
    } finally { setIsSaving(false); }
  };

  if (!userData || role === 'admin') return null;

  const userPhoto  = userData?.picture || null;
  const initial    = form.nama ? form.nama.charAt(0).toUpperCase() : 'U';
  const handle     = form.email ? `@${form.email.split('@')[0]}` : '@pengguna';
  const roleLabel  = role === 'operator' ? 'Operator Wilayah' : 'Pengguna Umum';

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.9375rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const disabledStyle = { ...inputStyle, background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed', border: '1.5px solid #e2e8f0' };
  const labelStyle    = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* Forgot Password Modal */}
      {showForgotPass && <ForgotPasswordModal onClose={() => setShowForgotPass(false)} />}

      {/* Breadcrumb */}
      <div style={{ padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
        <Link to="/dashboard" style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
        <span style={{ color: '#94a3b8' }}>›</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Pengaturan Profil</span>
      </div>

      <div style={{ padding: '1.75rem 2rem', display: 'flex', gap: '1.75rem', maxWidth: '100%', margin: '0 auto', alignItems: 'flex-start', boxSizing: 'border-box' }}>

        {/* LEFT: Profile card */}
        <div style={{ width: 260, flexShrink: 0, background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem' }}>

          {/* Avatar */}
          <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
            {userPhoto && !imgError ? (
              <img src={userPhoto} alt="avatar" onError={() => setImgError(true)}
                style={{ width: 96, height: 96, borderRadius: '1.25rem', objectFit: 'cover', border: '3px solid #e0f2fe' }} />
            ) : (
              <div style={{ width: 96, height: 96, borderRadius: '1.25rem', background: 'linear-gradient(135deg, #023e8a, #0077b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: '#fff', boxShadow: '0 4px 16px rgba(2,62,138,0.25)' }}>
                {initial}
              </div>
            )}
          </div>

          {/* Name & handle */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: '#0f172a' }}>{form.nama || 'Nama'}</div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 3 }}>{handle}</div>
          </div>

          <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #f1f5f9', margin: '0.5rem 0' }} />

          {/* Meta info */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={15} color="#0369a1" />
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600 }}>Terdaftar Sejak</div>
                <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.8125rem' }}>Agustus 2026</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={15} color="#0369a1" />
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600 }}>Role</div>
                <div style={{ fontWeight: 700, color: '#023e8a', fontSize: '0.8125rem' }}>{roleLabel}</div>
              </div>
            </div>
            {role === 'operator' && wilayah && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={15} color="#0369a1" />
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600 }}>Wilayah Tugas</div>
                  <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.8125rem' }}>{wilayah}</div>
                </div>
              </div>
            )}
          </div>

          {/* Lupa password link */}
          <button type="button" onClick={() => setShowForgotPass(true)}
            style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#0369a1', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            Lupa Password?
          </button>
        </div>

        {/* RIGHT: Form card */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', padding: '2.25rem 2.5rem' }}>
          <form onSubmit={handleSave}>

            {/* Section: Informasi Pribadi */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <User size={16} color="#0369a1" />
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Informasi Pribadi</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Nama */}
                <div>
                  <label style={labelStyle}>Nama Lengkap</label>
                  <input type="text" required value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#0369a1'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>

                {/* Email — read only, cannot change */}
                <div>
                  <label style={labelStyle}>Email Akun</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="email" value={form.email} disabled style={{ ...disabledStyle, paddingLeft: '2rem' }} />
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: '#94a3b8' }}>Email tidak dapat diubah</p>
                </div>

                {/* No HP */}
                <div>
                  <label style={labelStyle}>Nomor WhatsApp / HP</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" placeholder="Contoh: 0812XXXXXXXX" value={form.no_hp}
                      onChange={e => setForm({ ...form, no_hp: e.target.value })}
                      style={{ ...inputStyle, paddingLeft: '2rem' }}
                      onFocus={e => e.target.style.borderColor = '#0369a1'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                </div>

                {/* Role-specific field */}
                {role === 'operator' ? (
                  <div>
                    <label style={labelStyle}>Wilayah Kelolaan</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="text" value={`${provinsi}${wilayah ? ` — ${wilayah}` : ''}`} disabled
                        style={{ ...disabledStyle, paddingLeft: '2rem' }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Role / Hak Akses</label>
                    <div style={{ position: 'relative' }}>
                      <Shield size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="text" value={roleLabel} disabled style={{ ...disabledStyle, paddingLeft: '2rem' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Keamanan Akun */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <Lock size={16} color="#0369a1" />
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>Keamanan Akun</h3>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '0.625rem', padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Kata Sandi</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>Perbarui kata sandi Anda secara berkala untuk keamanan.</div>
                  </div>
                  {!showChangePass && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button type="button" onClick={() => setShowChangePass(true)}
                        style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.8125rem', fontWeight: 700, color: '#0369a1', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#0369a1'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                        Ganti Password
                      </button>
                      <button type="button" onClick={() => setShowForgotPass(true)}
                        style={{ padding: '0.45rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #fecaca', background: '#fff', fontSize: '0.8125rem', fontWeight: 700, color: '#dc2626', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#fecaca'}>
                        Lupa Password
                      </button>
                    </div>
                  )}
                </div>

                {showChangePass && (
                  <ChangePasswordSection
                    userId={userData?.id}
                    showToast={showToast}
                    onClose={() => setShowChangePass(false)}
                  />
                )}
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={isSaving}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 1.75rem', background: 'linear-gradient(135deg, #023e8a, #0077b6)', border: 'none', borderRadius: '0.5rem', color: '#fff', fontWeight: 700, fontSize: '0.9375rem', cursor: isSaving ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(2,62,138,0.25)', transition: 'opacity 0.2s', opacity: isSaving ? 0.8 : 1 }}>
                <Save size={16} />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '0.875rem 1.5rem', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 9999, animation: 'slideUp 0.25s ease-out' }}>
          {toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{toast.msg}</span>
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
