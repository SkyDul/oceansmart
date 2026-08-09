import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, LogIn, Anchor, Eye, EyeOff, Home, User, KeyRound, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';

function ForgotPasswordModal({ onClose }) {
  const [step, setStep]         = useState(1);
  const [email, setEmail]       = useState('');
  const [token, setToken]       = useState('');
  const [newPass, setNewPass]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState(null);

  const requestReset = async () => {
    if (!email.trim()) { setMsg({ type: 'error', text: 'Masukkan email terlebih dahulu.' }); return; }
    setLoading(true); setMsg(null);
    try {
      await api.post('/forgot-password', { email });
      setMsg({ type: 'success', text: 'Kode reset telah dikirim ke email Anda. Periksa inbox/spam.' });
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
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Kode tidak valid atau kadaluarsa.' });
    } finally { setLoading(false); }
  };

  const inputSt = {
    width: '100%', padding: '0.7rem 1rem',
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.9375rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', width: '100%', maxWidth: 420, padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} color="#0077b6" />
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
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
              Masukkan email akun Anda. Kami akan mengirimkan kode reset password.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Akun</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contoh@email.com" style={inputSt}
                onFocus={e => e.target.style.borderColor = '#0077b6'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
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
                onFocus={e => e.target.style.borderColor = '#0077b6'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 karakter" style={{ ...inputSt, paddingRight: '2.5rem' }}
                  onFocus={e => e.target.style.borderColor = '#0077b6'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
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

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const successMsg = location.state?.message || '';

  useEffect(() => {
    const savedEmail = localStorage.getItem('ocean_remembered_email');
    const savedPassword = localStorage.getItem('ocean_remembered_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/login', { email, password });
      setIsLoading(false);
      localStorage.setItem('ocean_user', JSON.stringify({ id: res.data.id, name: res.data.name || res.data.nama, email: res.data.email, picture: res.data.picture || null, no_hp: res.data.no_hp || '' }));
      if (rememberMe) {
        localStorage.setItem('ocean_remembered_email', email);
        localStorage.setItem('ocean_remembered_password', password);
      } else {
        localStorage.removeItem('ocean_remembered_email');
        localStorage.removeItem('ocean_remembered_password');
      }
      onLogin(res.data.role, res.data.wilayah, res.data.provinsi);
      navigate('/dashboard');
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.response?.data?.detail || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const res = await api.post('/login/google', {
          email: userInfo.data.email,
          nama: userInfo.data.name || userInfo.data.given_name,
          google_id: userInfo.data.sub
        });
        setIsLoading(false);
        localStorage.setItem('ocean_user', JSON.stringify({ id: res.data.id, name: res.data.name, email: res.data.email, picture: userInfo.data.picture, no_hp: res.data.no_hp || '' }));
        onLogin(res.data.role, res.data.wilayah, res.data.provinsi);
        navigate('/dashboard');
      } catch (err) {
        setIsLoading(false);
        setErrorMsg(err.response?.data?.detail || 'Akun Google Anda belum terdaftar.');
      }
    },
    onError: () => setErrorMsg('Login Google gagal.')
  });

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.5rem',
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: '0.5rem', color: '#0f172a', fontSize: '0.875rem',
    outline: 'none', transition: 'border-color 0.2s, background 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
      backgroundSize: '28px 28px',
      padding: '1.5rem',
      boxSizing: 'border-box',
    }}>

      {/* Card wrapper */}
      <div style={{
        width: '100%',
        maxWidth: '820px',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        display: 'flex',
        boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        minHeight: '480px',
      }}>

        {/* LEFT PANEL — ocean video */}
        <div style={{
          flex: '0 0 42%',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background video — pure, no overlay */}
          <video autoPlay loop muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
            <source src="/bg-ocean.mp4" type="video/mp4" />
          </video>

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                <Anchor size={20} color="#fff" />
              </div>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>OceanSmart</span>
            </div>
          </div>

          {/* Bottom text */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ color: '#fff', fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.3, marginBottom: '0.75rem', margin: '0 0 0.75rem' }}>
              Marine Intelligence<br/>Platform.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
              Memantau ekosistem laut Indonesia secara real-time dengan teknologi sensor IoT, AI, dan Digital Twin 3D.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL — form */}
        <div style={{
          flex: 1,
          background: '#ffffff',
          padding: '2.5rem 2.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>

          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.375rem' }}>
              Login Admin
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Silakan masuk untuk mengelola platform OceanSmart
            </p>
          </div>

          {successMsg && (
            <div style={{ padding: '0.6rem 0.875rem', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '0.5rem', color: '#15803d', fontSize: '0.8125rem', marginBottom: '1rem', fontWeight: 500 }}>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ padding: '0.6rem 0.875rem', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.8125rem', marginBottom: '1rem', fontWeight: 500 }}>
              {errorMsg.includes('belum terdaftar')
                ? <><span>Akun Google Anda belum terdaftar. </span><a href="/register" style={{ color: '#b91c1c', fontWeight: 700 }}>Daftar di sini</a></>
                : errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text" required autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin atau admin@oceansmart.id"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#475569', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  onFocus={e => { e.target.style.borderColor = '#0077b6'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#0077b6', cursor: 'pointer' }} />
                Ingat Saya
              </label>
              <button type="button"
                onClick={() => setShowForgotModal(true)}
                style={{ background: 'none', border: 'none', color: '#0077b6', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Lupa Password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading}
              style={{
                width: '100%', padding: '0.75rem',
                background: 'linear-gradient(135deg, #023e8a, #0077b6)',
                border: 'none', borderRadius: '0.5rem', color: '#fff',
                fontSize: '0.9375rem', fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 12px rgba(0,119,182,0.35)',
                opacity: isLoading ? 0.85 : 1,
                transition: 'opacity 0.2s, box-shadow 0.2s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!isLoading) e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,119,182,0.45)'; }}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,119,182,0.35)'}
            >
              {isLoading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : <><span>Masuk Dashboard</span><LogIn size={16} /></>
              }
            </button>
          </form>

          {/* Divider + Google */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.125rem 0 0.875rem' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>atau</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          <button onClick={() => loginWithGoogle()} type="button"
            style={{
              width: '100%', padding: '0.65rem',
              background: '#fff', border: '1.5px solid #e2e8f0',
              borderRadius: '0.5rem', color: '#334155',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Masuk dengan Google
          </button>

          {/* Footer links */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <a href="/register" style={{ fontSize: '0.8125rem', color: '#64748b', textDecoration: 'none' }}>
              Belum punya akun? <span style={{ color: '#0077b6', fontWeight: 700 }}>Daftar</span>
            </a>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: '#64748b', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0077b6'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
              <Home size={14} /> Beranda
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .login-left { display: none !important; }
        }
      `}</style>
      {showForgotModal && <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />}
    </div>
  );
}
