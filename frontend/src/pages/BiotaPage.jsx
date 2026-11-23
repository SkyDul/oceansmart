import { useState, useEffect, useRef } from 'react';
import { Fish, Search, Anchor, Shield, Compass, Sparkles, X } from 'lucide-react';
import '@google/model-viewer';
import api from '../api';
import { MODEL_MAP } from '../constants/biotaModels';

const FUN_FACTS = {
  'Ikan Badut (Nemo)': 'Ikan badut memiliki lapisan lendir khusus di kulitnya yang membuatnya kebal terhadap sengatan tentakel anemon laut yang beracun bagi ikan lain.',
  'Ikan Kepe-kepe': 'Ikan kepe-kepe adalah indikator alami kesehatan terumbu karang — jika populasinya menurun, artinya terumbu karang sedang mengalami stres atau kerusakan.',
  'Penyu Hijau': 'Penyu hijau dapat menahan napas hingga 5 jam di bawah air dengan memperlambat detak jantungnya hingga 1 detak per beberapa menit!',
  'Ikan Buntal': 'Saat merasa terancam, ikan buntal menelan air atau udara hingga tubuhnya mengembang 3 kali lipat. Organ dalamnya mengandung racun tetrodotoksin yang sangat berbahaya.',
  'Bintang Laut Biru': 'Bintang laut biru tidak memiliki otak maupun darah! Mereka menggunakan sistem pembuluh air laut untuk bergerak dan mampu menumbuhkan kembali lengannya yang putus.',
  'Hiu Karang Sirip Hitam': 'Hiu karang sirip hitam bisa berenang di perairan sangat dangkal hingga 30 cm dan membantu menjaga keseimbangan ekosistem dengan memangsa ikan yang sakit.',
  'Kuda Laut Pygmy': 'Berukuran kurang dari 2 cm, kuda laut pygmy adalah master kamuflase laut — dan uniknya, kuda laut jantan-lah yang mengandung dan melahirkan anak-anaknya.',
  'Ikan Napoleon': 'Ikan Napoleon adalah pemakan bintang laut berduri (Crown-of-Thorns) yang merusak karang, sehingga keberadaannya sangat penting sebagai pelindung terumbu karang.',
  'Ubur-ubur Kotak': 'Ubur-ubur kotak memiliki 24 mata yang tersusun dalam 4 kelompok, memungkinkannya melihat 360 derajat dan berenang aktif menghindari rintangan.',
  'Pari Manta': 'Pari manta memiliki rasio otak terbesar dibanding ukuran tubuh di antara semua jenis ikan, dan pola bintik di perutnya unik seperti sidik jari manusia.',
  'Ikan Tuna': 'Ikan tuna harus terus berenang tanpa henti sepanjang hidupnya agar air laut terus mengalir melewati insangnya untuk bernapas (ram ventilation).',
  'Gurita Cincin Biru': 'Meski ukurannya seukuran bola golf, gurita cincin biru membawa racun yang cukup kuat dan cincin birunya hanya menyala terang saat ia merasa terancam.',
  'Ikan Mas': 'Ikan mas memiliki memori yang jauh lebih baik dari mitos 3 detik — penelitian membuktikan mereka dapat mengingat pola dan suara hingga berbulan-bulan.',
  'Ikan Sebelah (Halibut)': 'Saat menetas, ikan sebelah memiliki mata di kedua sisi kepala seperti ikan biasa, lalu salah satu matanya perlahan berpindah ke sisi yang sama saat dewasa!',
  'Hiu Banteng': 'Hiu banteng adalah salah satu dari sedikit spesies hiu yang mampu hidup baik di air laut yang asin maupun berenang jauh ke sungai air tawar.',
  'Lobster Mutiara': 'Lobster mutiara berkomunikasi dan menakuti predator dengan menggesekkan pangkal antenanya hingga menghasilkan suara getaran seperti biola di bawah air.',
  'Ikan Todak': 'Ikan todak memiliki organ khusus di dekat matanya yang memanaskan otak dan mata hingga 15°C lebih hangat dari air laut sekitar agar penglihatannya tetap tajam di laut dalam.',
  'Ikan Sungut Ganda (Anglerfish)': 'Di kegelapan laut dalam tanpa cahaya matahari, anglerfish betina memancarkan cahaya bioluminesensi dari sungut di kepalanya hasil simbiosis dengan bakteri bercahaya.',
  'Kerapu Sunu (Coral Grouper)': 'Kerapu sunu mampu mengubah warna tubuhnya dalam hitungan detik untuk berkamuflase atau memberi sinyal kepada belut moray saat berburu bersama di terumbu karang.',
  'Lumba-lumba Botol': 'Lumba-lumba tidur dengan hanya setengah bagian otaknya saja yang beristirahat, sementara setengah lainnya tetap terjaga untuk bernapas dan waspada predator.',
  'Ikan Kembung': 'Ikan kembung lokal Indonesia memiliki kandungan Omega-3 yang bahkan lebih tinggi dibandingkan ikan salmon impor!',
  'Hiu Goblin': 'Dijuluki fosil hidup yang telah ada sejak 125 juta tahun lalu, hiu goblin dapat melontarkan rahangnya ke depan secepat kilat untuk menyambar mangsa.',
  'Ikan Gramma Kerajaan': 'Ikan gramma kerajaan sering berenang terbalik mengikuti kontur langit-langit gua karang agar tetap merasa aman dari predator.',
  'Bulu Babi': 'Bulu babi berjalan menggunakan ratusan kaki tabung kecil di antara durinya dan berperan penting memakan alga berlebih agar terumbu karang tidak tertutup lumut.',
  'Ikan Turbot': 'Ikan turbot mampu mengubah pola dan warna kulitnya menyerupai pasir atau kerikil dasar laut hanya dalam beberapa menit berkat sel pigmen kromatofora.',
  'Paus Biru': 'Paus biru adalah hewan terbesar yang pernah hidup di Bumi — lidahnya saja seberat seekor gajah, dan suaranya dapat terdengar hingga ratusan kilometer di bawah laut.',
  'Dugong (Sapi Laut)': 'Dugong adalah satu-satunya mamalia laut herbivora murni di Indonesia dan menjadi inspirasi legenda "Putri Duyung" oleh para pelaut zaman dahulu!',
  'Kepiting Bakau': 'Kepiting bakau dapat menumbuhkan kembali capit atau kakinya yang putus saat proses pergantian kulit (molting) dan berperan menggemburkan tanah hutan mangrove.',
  'Kima Raksasa': 'Kima raksasa bisa hidup lebih dari 100 tahun dan beratnya mencapai 200 kg! Mereka bersimbiosis dengan alga mikroskopis di mantelnya yang berwarna biru-hijau neon.',
  'Anjing Laut': 'Anjing laut bisa tidur di dalam air maupun mengapung vertikal seperti botol, dan kumisnya (vibrissae) mampu mendeteksi jejak pusaran air ikan hingga jarak 100 meter!',
  'Ikan Lepu Ayam (Lionfish)': 'Meski terlihat indah seperti kipas, 18 duri di punggung dan sirip lionfish mengandung bisa beracun yang dapat menyebabkan nyeri hebat bila tersentuh nelayan atau penyelam!',
  'Penyu Sisik': 'Penyu sisik berperan menjaga kesehatan karang karena makanannya adalah spons laut beracun yang jika dibiarkan akan menumbuhi dan mencekik terumbu karang.',
  'Ikan Tenggiri': 'Ikan tenggiri dapat melompat keluar dari permukaan air hingga beberapa meter saat mengejar mangsa dan mampu berenang sangat cepat di arus laut terbuka.',
  'Ikan Botana Biru (Blue Tang)': 'Ikan botana biru memiliki duri tajam seperti pisau bedah di pangkal ekornya untuk pertahanan diri — jika merasa terancam, tubuhnya juga menjadi semi-transparan di malam hari!',
};

const BiotaModelViewer = ({ src }) => {
  const viewerRef = useRef(null);
  const [animations, setAnimations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleLoad = () => {
      if (viewer.availableAnimations && viewer.availableAnimations.length > 0) {
        setAnimations(viewer.availableAnimations);
      }
    };

    viewer.addEventListener('load', handleLoad);
    return () => viewer.removeEventListener('load', handleLoad);
  }, []);

  useEffect(() => {
    if (animations.length > 1) {
      // Ganti animasi tiap 6 detik agar terlihat natural dan sistematis
      const timer = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % animations.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [animations]);

  return (
    <model-viewer
      ref={viewerRef}
      src={src}
      loading="lazy"
      auto-rotate
      autoplay
      animation-name={animations.length > 0 ? animations[currentIndex] : undefined}
      camera-controls
      shadow-intensity="1"
      style={{ width: '100%', height: '100%', background: '#d8e2ff' }}
    ></model-viewer>
  );
};

const DEPTH_ZONES = ['Semua', '0-5m', '5-15m', '15-30m', '0-15m', '5-30m'];
const BIOTA_ICONS = ['🐟', '🐠', '🐢', '🪸', '⭐', '🦈', '🐡', '🐙', '🎐', '🦑', '🐚', '🐋'];

const statusColors = {
  'Least Concern': { bg: '#dcfce7', color: '#16a34a' },
  'Near Threatened': { bg: '#fef9c3', color: '#a16207' },
  'Vulnerable': { bg: '#fed7aa', color: '#c2410c' },
  'Endangered': { bg: '#fee2e2', color: '#dc2626' },
  'Critically Endangered': { bg: '#fecaca', color: '#991b1b' },
  'Data Deficient': { bg: '#e2e8f0', color: '#475569' },
};

export default function BiotaPage() {
  const [biota, setBiota] = useState([]);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [selectedBiota, setSelectedBiota] = useState(null);

  useEffect(() => {
    api.get('/biota')
      .then(res => setBiota(res.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = biota.filter(b => {
    const matchSearch = !search ||
      b.nama_umum.toLowerCase().includes(search.toLowerCase()) ||
      b.nama_ilmiah.toLowerCase().includes(search.toLowerCase());
    const matchZone = zoneFilter === 'Semua' || b.zona_kedalaman === zoneFilter;
    return matchSearch && matchZone;
  });

  return (
    <>
      <header className="page-header">
        <div>
          <h2>Biota Laut</h2>
          <p>Keanekaragaman hayati kawasan konservasi berdasarkan kedalaman</p>
        </div>
      </header>

      <div className="page-body fade-in">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 250 }}>
            <Search size={16} />
            <input
              placeholder="Cari spesies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            {DEPTH_ZONES.filter(z => biota.some(b => z === 'Semua' || b.zona_kedalaman === z)).map(z => (
              <button
                key={z}
                className={`tab-btn ${zoneFilter === z ? 'active' : ''}`}
                onClick={() => setZoneFilter(z)}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--on-surface-muted)' }}>
              Menampilkan {filtered.length} spesies
            </div>

            <div className="biota-grid">
              {filtered.map((b, i) => {
                const sc = statusColors[b.status_konservasi] || statusColors['Data Deficient'];
                const modelSrc = MODEL_MAP[b.nama_umum];
                return (
                  <div
                    key={b.biota_id}
                    className="biota-card"
                    onClick={() => setSelectedBiota(b)}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  >
                    <div className="biota-card-image" style={modelSrc ? { padding: 0 } : {}}>
                      {modelSrc ? (
                        <BiotaModelViewer src={modelSrc} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)' }}>
                          <Fish size={40} color="#023e8a" />
                        </div>
                      )}
                    </div>
                    <div className="biota-card-body">
                      <h4>{b.nama_umum}</h4>
                      <div className="scientific-name">{b.nama_ilmiah}</div>
                      <div className="biota-card-meta">
                        <span className="badge" style={{ background: '#d8e2ff', color: '#023e8a' }}>
                          <Anchor size={10} /> {b.zona_kedalaman}
                        </span>
                        <span className="badge" style={{ background: sc.bg, color: sc.color }}>
                          <Shield size={10} /> {b.status_konservasi}
                        </span>
                      </div>
                      <p>{b.deskripsi}</p>
                      {b.habitat && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Compass size={12} /> Habitat: {b.habitat}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Detail Biota + Tahukah Kamu? */}
      {selectedBiota && (() => {
        const sc = statusColors[selectedBiota.status_konservasi] || statusColors['Data Deficient'];
        const modelSrc = MODEL_MAP[selectedBiota.nama_umum];
        const funFact = FUN_FACTS[selectedBiota.nama_umum] ||
          `${selectedBiota.nama_umum} (${selectedBiota.nama_ilmiah}) berperan penting menjaga keseimbangan rantai makanan di zona kedalaman ${selectedBiota.zona_kedalaman}.`;

        return (
          <div
            className="biota-modal-backdrop"
            onClick={() => setSelectedBiota(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '1.25rem',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
                position: 'relative',
                border: '1px solid #e2e8f0'
              }}
            >
              <button
                onClick={() => setSelectedBiota(null)}
                title="Tutup"
                style={{
                  position: 'absolute',
                  top: '0.85rem',
                  right: '0.85rem',
                  zIndex: 10,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <X size={18} color="#334155" />
              </button>

              {/* 3D Preview */}
              <div style={{ height: '240px', width: '100%', background: '#d8e2ff', overflow: 'hidden' }}>
                {modelSrc ? (
                  <BiotaModelViewer src={modelSrc} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)' }}>
                    <Fish size={56} color="#023e8a" />
                  </div>
                )}
              </div>

              {/* Detail Content */}
              <div style={{ padding: '1.35rem 1.5rem 1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedBiota.nama_umum}
                </h3>
                <div style={{ fontSize: '0.875rem', fontStyle: 'italic', color: '#64748b', marginBottom: '0.85rem' }}>
                  {selectedBiota.nama_ilmiah}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span className="badge" style={{ background: '#d8e2ff', color: '#023e8a' }}>
                    <Anchor size={11} /> Kedalaman {selectedBiota.zona_kedalaman}
                  </span>
                  <span className="badge" style={{ background: sc.bg, color: sc.color }}>
                    <Shield size={11} /> {selectedBiota.status_konservasi}
                  </span>
                  {selectedBiota.habitat && (
                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                      <Compass size={11} /> {selectedBiota.habitat}
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 1.15rem', fontSize: '0.875rem', lineHeight: 1.65, color: '#334155' }}>
                  {selectedBiota.deskripsi}
                </p>

                {/* Kartu Tahukah Kamu? */}
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff, #e0f2fe)',
                  border: '1px solid #bae6fd',
                  borderRadius: '0.875rem',
                  padding: '1rem 1.1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#0369a1', fontWeight: 800, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                    <Sparkles size={16} color="#0284c7" />
                    <span>Tahukah Kamu?</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.835rem', lineHeight: 1.6, color: '#0c4a6e' }}>
                    {funFact}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
