import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Anchor, Mail, Lock, UserPlus, User, CheckCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      await api.post('/register', { nama: name, email, password });
      setIsLoading(false);
      navigate('/login', { state: { message: 'Registrasi berhasil! Silakan masuk.' } });
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.response?.data?.detail || 'Pendaftaran gagal. Coba lagi.');
    }
  };

  const registerWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        await api.post('/register', {
          nama: userInfo.data.name || userInfo.data.given_name,
          email: userInfo.data.email,
          password: 'google_oauth_registered_account',
        });
        setIsLoading(false);
        navigate('/login', { state: { message: 'Registrasi Google berhasil! Silakan masuk menggunakan akun Google Anda.' } });
      } catch (err) {
        setIsLoading(false);
        setErrorMsg(err.response?.data?.detail || 'Registrasi Google gagal. Akun mungkin sudah terdaftar.');
      }
    },
    onError: () => setErrorMsg('Registrasi Google gagal.'),
  });

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.25rem',
    background: '#fff', border: '1px solid #cbd5e1',
    borderRadius: '0.625rem', color: '#0f172a', fontSize: '0.8125rem',
    outline: 'none', transition: 'all 0.3s', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: '#334155', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: 0.5,
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '0.5rem',
      position: 'relative', overflow: 'hidden',
    }} className="bg-dots">

      <div className="light-glass-card" style={{
        width: '100%',
        maxWidth: 900,
        display: 'flex',
        flexDirection: 'row',
        padding: 0,
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>

        {/* Left Branding */}
        <div style={{ flex: 1, background: 'linear-gradient(135deg, #023e8a, #0096c7)', padding: '3rem', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.15)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', backdropFilter: 'blur(10px)' }}>
            <Anchor size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem' }}>Bergabung Sekarang</h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: '2rem' }}>Daftarkan akun pengguna Anda untuk memantau data sensor, menjelajahi peta SIG, dan melindungi laut kita.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              'Pantau kualitas air real-time',
              'Akses katalog biota laut terlengkap',
              'Chat pintar dengan OceanBot AI'
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', fontWeight: 500, color: '#e0f2fe' }}>
                <CheckCircle size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Right Form */}
        <div style={{ flex: '1.2', padding: '3rem', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Daftar Akun Baru</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem' }}>Lengkapi data di bawah untuk membuat akun Anda.</p>

          {errorMsg && (
            <div style={{ padding: '0.6rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Nama Lengkap</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <User size={16} />
                </div>
                <input
                  type="text" required value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Misal: Budi Santoso"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#023e8a'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Alamat Email</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <Mail size={16} />
                </div>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="anda@email.com"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#023e8a'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Kata Sandi</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <Lock size={16} />
                </div>
                <input
                  type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#023e8a'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="btn-interactive"
              style={{
                width: '100%', padding: '0.75rem', marginTop: '0.5rem',
                background: 'linear-gradient(135deg, #023e8a, #0077b6)',
                border: 'none', borderRadius: '0.625rem', color: '#fff',
                fontSize: '0.875rem', fontWeight: 600, cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 12px rgba(2,62,138,0.3)', opacity: isLoading ? 0.8 : 1,
              }}
            >
              {isLoading ? (
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <>Daftar sebagai Pengguna <UserPlus size={16} /></>
              )}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
            <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ATAU</div>
            <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
          </div>

          <button
            onClick={() => registerWithGoogle()}
            className="btn-interactive" type="button"
            style={{
              width: '100%', padding: '0.75rem', background: '#fff',
              border: '1px solid #cbd5e1', borderRadius: '0.625rem', color: '#334155',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Daftar dengan Google
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: '#64748b' }}>
            Sudah punya akun? <Link to="/login" style={{ color: '#023e8a', textDecoration: 'none', fontWeight: 700 }}>Masuk di sini</Link>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
