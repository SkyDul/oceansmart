import { Link } from 'react-router-dom';
import '@google/model-viewer';
import botModel from '../assets/models/Fish by Quaternius - ypEYhCImAB.glb';
import { ArrowRight, Shield, Activity, Globe, Anchor, Camera, Cpu, Users, Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api';

export default function LandingPage({ onDemoLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState({
    totalZones: 4,
    totalReadings: 87360,
    totalBiota: 12,
    uptime: 99.9
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/summary');
        const data = response.data;
        
        const sensorUptime = data.total_sensors > 0
          ? ((data.online_sensors / data.total_sensors) * 100).toFixed(1)
          : '99.9';

        setStats({
          totalZones: data.total_zones || 4,
          totalReadings: data.total_readings || 87360,
          totalBiota: data.total_biota || 12,
          uptime: parseFloat(sensorUptime)
        });
      } catch (error) {
        console.error('Gagal memuat statistik landing page:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num, isPercentage = false) => {
    if (isPercentage) {
      return `${num}%`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M+`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K+`;
    }
    return `${num}+`;
  };

  return (
    <div style={{ minHeight: '100vh', color: '#1d1d1f', overflowX: 'hidden', backgroundColor: '#fcfcfd', position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      
      {/* 1. Navigation */}
      <nav style={{ 
        position: 'fixed', 
        top: 0, left: 0, right: 0, 
        zIndex: 50, 
        background: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent', 
        backdropFilter: scrolled ? 'blur(20px)' : 'none', 
        borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.02)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
      }}>
        <div className="nav-container" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: scrolled ? '0.75rem 2rem' : '1.25rem 2rem',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            letterSpacing: '-0.02em', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            color: scrolled ? '#0f172a' : '#ffffff',
            transition: 'color 0.3s'
          }}>
            <Anchor size={20} color={scrolled ? "#023e8a" : "#ffffff"} style={{ transition: 'color 0.3s' }} />
            <span>OceanSmart</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link 
              to="/login" 
              style={{ 
                color: scrolled ? '#515154' : 'rgba(255, 255, 255, 0.85)', 
                fontSize: '0.875rem', 
                fontWeight: 500, 
                textDecoration: 'none', 
                transition: 'color 0.2s' 
              }} 
              onMouseEnter={e => e.target.style.color = scrolled ? '#023e8a' : '#ffffff'} 
              onMouseLeave={e => e.target.style.color = scrolled ? '#515154' : 'rgba(255, 255, 255, 0.85)'}
            >
              Masuk
            </Link>
            <Link 
              to="/dashboard" 
              onClick={onDemoLogin} 
              style={{ 
                background: scrolled ? '#023e8a' : '#ffffff', 
                color: scrolled ? '#ffffff' : '#023e8a', 
                border: 'none', 
                padding: '0.5rem 1.25rem', 
                borderRadius: '7px', 
                fontSize: '0.875rem',
                fontWeight: 600, 
                textDecoration: 'none', 
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: scrolled ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'
              }} 
              onMouseEnter={e => {
                if (scrolled) {
                  e.target.style.background = '#0077b6';
                } else {
                  e.target.style.background = '#f5f5f7';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }} 
              onMouseLeave={e => {
                if (scrolled) {
                  e.target.style.background = '#023e8a';
                } else {
                  e.target.style.background = '#ffffff';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              Mulai Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Immersive Hero Banner (Apple TV+ Inspired) */}
      <section style={{ 
        position: 'relative', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#090a0f'
      }}>
        {/* Background Looping Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.8
          }}
        >
          <source src="/bg-ocean.mp4" type="video/mp4" />
        </video>
        
        {/* Ambient Dark Overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0.7) 100%)',
          zIndex: 1
        }} />

        {/* Hero Content Block */}
        <div style={{ 
          position: 'relative', 
          zIndex: 2, 
          textAlign: 'center', 
          maxWidth: '800px', 
          padding: '0 1.5rem', 
          color: '#ffffff',
          animation: 'fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <h1 className="hero-title" style={{ 
            fontSize: '4.5rem', 
            fontWeight: 800, 
            lineHeight: 1.1, 
            marginBottom: '1.25rem', 
            letterSpacing: '-0.04em',
            color: '#ffffff',
            fontFamily: '"Poppins", sans-serif',
            textShadow: '0 2px 10px rgba(0,0,0,0.15)'
          }}>
            Intelligent Ocean <br/>
            Monitoring Platform.
          </h1>
          <p className="hero-subtitle" style={{ 
            fontSize: '1.25rem', 
            color: 'rgba(255, 255, 255, 0.85)', 
            marginBottom: '2.5rem', 
            lineHeight: 1.6, 
            fontWeight: 400,
            maxWidth: '620px',
            margin: '0 auto 2.5rem',
            textShadow: '0 1px 4px rgba(0,0,0,0.2)'
          }}>
            Memadukan kekuatan <b>Sensor IoT</b>, <b>AI Gemini</b>, dan <b>Digital Twin 3D</b> untuk pemantauan kesehatan terumbu karang secara real-time.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link 
              to="/dashboard" 
              onClick={onDemoLogin} 
              style={{ 
                background: '#ffffff', 
                color: '#023e8a', 
                padding: '0.8rem 2rem', 
                borderRadius: '7px', 
                fontWeight: 700, 
                textDecoration: 'none', 
                fontSize: '0.9375rem', 
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#f5f5f7'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#ffffff'; }}
            >
              Mulai Demo Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Product Showcase - OceanBot (Apple Style) */}
      <section style={{ 
        padding: '6rem 2rem', 
        background: '#fbfbfd',
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        borderBottom: '1px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}>
        <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem', maxWidth: '600px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: '0.5rem' }}>
              INTERACTIVE MASCOT
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Kenalkan CeanBot.
            </h2>
            <p style={{ color: '#515154', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
              Asisten robotik virtual 3D Anda. Membantu memvisualisasikan kualitas perairan langsung dari platform web.
            </p>
          </div>

          {/* 3D Mascot Floating */}
          <div style={{ 
            width: '100%',
            maxWidth: '540px',
            height: 380, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative'
          }}>
            <model-viewer
              src={botModel}
              autoplay
              animation-name="CharacterArmature|Wave"
              camera-controls
              touch-action="pan-y"
              interaction-prompt="none"
              ar={false}
              shadow-intensity="1.5"
              shadow-softness="0.8"
              exposure="1.2"
              style={{ width: '100%', height: '100%', background: 'transparent', '--progress-bar-height': '0px' }}
            />
          </div>
        </div>
      </section>

      {/* 4. Statistic Section */}
      <section style={{ 
        padding: '5rem 2rem', 
        position: 'relative', 
        overflow: 'hidden',
        background: '#090a0f',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Background Looping Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.75
          }}
        >
          <source src="/bg-ocean.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay for contrast */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, rgba(9,10,15,0.3) 0%, rgba(9,10,15,0.5) 100%)',
          zIndex: 1
        }} />

        <div className="stats-grid-container" style={{ 
          position: 'relative',
          zIndex: 2,
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          textAlign: 'center',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {[
            { value: formatNumber(stats.totalZones), label: "Wilayah Konservasi" },
            { value: formatNumber(stats.totalReadings), label: "Data Sensor Terkumpul" },
            { value: formatNumber(stats.totalBiota), label: "Spesies Dilindungi" },
            { value: formatNumber(stats.uptime, true), label: "Uptime Sistem" }
          ].map((stat, idx) => (
            <div key={idx} className="stats-item" style={{ 
              padding: '1rem', 
              borderLeft: idx > 0 ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'
            }}>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 800, 
                color: '#ffffff', 
                letterSpacing: '-0.02em',
                marginBottom: '0.25rem',
                fontFamily: '"Poppins", sans-serif',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>{stat.value}</div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: 1,
                fontFamily: '"Poppins", sans-serif'
              }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Features Section */}
      <section style={{ padding: '6rem 2rem', background: '#f8fafc', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: 640, margin: '0 auto 4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#023e8a', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: '0.5rem' }}>
              KAPABILITAS SISTEM
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Teknologi Pemantauan Terpadu
            </h2>
            <p style={{ color: '#515154', fontSize: '1rem', lineHeight: 1.6 }}>
              Inovasi terbaru untuk mendeteksi anomali lingkungan, kualitas air, dan kesehatan terumbu karang sebelum krisis terjadi secara komprehensif.
            </p>
          </div>

          <div className="features-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
            {[
              { icon: <Globe size={22} color="#023e8a" />, title: "Digital Twin 3D", desc: "Representasi virtual laut secara real-time. Memvisualisasikan kondisi ekosistem dari permukaan hingga dasar laut secara interaktif." },
              { icon: <Activity size={22} color="#023e8a" />, title: "IoT Sensor Network", desc: "Ribuan titik sensor mendeteksi parameter krusial seperti suhu, pH, salinitas, dan oksigen terlarut secara nonstop." },
              { icon: <Cpu size={22} color="#023e8a" />, title: "AI Chatbot Gemini", desc: "Asisten cerdas yang menganalisis pola data lingkungan dan menjawab pertanyaan terkait mitigasi dengan cepat." },
              { icon: <Shield size={22} color="#023e8a" />, title: "Peringatan Dini", desc: "Sistem cerdas mendeteksi dini risiko coral bleaching dan anomali, lalu mengirimkan notifikasi instan ke petugas." },
              { icon: <Camera size={22} color="#023e8a" />, title: "Katalog Biota Laut", desc: "Ensiklopedia digital interaktif tentang biota dan spesies yang dilindungi dalam area konservasi laut." },
              { icon: <Users size={22} color="#023e8a" />, title: "Pelaporan Publik", desc: "Masyarakat dapat berpartisipasi melaporkan temuan ikan mati, pencemaran, atau biota terdampar secara langsung." }
            ].map((feature, i) => (
              <div key={i} style={{ 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '1rem', 
                padding: '2rem', 
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)', 
                cursor: 'pointer', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)', 
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }} 
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(0,0,0,0.05)';
              }} 
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
              }}>
                <div style={{ width: 44, height: 44, background: '#f0f9ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1d1d1f', margin: 0 }}>{feature.title}</h3>
                <p style={{ color: '#515154', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Workflow Section */}
      <section style={{ padding: '6rem 2rem', background: '#ffffff', backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '28px 28px', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#023e8a', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: '0.5rem' }}>
              ALUR KERJA SISTEM
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Bagaimana OceanSmart Bekerja?
            </h2>
            <p style={{ color: '#515154', fontSize: '1rem', maxWidth: 540, margin: '0 auto' }}>
              Alur terintegrasi secara seamless dari pendeteksian sensor di dasar laut hingga layar dashboard Anda.
            </p>
          </div>

          <div className="workflow-container" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: '2rem', position: 'relative', width: '100%', boxSizing: 'border-box' }}>
            <div className="workflow-line" style={{ position: 'absolute', top: 24, left: '16.6%', right: '16.6%', height: 1, background: '#cbd5e1', zIndex: 0 }} />
            {[
              { step: "01", title: "Koleksi Data IoT", desc: "Sensor bawah air mencatat kualitas dan parameter air secara presisi setiap detik." },
              { step: "02", title: "Analisis AI", desc: "Data bervolume tinggi diolah untuk menemukan pola dan mendeteksi anomali lingkungan." },
              { step: "03", title: "Tindakan Mitigasi", desc: "Sistem memberikan rekomendasi dan peringatan dini agar tindakan pencegahan segera diambil." }
            ].map((item, idx) => (
              <div key={idx} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  background: '#ffffff', 
                  border: '2px solid #023e8a', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '1rem', 
                  fontWeight: 700, 
                  color: '#023e8a', 
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer style={{ background: '#161617', color: '#86868b', padding: '5rem 2rem 3rem', fontSize: '0.75rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '3rem', marginBottom: '4rem', width: '100%', boxSizing: 'border-box' }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8, color: '#f5f5f7', marginBottom: '1.25rem' }}>
                <Anchor size={18} color="#0077b6" />
                <span>OceanSmart</span>
              </div>
              <p style={{ lineHeight: 1.6, margin: 0, maxWidth: 260 }}>
                Sistem Informasi Data Konservasi Laut Pintar. Menjaga kelestarian perairan nusantara dengan teknologi termutakhir.
              </p>
            </div>
            <div>
              <h4 style={{ color: '#f5f5f7', fontWeight: 600, marginBottom: '1rem', fontSize: '0.8125rem' }}>Layanan Utama</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li><Link to="#" style={{ color: '#86868b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='#86868b'}>Digital Twin</Link></li>
                <li><Link to="#" style={{ color: '#86868b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='#86868b'}>Pemantauan Sensor</Link></li>
                <li><Link to="#" style={{ color: '#86868b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='#86868b'}>Peringatan Dini</Link></li>
                <li><Link to="#" style={{ color: '#86868b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='#86868b'}>Laporan Publik</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#f5f5f7', fontWeight: 600, marginBottom: '1rem', fontSize: '0.8125rem' }}>Informasi</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li><Link to="#" style={{ color: '#86868b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='#86868b'}>Tentang Kami</Link></li>
                <li><Link to="#" style={{ color: '#86868b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='#86868b'}>Berita KKP</Link></li>
                <li><Link to="#" style={{ color: '#86868b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='#86868b'}>Kebijakan Privasi</Link></li>
                <li><Link to="/terms" style={{ color: '#86868b', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='#86868b'}>Syarat & Ketentuan</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom" style={{ borderTop: '1px solid #334155', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', color: '#515154' }}>
            <span>Copyright © 2026 OceanSmart Inc. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="#" style={{ color: '#515154', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#86868b'} onMouseLeave={e => e.target.style.color='#515154'}>Privacy Policy</Link>
              <span>|</span>
              <Link to="/terms" style={{ color: '#515154', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#86868b'} onMouseLeave={e => e.target.style.color='#515154'}>Terms of Use</Link>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .nav-container {
            padding: 0.75rem 1.25rem !important;
          }
          .hero-title {
            font-size: 2.75rem !important;
          }
          .hero-subtitle {
            font-size: 1rem !important;
            margin-bottom: 2rem !important;
          }
          .stats-grid-container {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.5rem !important;
          }
          .stats-item {
            border-left: none !important;
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem 0 !important;
          }
          .stats-item:nth-last-child(-n+2) {
            border-bottom: none !important;
          }
          .features-grid-container {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
          .workflow-container {
            flex-direction: column !important;
            gap: 2.5rem !important;
          }
          .workflow-line {
            display: none !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 2.25rem !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            align-items: center !important;
            gap: 1rem !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
}
