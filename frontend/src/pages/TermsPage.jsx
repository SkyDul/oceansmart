import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle, Scale, FileText, Globe } from 'lucide-react';
import { useEffect } from 'react';

export default function TermsPage() {
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: '"Poppins", sans-serif',
      padding: '4rem 1.5rem 6rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Navigation & Back Link */}
        <Link to="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: '#023e8a',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          marginBottom: '2.5rem',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-4px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
        >
          <ArrowLeft size={16} />
          Kembali ke Beranda
        </Link>

        {/* Header Section */}
        <div style={{
          background: 'linear-gradient(135deg, #023e8a 0%, #0077b6 100%)',
          borderRadius: '1.5rem',
          padding: '3rem 2.5rem',
          color: '#ffffff',
          marginBottom: '3rem',
          boxShadow: '0 10px 25px -5px rgba(2, 62, 138, 0.15), 0 8px 10px -6px rgba(2, 62, 138, 0.1)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: '0.4rem 1rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            <Shield size={14} /> Dokumen Resmi
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '1rem',
            letterSpacing: '-0.02em'
          }}>
            Syarat & Ketentuan Penggunaan
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            margin: 0
          }}>
            Terakhir diperbarui: 7 Agustus 2026. Harap baca ketentuan penggunaan platform OceanSmart dengan saksama sebelum mengakses layanan kami.
          </p>
        </div>

        {/* Content Section */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.5rem',
          padding: '3rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03)',
          border: '1px solid #e2e8f0',
          lineHeight: '1.8',
          fontSize: '0.9375rem',
          color: '#334155'
        }}>
          
          {/* Section 1 */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{
                width: 32, height: 32,
                backgroundColor: '#e0f2fe',
                color: '#023e8a',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700
              }}>1</span>
              Penerimaan Ketentuan
            </h2>
            <p style={{ margin: 0 }}>
              Dengan mengakses, mendaftar, atau menggunakan platform <strong>OceanSmart</strong>, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat oleh seluruh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui bagian mana pun dari ketentuan ini, Anda tidak diperkenankan untuk menggunakan layanan kami.
            </p>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{
                width: 32, height: 32,
                backgroundColor: '#e0f2fe',
                color: '#023e8a',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700
              }}>2</span>
              Akurasi & Hak Data Sensor
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Platform OceanSmart menyajikan data telemetri laut real-time yang diperoleh melalui sensor IoT yang dipasang di berbagai titik wilayah konservasi perairan Indonesia.
            </p>
            <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
              <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <CheckCircle size={16} color="#0077b6" style={{ marginTop: 6, flexShrink: 0 }} />
                <span>Data sensor disediakan "apa adanya" bertujuan untuk kepentingan riset, monitoring ekosistem, dan pelestarian lingkungan.</span>
              </li>
              <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <CheckCircle size={16} color="#0077b6" style={{ marginTop: 6, flexShrink: 0 }} />
                <span>Pengguna dilarang memanipulasi, memalsukan, atau merusak transmisi data sensor IoT baik secara langsung maupun melalui injeksi API ilegal.</span>
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{
                width: 32, height: 32,
                backgroundColor: '#e0f2fe',
                color: '#023e8a',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700
              }}>3</span>
              Akun Pengguna & Kewajiban Operator
            </h2>
            <p style={{ margin: 0 }}>
              Setiap operator atau admin bertanggung jawab penuh untuk menjaga kerahasiaan kredensial akun login mereka (`username` dan `password`). Aktivitas apa pun yang dilakukan di bawah akun terdaftar Anda dianggap sebagai tanggung jawab penuh Anda. Platform berhak menangguhkan akun jika terdeteksi aktivitas mencurigakan yang melanggar hukum.
            </p>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{
                width: 32, height: 32,
                backgroundColor: '#e0f2fe',
                color: '#023e8a',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700
              }}>4</span>
              Batasan Tanggung Jawab
            </h2>
            <p style={{ margin: 0 }}>
              OceanSmart tidak bertanggung jawab atas kerugian materiil maupun immateriil yang disebabkan oleh ketidakakuratan data seketika akibat kerusakan fisik sensor di laut, gangguan cuaca ekstrem, atau keterlambatan jaringan satelit/internet dalam mengirimkan data sensor.
            </p>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: '0rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{
                width: 32, height: 32,
                backgroundColor: '#e0f2fe',
                color: '#023e8a',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700
              }}>5</span>
              Perubahan Ketentuan
            </h2>
            <p style={{ margin: 0 }}>
              Kami berhak untuk mengubah atau mengganti Syarat & Ketentuan ini kapan saja. Perubahan akan berlaku segera setelah dipublikasikan pada halaman ini. Melanjutkan penggunaan platform setelah adanya perubahan constitutes penerimaan Anda terhadap ketentuan baru tersebut.
            </p>
          </div>

        </div>

        {/* Footer info */}
        <div style={{
          textAlign: 'center',
          marginTop: '3rem',
          color: '#64748b',
          fontSize: '0.8125rem'
        }}>
          Copyright © 2026 OceanSmart Inc. Hak Cipta Dilindungi Undang-Undang.
        </div>
      </div>
    </div>
  );
}
