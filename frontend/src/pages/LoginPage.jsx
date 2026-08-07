import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, Anchor, CheckCircle, Eye, EyeOff, AlertCircle, Home } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import api from '../api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedEmail = localStorage.getItem('ocean_remembered_email');
    const savedPassword = localStorage.getItem('ocean_remembered_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const successMsg = location.state?.message || '';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/login', { email, password });
      setIsLoading(false);
      
      // Store user details in localStorage
      localStorage.setItem('ocean_user', JSON.stringify({ 
        name: res.data.name, 
        email: res.data.email 
      }));
      
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
        
        // Verify google email in our DB
        const res = await api.post('/login/google', {
          email: userInfo.data.email,
          nama: userInfo.data.name || userInfo.data.given_name,
          google_id: userInfo.data.sub
        });
        
        setIsLoading(false);
        localStorage.setItem('ocean_user', JSON.stringify(userInfo.data));
        onLogin(res.data.role, res.data.wilayah, res.data.provinsi);
        navigate('/dashboard');
      } catch (err) {
        setIsLoading(false);
        setErrorMsg(err.response?.data?.detail || 'Akun Google Anda belum terdaftar. Daftar di sini');
      }
    },
    onError: (error) => {
      console.log('Login Failed:', error);
      setErrorMsg('Login Google gagal.');
    }
  });

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }} className="bg-dots">
      
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#ffffff',
        borderRadius: '1rem',
        padding: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ width: 40, height: 40, background: '#e0f2fe', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Anchor size={20} color="#023e8a" />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.1rem', textAlign: 'center' }}>OceanSmart</h1>
          <p style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>Portal Konservasi Laut Cerdas</p>
        </div>

        {successMsg && (
          <div style={{ padding: '0.5rem', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '0.375rem', color: '#15803d', fontSize: '0.75rem', marginBottom: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '0.5rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.375rem', color: '#b91c1c', fontSize: '0.75rem', marginBottom: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
            {errorMsg.includes('belum terdaftar') ? (
              <>
                Akun Google Anda belum terdaftar. <a href="/register" style={{ color: '#b91c1c', fontWeight: 700, textDecoration: 'underline' }}>Daftar di sini</a>
              </>
            ) : (
              errorMsg
            )}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Email atau Username
            </label>
            <input 
              type="text" 
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin atau admin@oceansmart.id"
              style={{
                width: '100%', padding: '0.6rem 0.75rem', 
                background: '#fff', border: '1px solid #cbd5e1', 
                borderRadius: '0.375rem', color: '#0f172a', fontSize: '0.8125rem',
                outline: 'none', transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#023e8a'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Kata Sandi
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '0.6rem 2.25rem 0.6rem 0.75rem', 
                  background: '#fff', border: '1px solid #cbd5e1', 
                  borderRadius: '0.375rem', color: '#0f172a', fontSize: '0.8125rem',
                  outline: 'none', transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = '#023e8a'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#023e8a' }} 
              /> Ingat saya
            </label>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); alert("Silakan hubungi administrator di admin@oceansmart.id untuk mereset kata sandi Anda."); }}
              style={{ color: '#023e8a', textDecoration: 'none', fontWeight: 600 }}
            >
              Lupa sandi?
            </a>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              width: '100%', padding: '0.65rem', marginTop: '0.25rem',
              background: '#023e8a',
              border: 'none', borderRadius: '0.375rem', color: '#fff',
              fontSize: '0.8125rem', fontWeight: 600, cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              opacity: isLoading ? 0.8 : 1
            }}
          >
            {isLoading ? (
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <>Masuk ke Dashboard <LogIn size={14} /></>
            )}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.85rem 0' }}>
          <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ATAU</div>
          <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
        </div>

        <button 
          onClick={() => loginWithGoogle()}
          type="button"
          style={{
            width: '100%', padding: '0.65rem',
            background: '#fff',
            border: '1px solid #cbd5e1', 
            borderRadius: '0.375rem', color: '#334155',
            fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Masuk dengan Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
          Belum punya akun? <a href="/register" style={{ color: '#023e8a', textDecoration: 'none', fontWeight: 700 }}>Daftar di sini</a>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
          <a 
            href="/" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              color: '#64748b', 
              textDecoration: 'none', 
              fontSize: '0.75rem', 
              fontWeight: 500,
              transition: 'color 0.2s' 
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#023e8a'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <Home size={14} />
            <span>Kembali ke Beranda</span>
          </a>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
