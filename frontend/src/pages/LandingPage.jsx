import { Link } from 'react-router-dom';
import '@google/model-viewer';
import botModel from '../assets/models/bot fish.glb';
import { ArrowRight, Shield, Activity, Globe, Anchor, Camera, Cpu, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LandingPage({ onDemoLogin }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-dots" style={{ minHeight: '100vh', color: '#0f172a', overflowX: 'hidden' }}>
      
      {/* 1. Navigation */}
      <nav style={{ 
        padding: scrolled ? '1rem 5%' : '1.5rem 5%', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        position: 'fixed', 
        top: 0, left: 0, right: 0, 
        zIndex: 50, 
        background: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'transparent', 
        backdropFilter: scrolled ? 'blur(16px)' : 'none', 
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.05)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.02)' : 'none',
        transition: 'all 0.3s ease' 
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, color: '#023e8a' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #023e8a, #0077b6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(2,62,138,0.3)' }}>
            <Globe size={20} color="#fff" />
          </div>
          OceanSmart
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/login" style={{ color: '#64748b', fontWeight: 600, textDecoration: 'none', padding: '0.5rem 1rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#023e8a'} onMouseLeave={e => e.target.style.color='#64748b'}>
            Masuk
          </Link>
          <Link to="/dashboard" onClick={onDemoLogin} style={{ background: 'linear-gradient(135deg, #023e8a, #0077b6)', color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: 999, fontWeight: 600, boxShadow: '0 4px 15px rgba(2,62,138,0.3)', textDecoration: 'none', transition: 'all 0.3s' }} onMouseEnter={e => {e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 6px 20px rgba(2,62,138,0.5)'}} onMouseLeave={e => {e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 4px 15px rgba(2,62,138,0.3)'}}>
            Mulai Demo
          </Link>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section style={{ paddingTop: '8rem', paddingBottom: '4rem', paddingLeft: '5%', paddingRight: '5%', minHeight: '90vh', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -100, left: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(72,202,228,0.2) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '3rem', width: '100%', alignItems: 'center', zIndex: 1, maxWidth: 1400, margin: '0 auto' }}>
          
          {/* Hero Text */}
          <div style={{ animation: 'fadeInUp 0.8s ease-out' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.4rem 1.25rem', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: 999, color: '#0284c7', fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              SISTEM INFORMASI DATA KONSERVASI
            </div>
            <h1 style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', color: '#0f172a', letterSpacing: '-0.03em' }}>
              Inovasi Cerdas untuk <span style={{ color: '#023e8a' }}>Ekosistem Laut</span> Masa Depan.
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#475569', marginBottom: '2.5rem', maxWidth: 540, lineHeight: 1.7 }}>
              Memadukan kekuatan <b>Sensor IoT</b>, <b>AI Gemini</b>, dan <b>Digital Twin 3D</b> untuk pemantauan kesehatan terumbu karang dan peringatan dini secara <i>real-time</i>.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link to="/login" style={{ background: '#023e8a', padding: '1rem 2.5rem', fontSize: '1.0625rem', fontWeight: 600, borderRadius: 999, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 25px rgba(2,62,138,0.4)', transition: 'all 0.3s' }} onMouseEnter={e => {e.target.style.transform='translateY(-3px)'; e.target.style.boxShadow='0 12px 30px rgba(2,62,138,0.6)'}} onMouseLeave={e => {e.target.style.transform='translateY(0)'; e.target.style.boxShadow='0 8px 25px rgba(2,62,138,0.4)'}}>
                Masuk ke Dashboard <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          {/* Hero 3D Mascot - OceanBot, bebas di atas bg polkadot */}
          <div style={{ position: 'relative', height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <model-viewer
              src={botModel}
              autoplay
              animation-name="Wave"
              camera-controls
              touch-action="pan-y"
              interaction-prompt="none"
              ar={false}
              shadow-intensity="1"
              shadow-softness="1"
              exposure="1.4"
              style={{ width: '100%', height: '100%', background: 'transparent', '--progress-bar-height': '0px' }}
            />
          </div>


        </div>
      </section>

      {/* 3. Statistic Section */}
      <section style={{ padding: '3rem 5%', background: '#023e8a', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          {[
            { value: "15+", label: "Wilayah Konservasi" },
            { value: "1.2M+", label: "Data Sensor Terkumpul" },
            { value: "45+", label: "Spesies Dilindungi" },
            { value: "99.9%", label: "Uptime Sistem" }
          ].map((stat, idx) => (
            <div key={idx}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem', color: '#48cae4' }}>{stat.value}</div>
              <div style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Features Section */}
      <section style={{ padding: '6rem 5%', background: '#fff', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: 650, margin: '0 auto 4rem' }}>
          <div style={{ color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: '1rem', fontSize: '0.875rem' }}>Layanan & Fitur Unggulan</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Teknologi Pemantauan Terpadu</h2>
          <p style={{ color: '#64748b', fontSize: '1.125rem', lineHeight: 1.6 }}>Inovasi terbaru untuk mendeteksi anomali lingkungan, kualitas air, dan kesehatan terumbu karang sebelum krisis terjadi.</p>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          {[
            { icon: <Globe size={28} color="#0284c7" />, title: "Digital Twin 3D", desc: "Representasi virtual laut secara real-time. Memvisualisasikan kondisi ekosistem dari permukaan hingga dasar laut." },
            { icon: <Activity size={28} color="#0284c7" />, title: "IoT Sensor Network", desc: "Ribuan titik sensor mendeteksi parameter krusial seperti suhu, pH, salinitas, dan oksigen terlarut nonstop." },
            { icon: <Cpu size={28} color="#0284c7" />, title: "AI Chatbot Gemini", desc: "Asisten cerdas yang menganalisis pola data lingkungan dan menjawab pertanyaan terkait mitigasi dengan cepat." },
            { icon: <Shield size={28} color="#0284c7" />, title: "Peringatan Dini", desc: "Sistem cerdas mendeteksi dini risiko coral bleaching dan anomali, lalu mengirimkan notifikasi ke petugas." },
            { icon: <Camera size={28} color="#0284c7" />, title: "Katalog Biota Laut", desc: "Ensiklopedia digital interaktif tentang biota dan spesies yang dilindungi dalam area konservasi." },
            { icon: <Users size={28} color="#0284c7" />, title: "Pelaporan Publik", desc: "Masyarakat dapat berpartisipasi melaporkan temuan ikan mati, pencemaran, atau biota terdampar." }
          ].map((feature, i) => (
            <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1.5rem', padding: '2rem', transition: 'all 0.3s', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#bae6fd'}} onMouseLeave={e => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e2e8f0'}}>
              <div style={{ width: 56, height: 56, background: '#e0f2fe', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>{feature.title}</h3>
              <p style={{ color: '#475569', fontSize: '0.9375rem', lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Workflow Section */}
      <section style={{ padding: '6rem 5%', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Bagaimana OceanSmart Bekerja?</h2>
          <p style={{ color: '#64748b', fontSize: '1.125rem' }}>Alur terintegrasi dari sensor di laut hingga layar dashboard Anda.</p>
        </div>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: '2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 40, left: 50, right: 50, height: 2, background: '#cbd5e1', zIndex: 0 }} />
          {[
            { step: 1, title: "Koleksi Data IoT", desc: "Sensor bawah air mencatat kualitas air setiap detik." },
            { step: 2, title: "Analisis AI", desc: "Data diolah untuk mencari anomali lingkungan." },
            { step: 3, title: "Tindakan Mitigasi", desc: "Peringatan dikirim agar tindakan pencegahan segera dilakukan." }
          ].map((item, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 80, height: 80, background: '#fff', border: '4px solid #023e8a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#023e8a', margin: '0 auto 1.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                {item.step}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ color: '#64748b', fontSize: '0.9375rem', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Footer */}
      <footer style={{ background: '#0f172a', color: '#cbd5e1', padding: '4rem 5% 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, color: '#fff', marginBottom: '1.5rem' }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #48cae4, #0096c7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={20} color="#fff" />
              </div>
              OceanSmart
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Sistem Informasi Data Konservasi Laut Pintar. Menjaga kelestarian perairan nusantara dengan teknologi termutakhir.</p>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: '1.25rem' }}>Layanan Utama</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Digital Twin</Link></li>
              <li><Link to="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Pemantauan Sensor</Link></li>
              <li><Link to="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Peringatan Dini</Link></li>
              <li><Link to="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Laporan Publik</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: '1.25rem' }}>Informasi</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link to="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Tentang Kami</Link></li>
              <li><Link to="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Berita KKP</Link></li>
              <li><Link to="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Kebijakan Privasi</Link></li>
              <li><Link to="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>Syarat & Ketentuan</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: '1.25rem' }}>Kontak</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ color: '#94a3b8' }}>Gedung Mina Bahari, Jakarta Pusat</li>
              <li style={{ color: '#94a3b8' }}>cs@oceansmart.id</li>
              <li style={{ color: '#94a3b8' }}>(021) 1234-5678</li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #334155', paddingTop: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          © 2026 OceanSmart Conservation. Terinspirasi dari portal SIDAKO. All Rights Reserved.
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(14, 165, 233, 0); }
          100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
        }
      `}</style>
    </div>
  );
}
