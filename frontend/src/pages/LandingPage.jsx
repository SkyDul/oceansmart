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
    <div className="bg-dots" style={{ minHeight: '100vh', color: '#0f172a', overflowX: 'hidden', backgroundColor: '#fcfcfd', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(2,132,199,0.04) 0%, transparent 70%)', borderRadius: '50%', zIndex: -1, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(2,62,138,0.03) 0%, transparent 70%)', borderRadius: '50%', zIndex: -1, pointerEvents: 'none' }} />
      
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
            <Anchor size={20} color="#fff" />
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
      <section style={{ paddingTop: '10rem', paddingBottom: '6rem', paddingLeft: '5%', paddingRight: '5%', minHeight: '90vh', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(72,202,228,0.15) 0%, transparent 60%)', borderRadius: '50%', zIndex: 0, animation: 'float 8s ease-in-out infinite' }} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '4rem', width: '100%', alignItems: 'center', zIndex: 1, maxWidth: 1400, margin: '0 auto' }}>
          
          {/* Hero Text */}
          <div style={{ animation: 'fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1)' }}>

            <h1 style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', color: '#0f172a', letterSpacing: '-0.04em' }}>
              Inovasi Terpadu untuk <br/><span style={{ background: 'linear-gradient(135deg, #023e8a, #0096c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ekosistem Laut</span>.
            </h1>
            <p style={{ fontSize: '1.15rem', color: '#475569', marginBottom: '2.5rem', maxWidth: 540, lineHeight: 1.8 }}>
              Memadukan kekuatan <b>Sensor IoT</b>, <b>AI Gemini</b>, dan <b>Digital Twin 3D</b> untuk pemantauan kesehatan terumbu karang dan peringatan dini secara <i>real-time</i>.
            </p>
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
      <section style={{ padding: '4rem 5%', background: 'linear-gradient(135deg, #023e8a 0%, #0077b6 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {[
            { value: "15+", label: "Wilayah Konservasi" },
            { value: "1.2M+", label: "Data Sensor Terkumpul" },
            { value: "45+", label: "Spesies Dilindungi" },
            { value: "99.9%", label: "Uptime Sistem" }
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '2rem 1rem', background: 'rgba(255,255,255,0.06)', borderRadius: '1rem', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.3s ease, background 0.3s ease' }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)';}} onMouseLeave={e => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)';}}>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ffffff', textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Features Section */}
      <section style={{ padding: '7rem 5%', background: '#ffffff', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '20%', width: '60%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(2,132,199,0.2), transparent)' }} />
        
        <div style={{ textAlign: 'center', marginBottom: '5rem', maxWidth: 700, margin: '0 auto 5rem' }}>
          <div style={{ display: 'inline-block', padding: '0.4rem 1.25rem', background: '#f0f9ff', borderRadius: 999, color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: '1.5rem', fontSize: '0.8125rem' }}>Layanan & Fitur Unggulan</div>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>Teknologi Pemantauan Terpadu</h2>
          <p style={{ color: '#64748b', fontSize: '1.125rem', lineHeight: 1.7 }}>Inovasi terbaru untuk mendeteksi anomali lingkungan, kualitas air, dan kesehatan terumbu karang sebelum krisis terjadi secara komprehensif.</p>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem' }}>
          {[
            { icon: <Globe size={26} color="#0ea5e9" />, title: "Digital Twin 3D", desc: "Representasi virtual laut secara real-time. Memvisualisasikan kondisi ekosistem dari permukaan hingga dasar laut." },
            { icon: <Activity size={26} color="#0ea5e9" />, title: "IoT Sensor Network", desc: "Ribuan titik sensor mendeteksi parameter krusial seperti suhu, pH, salinitas, dan oksigen terlarut nonstop." },
            { icon: <Cpu size={26} color="#0ea5e9" />, title: "AI Chatbot Gemini", desc: "Asisten cerdas yang menganalisis pola data lingkungan dan menjawab pertanyaan terkait mitigasi dengan cepat." },
            { icon: <Shield size={26} color="#0ea5e9" />, title: "Peringatan Dini", desc: "Sistem cerdas mendeteksi dini risiko coral bleaching dan anomali, lalu mengirimkan notifikasi ke petugas." },
            { icon: <Camera size={26} color="#0ea5e9" />, title: "Katalog Biota Laut", desc: "Ensiklopedia digital interaktif tentang biota dan spesies yang dilindungi dalam area konservasi." },
            { icon: <Users size={26} color="#0ea5e9" />, title: "Pelaporan Publik", desc: "Masyarakat dapat berpartisipasi melaporkan temuan ikan mati, pencemaran, atau biota terdampar." }
          ].map((feature, i) => (
            <div key={i} style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '1.5rem', padding: '2.5rem 2rem', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(2,132,199,0.15)'; e.currentTarget.style.borderColor = '#e0f2fe';}} onMouseLeave={e => {e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = '#f1f5f9';}}>
              <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>{feature.title}</h3>
              <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Workflow Section */}
      <section style={{ padding: '7rem 5%', background: '#f8fafc', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>Bagaimana OceanSmart Bekerja?</h2>
          <p style={{ color: '#64748b', fontSize: '1.125rem', maxWidth: 600, margin: '0 auto' }}>Alur terintegrasi secara seamless dari pendeteksian sensor di dasar laut hingga layar dashboard Anda.</p>
        </div>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: '3rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 44, left: '15%', right: '15%', height: 2, background: 'linear-gradient(90deg, transparent, #94a3b8, transparent)', zIndex: 0, opacity: 0.5 }} />
          {[
            { step: 1, title: "Koleksi Data IoT", desc: "Sensor bawah air mencatat kualitas dan parameter air secara presisi setiap detik." },
            { step: 2, title: "Analisis AI", desc: "Data bervolume tinggi diolah untuk menemukan pola dan mendeteksi anomali lingkungan." },
            { step: 3, title: "Tindakan Mitigasi", desc: "Sistem memberikan rekomendasi dan peringatan dini agar tindakan pencegahan segera diambil." }
          ].map((item, idx) => (
            <div key={idx} style={{ flex: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 88, height: 88, background: '#fff', border: '4px solid #023e8a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', fontWeight: 800, color: '#023e8a', margin: '0 auto 2rem', boxShadow: '0 12px 25px -5px rgba(2,62,138,0.2)', transition: 'transform 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
                {item.step}
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>{item.title}</h3>
              <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6 }}>{item.desc}</p>
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
                <Anchor size={20} color="#fff" />
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
          © 2026 OceanSmart.
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
