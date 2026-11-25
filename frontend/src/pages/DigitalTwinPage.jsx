import { useState, useEffect, useRef, useCallback } from 'react';
import { Layers, Thermometer, Droplets, Wind, Eye, Activity, Heart, Fish, AlertTriangle, Sliders, SlidersHorizontal, MapPin, ChevronDown, CheckCircle2, Globe, Building2, Flame, FlaskConical, CloudRain, Waves } from 'lucide-react';
import '@google/model-viewer';
import api, { getSandboxState } from '../api';
import { PROVINCES, KABUPATEN_BY_PROVINCE } from '../constants/regions';
import { MODEL_MAP } from '../constants/biotaModels';
import modelSubmarine from '../assets/models/Submarine.glb';


function getSensorsForProvinceAndKabupaten(provinceId, kabupatenId, realSensors) {
  // Single source of truth — semua dari DB/API, tidak ada dummy hardcoded
  const provMap = {
    'jabar': 'jawa barat', 'banten': 'banten', 'dki': 'jakarta',
    'jateng': 'jawa tengah', 'jatim': 'jawa timur', 'diy': 'yogyakarta',
    'bali': 'bali', 'ntt': 'nusa tenggara timur', 'sultra': 'sulawesi tenggara',
    'sulut': 'sulawesi utara', 'maluku': 'maluku', 'papua': 'papua',
  };

  // Filter by kabupaten/wilayah if specific one selected
  if (kabupatenId && kabupatenId !== 'all') {
    return realSensors.filter(s =>
      (s.wilayah || '').toLowerCase() === kabupatenId.toLowerCase() ||
      s.nama_lokasi.toLowerCase().includes(kabupatenId.toLowerCase())
    );
  }

  // Filter by province
  if (provinceId && provinceId !== 'all') {
    const keyword = (provMap[provinceId] || provinceId).split(' ')[0];
    return realSensors.filter(s =>
      (s.provinsi || '').toLowerCase().includes(keyword)
    );
  }

  return realSensors;
}

const DEPTH_LAYERS = [
  { id: 'surface', label: 'Permukaan', range: '0m',     color: '#0ea5e9', bgGrad: 'linear-gradient(180deg, #bae6fd 0%, #7dd3fc 100%)' },
  { id: 'shallow', label: 'Dangkal',   range: '0–5m',   color: '#0284c7', bgGrad: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)' },
  { id: 'mid',     label: 'Menengah',  range: '5–15m',  color: '#0369a1', bgGrad: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' },
  { id: 'deep',    label: 'Dalam',     range: '15–30m', color: '#075985', bgGrad: 'linear-gradient(180deg, #0c4a6e 0%, #082f49 100%)' },
];

// Semua biota GLB tersebar merata ke tiap lapisan kedalaman
const BIOTA_BY_DEPTH = {
  'surface': ['Ubur-ubur Kotak', 'Bintang Laut Biru', 'Ikan Mas', 'Lumba-lumba Botol', 'Ikan Kembung', 'Paus Biru'],
  'shallow': ['Ikan Badut (Nemo)', 'Ikan Kepe-kepe', 'Penyu Hijau', 'Gurita Cincin Biru', 'Hiu Banteng', 'Ikan Gramma Kerajaan', 'Bulu Babi'],
  'mid':     ['Ikan Buntal', 'Hiu Karang Sirip Hitam', 'Ikan Napoleon', 'Ikan Tuna', 'Ikan Todak', 'Kerapu Sunu (Coral Grouper)'],
  'deep':    ['Kuda Laut Pygmy', 'Pari Manta', 'Lobster Mutiara', 'Ikan Sebelah (Halibut)', 'Ikan Sungut Ganda (Anglerfish)', 'Hiu Goblin', 'Ikan Turbot'],
};

const BIOTA_INFO = {
  'Ikan Badut (Nemo)': { ilmiah: 'Amphiprioninae', spesifikasi: 'Ukuran 10-18 cm. Hidup bersimbiosis dengan anemon laut.', sejarah: 'Telah ada sejak zaman miosen awal (sekitar 20 juta tahun lalu).' },
  'Ikan Kepe-kepe': { ilmiah: 'Chaetodontidae', spesifikasi: 'Tubuh pipih, mulut memanjang untuk mencari makan di celah karang.', sejarah: 'Indikator penting kesehatan terumbu karang.' },
  'Penyu Hijau': { ilmiah: 'Chelonia mydas', spesifikasi: 'Panjang mencapai 1.5 meter. Memakan lamun dan alga.', sejarah: 'Spesies purba sejak Periode Jurassic (~150 juta tahun lalu).' },
  'Ikan Buntal': { ilmiah: 'Tetraodontidae', spesifikasi: 'Mampu menggembungkan diri saat terancam. Memiliki racun tetrodotoxin.', sejarah: 'Sisa fosil tertua berasal dari zaman Eosen (~50 juta tahun lalu).' },
  'Bintang Laut Biru': { ilmiah: 'Linckia laevigata', spesifikasi: 'Warna biru terang. Mampu meregenerasi lengan yang putus.', sejarah: 'Muncul pada periode Ordovician (~450 juta tahun lalu).' },
  'Hiu Karang Sirip Hitam': { ilmiah: 'Carcharhinus melanopterus', spesifikasi: 'Ujung sirip punggung berwarna hitam. Predator puncak perairan dangkal.', sejarah: 'Garis keturunan hiu telah ada sejak > 400 juta tahun lalu.' },
  'Kuda Laut Pygmy': { ilmiah: 'Hippocampus bargibanti', spesifikasi: 'Sangat kecil (< 2 cm), ahli kamuflase di kipas laut.', sejarah: 'Ditemukan pertama kali pada tahun 1969 oleh Georges Bargibant.' },
  'Ikan Napoleon': { ilmiah: 'Cheilinus undulatus', spesifikasi: 'Tonjolan di dahi mirip topi Napoleon. Ikan karang besar hingga 2m.', sejarah: 'Pemangsa alami Bintang Laut Mahkota Duri.' },
  'Ubur-ubur Kotak': { ilmiah: 'Cubozoa', spesifikasi: 'Bentuk medusa kotak. Tentakel mengandung sengat beracun.', sejarah: 'Berada di lautan sejak zaman Kambrium (> 500 juta tahun lalu).' },
  'Pari Manta': { ilmiah: 'Mobula alfredi', spesifikasi: 'Rentang sayap hingga 5.5 meter. Pemakan plankton.', sejarah: 'Leluhur pari manta berkembang sejak awal Jurassic (~190 juta tahun lalu).' },
  'Ikan Tuna': { ilmiah: 'Thunnini', spesifikasi: 'Tubuh hidrodinamis, renang hingga 75 km/jam.', sejarah: 'Berevolusi dari leluhur ikan pelagis ~45 juta tahun lalu.' },
  'Gurita Cincin Biru': { ilmiah: 'Hapalochlaena', spesifikasi: 'Ukuran kecil dengan cincin biru menyala saat terancam.', sejarah: 'Muncul sekitar 330 juta tahun lalu.' },
  'Ikan Todak': { ilmiah: 'Xiphias gladius', spesifikasi: 'Moncong rahang atas memanjang mirip pedang.', sejarah: 'Predator perairan lepas tersebar di samudra tropis.' },
  'Lobster Mutiara': { ilmiah: 'Panulirus ornatus', spesifikasi: 'Lobster besar bercorak mutiara di dasar karang.', sejarah: 'Komoditas perairan tropis Nusantara.' },
  'Ikan Mas': { ilmiah: 'Carassius auratus', spesifikasi: 'Tubuh keemasan mencolok, sirip elegan. Mudah beradaptasi di berbagai kondisi air.', sejarah: 'Didomestikasi di Tiongkok lebih dari 1.000 tahun lalu, kini tersebar global.' },
  'Ikan Sebelah (Halibut)': { ilmiah: 'Hippoglossus hippoglossus', spesifikasi: 'Tubuh pipih lateral dengan kedua mata di sisi kanan. Dapat tumbuh hingga 2 meter.', sejarah: 'Ikan demersal penting secara komersial, hidup di dasar laut bersuhu dingin.' },
  'Hiu Banteng': { ilmiah: 'Carcharhinus leucas', spesifikasi: 'Moncong tumpul, tubuh kekar. Mampu masuk ke perairan tawar dan asin.', sejarah: 'Salah satu hiu paling adaptif, dikenal agresif dan sering mendekati pesisir.' },
  'Ikan Sungut Ganda (Anglerfish)': { ilmiah: 'Lophiiformes', spesifikasi: 'Memiliki antena pendar (bioluminesensi) untuk memikat mangsa di laut dalam.', sejarah: 'Telah ada sejak era Eosen (~50 juta tahun lalu).' },
  'Kerapu Sunu (Coral Grouper)': { ilmiah: 'Plectropomus leopardus', spesifikasi: 'Warna merah bintik biru indah. Ikan predator karang bernilai tinggi.', sejarah: 'Spesies terumbu karang tropis Pasifik-Hindia.' },
  'Lumba-lumba Botol': { ilmiah: 'Tursiops truncatus', spesifikasi: 'Mamalia laut cerdas perenang cepat, sering melompat di permukaan air.', sejarah: 'Berevolusi dari leluhur cetacea ~50 juta tahun lalu.' },
  'Ikan Kembung': { ilmiah: 'Rastrelliger kanagurta', spesifikasi: 'Ikan pelagis kecil perenang cepat dalam kawanan besar.', sejarah: 'Komoditas utama perairan pesisir Nusantara.' },
  'Hiu Goblin': { ilmiah: 'Mitsukurina owstoni', spesifikasi: 'Hiu laut dalam langka dengan moncong panjang pipih dan rahang elastis penjangkau mangsa.', sejarah: 'Fosil hidup sejak periode Kapur (~125 juta tahun lalu).' },
  'Ikan Gramma Kerajaan': { ilmiah: 'Gramma loreto', spesifikasi: 'Warna ungu dan kuning cerah mencolok. Hidup di celah terumbu karang.', sejarah: 'Ikan karang hias populer Karibia & Pasifik.' },
  'Bulu Babi': { ilmiah: 'Diadema setosum', spesifikasi: 'Invertebrata berduri panjang yang menjaga keseimbangan alga di terumbu karang.', sejarah: 'Spesies purba sejak era Paleozoikum (> 450 juta tahun lalu).' },
  'Ikan Turbot': { ilmiah: 'Scophthalmus maximus', spesifikasi: 'Ikan pipih dasar laut bersubstrat pasir/lumpur.', sejarah: 'Spesies demersal komersial penting.' },
  'Paus Biru': { ilmiah: 'Balaenoptera musculus', spesifikasi: 'Hewan terbesar di bumi mencapai panjang 30m dan bobot 180 ton.', sejarah: 'Mamalia purba raksasa penyaring plankton.' },
};

const DigitalTwinModelViewer = ({ src, isPlaying = true }) => {
  const viewerRef = useRef(null);
  const [anim, setAnim] = useState(undefined);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const handleLoad = () => {
      const anims = viewer.availableAnimations || [];
      if (anims.length > 0) {
        const swimAnim = anims.find(a => a.toLowerCase().includes('swim'));
        setAnim(swimAnim || anims[0]);
      }
    };
    viewer.addEventListener('load', handleLoad);
    return () => viewer.removeEventListener('load', handleLoad);
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (isPlaying) {
      if (typeof viewer.play === 'function') viewer.play();
    } else {
      if (typeof viewer.pause === 'function') viewer.pause();
    }
  }, [isPlaying]);

  return (
    <model-viewer
      ref={viewerRef}
      src={src}
      loading="lazy"
      camera-orbit="45deg 80deg 100%"
      autoplay={isPlaying}
      animation-name={anim}
      interaction-prompt="none"
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <div slot="progress-bar" style={{ display: 'none' }} />
    </model-viewer>
  );
};

function getHealthColor(v) {
  if (v >= 85) return '#16a34a';
  if (v >= 70) return '#22c55e';
  if (v >= 50) return '#eab308';
  if (v >= 30) return '#f97316';
  return '#dc2626';
}

function getHealthLabel(v) {
  if (v >= 85) return 'Sangat Baik';
  if (v >= 70) return 'Baik';
  if (v >= 50) return 'Sedang';
  if (v >= 30) return 'Buruk';
  return 'Kritis';
}

function getTurbidityOpacity(ntu) {
  return Math.min(0.12 + (ntu / 25) * 0.4, 0.5);
}

export default function DigitalTwinPage() {
  const [sensors, setSensors] = useState([]);
  const [biota, setBiota] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  // Cascading Selection State
  const [selectedProvince, setSelectedProvince] = useState(() => localStorage.getItem('selected_province') || 'jabar');
  const [selectedKabupaten, setSelectedKabupaten] = useState(() => localStorage.getItem('selected_kabupaten') || 'all');
  const [selectedSensorId, setSelectedSensorId] = useState(() => localStorage.getItem('selected_sensor_id') || 'all');

  const [selectedLayer, setSelectedLayer] = useState(null);
  const [hoveredBiota, setHoveredBiota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simMode, setSimMode] = useState(false);
  const [simTemp, setSimTemp] = useState(0);   // °C
  const [simPh, setSimPh] = useState(0);       // pH
  const [simSal, setSimSal] = useState(0);     // PPT
  const [simDo, setSimDo] = useState(0);       // mg/L
  const [simTurb, setSimTurb] = useState(0);   // NTU
  const [simPreset, setSimPreset] = useState('normal');

  const applyPreset = useCallback((key) => {
    setSimPreset(key);
    if (key === 'normal') {
      setSimTemp(0); setSimPh(0); setSimSal(0); setSimDo(0); setSimTurb(0);
    } else if (key === 'heatwave') {
      setSimTemp(3.5); setSimPh(-0.1); setSimSal(0.5); setSimDo(-1.5); setSimTurb(0.5);
    } else if (key === 'acidification') {
      setSimTemp(1.5); setSimPh(-0.6); setSimSal(-1.5); setSimDo(-0.8); setSimTurb(1.0);
    } else if (key === 'storm') {
      setSimTemp(0.5); setSimPh(-0.3); setSimSal(-4.5); setSimDo(-1.2); setSimTurb(12.0);
    }
  }, []);

  // Sinkronkan otomatis dengan Lab Simulasi (ocean_sandbox) saat halaman dibuka / berubah
  useEffect(() => {
    const syncFromSandbox = () => {
      const role = localStorage.getItem('ocean_role') || 'pengguna';
      if (role !== 'pengguna') return;
      const sb = getSandboxState();
      if (sb.active_anomaly && sb.active_anomaly !== 'normal') {
        setSimMode(true);
        applyPreset(sb.active_anomaly);
      } else {
        setSimMode(false);
        applyPreset('normal');
      }
    };
    syncFromSandbox();
    window.addEventListener('ocean_sandbox_updated', syncFromSandbox);
    return () => window.removeEventListener('ocean_sandbox_updated', syncFromSandbox);
  }, [applyPreset]);

  const fetchTelemetryData = useCallback(() => {
    Promise.all([
      api.get('/sensors'),
      api.get('/biota'),
      api.get('/alerts?active_only=true&limit=20'),
    ]).then(([s, b, a]) => {
      setSensors(s.data);
      setBiota(b.data);
      setAlerts(a.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTelemetryData();
    const liveTimer = setInterval(fetchTelemetryData, 8000);
    return () => clearInterval(liveTimer);
  }, [fetchTelemetryData]);

  useEffect(() => {
    localStorage.setItem('selected_province', selectedProvince);
    localStorage.setItem('selected_kabupaten', selectedKabupaten);
    localStorage.setItem('selected_sensor_id', selectedSensorId);
  }, [selectedProvince, selectedKabupaten, selectedSensorId]);

  // Filter sensors by Kabupaten
  const kabupatenSensors = getSensorsForProvinceAndKabupaten(selectedProvince, selectedKabupaten, sensors);

  const selectedSensor = selectedSensorId === 'all' 
    ? null 
    : kabupatenSensors.find(s => s.sensor_id === selectedSensorId);

  const activeReading = selectedSensor ? selectedSensor.latest_reading : null;

  const currentHealth = selectedSensor
    ? (activeReading?.health_index || 80)
    : (kabupatenSensors.length > 0 ? Math.round(kabupatenSensors.reduce((s, x) => s + (x.latest_reading?.health_index || 0), 0) / kabupatenSensors.length) : 80);

  // Multi-parameter simulation logic
  const tempPenalty = simTemp * 7 + (simTemp >= 2.5 ? 8 : 0);
  const phPenalty = Math.abs(simPh) * 35 + (simPh <= -0.4 ? 12 : 0);
  const salPenalty = Math.abs(simSal) * 2.5;
  const doPenalty = Math.abs(Math.min(0, simDo)) * 8.5;
  const turbPenalty = simTurb * 1.8;

  const totalPenalty = tempPenalty + phPenalty + salPenalty + doPenalty + turbPenalty;
  const simulatedHealth = simMode 
    ? Math.max(10, Math.min(100, Math.round(currentHealth - totalPenalty))) 
    : currentHealth;
  const healthColor = getHealthColor(simulatedHealth);

  const simWarnings = [];
  if (simMode) {
    if (simTemp >= 2.0) {
      simWarnings.push({
        title: 'Marine Heatwave (Stres Termal)',
        desc: `Kenaikan suhu +${simTemp.toFixed(1)}°C berisiko memicu pemutihan karang (coral bleaching) massal.`,
        bg: '#fff1f2', border: '#fecdd3', color: '#be123c'
      });
    }
    if (simPh <= -0.3) {
      simWarnings.push({
        title: 'Asidifikasi Laut (Penurunan pH)',
        desc: `Penurunan pH (${simPh.toFixed(1)}) melarutkan kalsium karbonat pada struktur terumbu karang.`,
        bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8'
      });
    }
    if (simDo <= -1.0) {
      simWarnings.push({
        title: 'Hipoksia Laut (Defisit Oksigen)',
        desc: `Defisit oksigen terlarut (${simDo.toFixed(1)} mg/L) menekan daya hidup ikan & invertebrata laut.`,
        bg: '#fffbeb', border: '#fef3c7', color: '#b45309'
      });
    }
    if (simTurb >= 5.0) {
      simWarnings.push({
        title: 'Sedimentasi & Kekeruhan Tinggi',
        desc: `Lonjakan kekeruhan +${simTurb.toFixed(1)} NTU menghalangi sinar matahari untuk fotosintesis zooxanthellae.`,
        bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1'
      });
    }
  }

  const currentTurbidity = selectedSensor
    ? (activeReading?.kekeruhan_ntu || 3)
    : (kabupatenSensors.length > 0 ? kabupatenSensors.reduce((s, x) => s + (x.latest_reading?.kekeruhan_ntu || 3), 0) / kabupatenSensors.length : 3);

  const activeSensorsList = selectedSensor ? [selectedSensor] : kabupatenSensors;

  const sensorsByDepth = {
    surface: activeSensorsList.filter(s => s.kedalaman_m <= 1),
    shallow: activeSensorsList.filter(s => s.kedalaman_m > 1 && s.kedalaman_m <= 5),
    mid: activeSensorsList.filter(s => s.kedalaman_m > 5 && s.kedalaman_m <= 15),
    deep: activeSensorsList.filter(s => s.kedalaman_m > 15),
  };

  if (loading) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar Skeleton */}
        <header className="page-header" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="skeleton" style={{ width: 220, height: 24, borderRadius: '0.375rem', marginBottom: '0.5rem' }} />
            <div className="skeleton" style={{ width: 340, height: 16, borderRadius: '0.25rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="skeleton" style={{ width: 180, height: 32, borderRadius: '0.25rem' }} />
            <div className="skeleton" style={{ width: 120, height: 32, borderRadius: '0.25rem' }} />
          </div>
        </header>

        {/* Main Container Skeleton */}
        <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar Skeleton */}
          <div className="skeleton" style={{ height: 48, borderRadius: '1.25rem' }} />

          {/* Visualization & Panels Grid Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem' }}>
            {/* Left Visualizer Skeleton */}
            <div className="card" style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 540, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: '40%', height: 20, borderRadius: '0.25rem' }} />
                <div className="skeleton" style={{ width: '20%', height: 20, borderRadius: '0.25rem' }} />
              </div>
              <div className="skeleton" style={{ flex: 1, borderRadius: '0.5rem' }} />
            </div>

            {/* Right Panel Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="card" style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 250, boxSizing: 'border-box' }}>
                <div className="skeleton" style={{ width: '60%', height: 20, borderRadius: '0.25rem' }} />
                <div className="skeleton" style={{ width: '100%', height: 140, borderRadius: '0.5rem' }} />
              </div>
              <div className="card" style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 265, boxSizing: 'border-box' }}>
                <div className="skeleton" style={{ width: '50%', height: 20, borderRadius: '0.25rem' }} />
                <div className="skeleton" style={{ width: '100%', height: 160, borderRadius: '0.5rem' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Bar */}
      <header className="page-header" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem 1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Digital Twin Ekosistem Laut</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.15rem 0 0' }}>Simulasi 3D & Telemetri Real-Time Pesisir Indonesia</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className={`btn btn-sm ${simMode ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setSimMode(!simMode)}
            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <SlidersHorizontal size={14} /> Mode Simulasi (What-If)
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#15803d', padding: '0.35rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
            <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
            Telemetri Aktif
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* ULTRA-SLEEK PILL FILTER BAR */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: 'none',
          outline: 'none',
          borderRadius: '1.25rem',
          padding: '0.55rem 1rem',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Pills row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>

            {/* Left Label Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', fontWeight: 800, fontSize: '0.8125rem', flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={15} color="#0284c7" />
              </div>
              <span style={{ whiteSpace: 'nowrap' }}>Wilayah & Sensor</span>
            </div>
            
            {/* Pill 1: Provinsi */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '2rem',
              padding: '0.3rem 0.65rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>Provinsi:</span>
              <select
                value={selectedProvince}
                onChange={e => { setSelectedProvince(e.target.value); setSelectedKabupaten('all'); setSelectedSensorId('all'); }}
                style={{ border: 'none', background: 'transparent', color: '#0f172a', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', outline: 'none', maxWidth: '130px' }}
              >
                {PROVINCES.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>

            {/* Pill 2: Daerah */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '2rem',
              padding: '0.3rem 0.65rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>Daerah:</span>
              <select
                value={selectedKabupaten}
                onChange={e => { setSelectedKabupaten(e.target.value); setSelectedSensorId('all'); }}
                style={{ border: 'none', background: 'transparent', color: '#0f172a', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', outline: 'none', maxWidth: '210px' }}
              >
                {(KABUPATEN_BY_PROVINCE[selectedProvince] || []).map(k => (<option key={k.id} value={k.id}>{k.name}</option>))}
              </select>
            </div>

            {/* Pill 3: Titik Sensor */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: '1px solid #0284c7',
              borderRadius: '2rem', padding: '0.3rem 0.65rem', color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)', flexShrink: 0,
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)', whiteSpace: 'nowrap' }}>Titik Sensor:</span>
              <select
                value={selectedSensorId}
                onChange={e => setSelectedSensorId(e.target.value)}
                style={{ border: 'none', background: 'transparent', color: '#ffffff', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', outline: 'none', maxWidth: '190px' }}
              >
                <option value="all" style={{ color: '#0f172a' }}>Semua Titik ({kabupatenSensors.length} Sensor)</option>
                {kabupatenSensors.map(s => (
                  <option key={s.sensor_id} value={s.sensor_id} style={{ color: '#0f172a' }}>
                    {s.nama_lokasi} ({s.sensor_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* What-If Simulation Control Banner */}
        {selectedSensor && activeReading && (() => {
          const params = [
            {
              label: 'Suhu Laut',
              value: `${activeReading.suhu_celsius}°C`,
              Icon: Thermometer,
              ok: activeReading.suhu_celsius >= 26 && activeReading.suhu_celsius <= 30,
              range: '26–30°C',
              gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
              shadow: 'rgba(234, 88, 12, 0.25)',
            },
            {
              label: 'pH Air',
              value: `${activeReading.ph}`,
              Icon: FlaskConical,
              ok: activeReading.ph >= 7.5 && activeReading.ph <= 8.5,
              range: '7.5–8.5',
              gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              shadow: 'rgba(109, 40, 217, 0.25)',
            },
            {
              label: 'Oksigen Terlarut',
              value: `${activeReading.do_mg_l} mg/L`,
              Icon: Droplets,
              ok: activeReading.do_mg_l >= 5,
              range: '≥5 mg/L',
              gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
              shadow: 'rgba(3, 105, 161, 0.25)',
            },
            {
              label: 'Kekeruhan',
              value: `${activeReading.kekeruhan_ntu} NTU`,
              Icon: Waves,
              ok: activeReading.kekeruhan_ntu <= 10,
              range: '0–10 NTU',
              gradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
              shadow: 'rgba(14, 116, 144, 0.25)',
            },
            {
              label: 'Kedalaman',
              value: `${selectedSensor.kedalaman_m} m`,
              Icon: Layers,
              ok: true,
              range: selectedSensor.zona,
              gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              shadow: 'rgba(4, 120, 87, 0.25)',
            },
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.875rem' }}>
              {params.map(({ label, value, Icon, ok, range, gradient, shadow }) => (
                <div key={label} style={{
                  background: ok ? gradient : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  borderRadius: '0.875rem',
                  padding: '0.9rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  color: '#ffffff',
                  boxShadow: `0 4px 14px -2px ${ok ? shadow : 'rgba(185, 28, 28, 0.28)'}`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '0.625rem',
                    background: 'rgba(255, 255, 255, 0.18)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={19} color="#ffffff" strokeWidth={2.1} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                      <span style={{
                        fontSize: '0.625rem', fontWeight: 700, padding: '2px 7px',
                        borderRadius: 999, letterSpacing: '0.05em',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff', flexShrink: 0,
                      }}>
                        {ok ? 'NORMAL' : 'ALERT'}
                      </span>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2, marginTop: 2, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                      {value}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.78)', fontWeight: 500, marginTop: 2 }}>
                      Ideal: {range}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
        {simMode && (
          <div className="card" style={{ 
            border: '1px solid rgba(255, 255, 255, 0.25)', 
            background: 'linear-gradient(135deg, #023e8a 0%, #0077b6 55%, #0369a1 100%)', 
            padding: '0.875rem 1.25rem', 
            borderRadius: '1rem', 
            boxShadow: '0 8px 24px rgba(2, 62, 138, 0.25)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header & Scenario Presets */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#ffffff', padding: '5px', borderRadius: '0.5rem', display: 'flex' }}>
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#ffffff' }}>Simulasi What-If Multi-Parameter</h3>
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>Pratinjau interaktif skenario ekosistem laut (simulasi terisolasi)</span>
                </div>
              </div>

              {/* Scenario Presets buttons */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'normal', label: 'Normal', icon: CheckCircle2, color: '#15803d' },
                  { key: 'heatwave', label: 'Heatwave', icon: Flame, color: '#dc2626' },
                  { key: 'acidification', label: 'Asidifikasi', icon: FlaskConical, color: '#7c3aed' },
                  { key: 'storm', label: 'Badai & Limpasan', icon: CloudRain, color: '#0284c7' },
                ].map(p => {
                  const isActive = simPreset === p.key;
                  const IconComponent = p.icon;
                  return (
                    <button key={p.key} onClick={() => applyPreset(p.key)} style={{
                      padding: '0.25rem 0.65rem', borderRadius: '2rem',
                      border: isActive ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
                      background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                      color: isActive ? p.color : '#ffffff',
                      fontSize: '0.71875rem', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <IconComponent size={12} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5 Parameter Sliders (5-column full width grid without outline) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem' }}>
              
              {/* 1. Suhu */}
              <div style={{ background: '#ffffff', padding: '0.55rem 0.75rem', borderRadius: '0.625rem', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Thermometer size={12} color="#dc2626" /> Suhu</span>
                  <span style={{ color: simTemp > 0 ? '#dc2626' : '#16a34a', fontWeight: 800 }}>{simTemp > 0 ? `+${simTemp.toFixed(1)}°C` : '0°C'}</span>
                </div>
                <input type="range" min="0" max="5" step="0.5" value={simTemp} onChange={e => { setSimTemp(parseFloat(e.target.value)); setSimPreset('custom'); }} className="custom-range-slider" style={{ '--accent-color': '#dc2626' }} />
              </div>

              {/* 2. pH */}
              <div style={{ background: '#ffffff', padding: '0.55rem 0.75rem', borderRadius: '0.625rem', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FlaskConical size={12} color="#7c3aed" /> pH Air</span>
                  <span style={{ color: simPh < 0 ? '#7c3aed' : '#16a34a', fontWeight: 800 }}>{simPh !== 0 ? `${simPh > 0 ? '+' : ''}${simPh.toFixed(1)}` : '0'}</span>
                </div>
                <input type="range" min="-1.5" max="0.5" step="0.1" value={simPh} onChange={e => { setSimPh(parseFloat(e.target.value)); setSimPreset('custom'); }} className="custom-range-slider" style={{ '--accent-color': '#7c3aed' }} />
              </div>

              {/* 3. Salinitas */}
              <div style={{ background: '#ffffff', padding: '0.55rem 0.75rem', borderRadius: '0.625rem', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Waves size={12} color="#0284c7" /> Salinitas</span>
                  <span style={{ color: simSal !== 0 ? '#0284c7' : '#16a34a', fontWeight: 800 }}>{simSal !== 0 ? `${simSal > 0 ? '+' : ''}${simSal.toFixed(1)}` : '0'}</span>
                </div>
                <input type="range" min="-6" max="6" step="0.5" value={simSal} onChange={e => { setSimSal(parseFloat(e.target.value)); setSimPreset('custom'); }} className="custom-range-slider" style={{ '--accent-color': '#0284c7' }} />
              </div>

              {/* 4. DO */}
              <div style={{ background: '#ffffff', padding: '0.55rem 0.75rem', borderRadius: '0.625rem', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Droplets size={12} color="#d97706" /> Oksigen</span>
                  <span style={{ color: simDo < 0 ? '#d97706' : '#16a34a', fontWeight: 800 }}>{simDo !== 0 ? `${simDo > 0 ? '+' : ''}${simDo.toFixed(1)}` : '0'}</span>
                </div>
                <input type="range" min="-4" max="2" step="0.2" value={simDo} onChange={e => { setSimDo(parseFloat(e.target.value)); setSimPreset('custom'); }} className="custom-range-slider" style={{ '--accent-color': '#d97706' }} />
              </div>

              {/* 5. Kekeruhan */}
              <div style={{ background: '#ffffff', padding: '0.55rem 0.75rem', borderRadius: '0.625rem', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={12} color="#b45309" /> Kekeruhan</span>
                  <span style={{ color: simTurb > 0 ? '#b45309' : '#16a34a', fontWeight: 800 }}>{simTurb > 0 ? `+${simTurb.toFixed(1)}` : '0'}</span>
                </div>
                <input type="range" min="0" max="15" step="0.5" value={simTurb} onChange={e => { setSimTurb(parseFloat(e.target.value)); setSimPreset('custom'); }} className="custom-range-slider" style={{ '--accent-color': '#b45309' }} />
              </div>
            </div>

            {/* Dynamic Warnings List */}
            {simWarnings.length > 0 && (
              <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {simWarnings.map((w, i) => (
                  <div key={i} style={{ background: w.bg, border: `1px solid ${w.border}`, color: w.color, padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span><strong>{w.title}:</strong> {w.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

            {/* MAIN VISUALIZATION & DATA COLUMNS */}
            {(() => {
              const getProvinceName = () => PROVINCES.find(p => p.id === selectedProvince)?.name || 'Jawa Barat';
              const getKabupatenName = () => {
                const list = KABUPATEN_BY_PROVINCE[selectedProvince] || [];
                const kab = list.find(k => k.id === selectedKabupaten);
                return kab ? kab.name : selectedKabupaten;
              };
              const regionLabel = selectedSensor ? selectedSensor.nama_lokasi : (selectedKabupaten !== 'all' ? getKabupatenName() : getProvinceName());

              return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.25rem', alignItems: 'stretch' }}>
              
              {/* Left Column: 2.5D Cross-Section Visualizer */}
              <div className="card" style={{ overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '1rem', background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={18} color="#023e8a" />
                    Cross-Section Kedalaman 3D ({regionLabel})
                  </h3>
                </div>

                {/* Scrollable Ocean Cross Section Scene — Dive Down to 10.924 METERS DEEP */}
                <div
                  style={{
                    position: 'relative',
                    height: 600,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    flex: 1,
                    scrollbarWidth: 'thin',
                    background: '#010409'
                  }}
                >
                  {/* === FULL 1850px VERTICAL OCEAN JOURNEY (NEAL.FUN MINIMALIST STYLE) === */}
                  <div style={{
                    position: 'relative',
                    height: 1850,
                    background: 'linear-gradient(180deg, #0ea5e9 0%, #0284c7 14%, #0369a1 28%, #0c4a6e 46%, #072840 65%, #031120 82%, #010409 100%)',
                    overflow: 'hidden'
                  }}>
                    {/* Subtle Deep Canyon Walls */}
                    <svg viewBox="0 0 900 1850" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, opacity: 0.45 }}>
                      <path d="M0,1150 L80,1290 L38,1480 L90,1680 L0,1850 Z" fill="rgba(1, 6, 16, 0.5)" />
                      <path d="M900,1180 L820,1340 L860,1520 L810,1710 L900,1850 Z" fill="rgba(1, 6, 16, 0.5)" />
                    </svg>

                  {/* === DYNAMIC SIMULATION ATMOSPHERE OVERLAY === */}
                  {simMode && simTemp >= 2 && (
                    <div style={{ position: 'absolute', top: 60, left: 0, right: 0, height: 280, background: 'linear-gradient(180deg, rgba(239,68,68,0.28) 0%, rgba(249,115,22,0.12) 60%, transparent 100%)', zIndex: 2, pointerEvents: 'none', transition: 'opacity 0.5s' }} />
                  )}
                  {simMode && simPh <= -0.4 && (
                    <div style={{ position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.22) 100%)', zIndex: 2, pointerEvents: 'none', transition: 'opacity 0.5s' }} />
                  )}

                  {/* === MINIMALIST SKY & SURFACE WAVE (NEAL.FUN STYLE) === */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, background: '#f0f9ff', zIndex: 3 }} />

                  {/* === WATER SURFACE WAVE === */}
                  <div style={{ position: 'absolute', top: 44, left: 0, width: '100%', height: 24, zIndex: 4 }}>
                    <svg viewBox="0 0 1440 24" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                      <path fill="#38bdf8" fillOpacity="0.45" d="M0,8 C240,0 480,16 720,8 C960,0 1200,16 1440,8 L1440,24 L0,24 Z">
                        <animate attributeName="d" dur="4.5s" repeatCount="indefinite"
                          values="M0,8 C240,0 480,16 720,8 C960,0 1200,16 1440,8 L1440,24 L0,24 Z;
                                  M0,8 C240,16 480,0 720,8 C960,16 1200,0 1440,8 L1440,24 L0,24 Z;
                                  M0,8 C240,0 480,16 720,8 C960,0 1200,16 1440,8 L1440,24 L0,24 Z"/>
                      </path>
                      <path fill="#0ea5e9" d="M0,14 C360,5 720,21 1080,14 C1260,10 1380,18 1440,14 L1440,24 L0,24 Z">
                        <animate attributeName="d" dur="3.4s" repeatCount="indefinite"
                          values="M0,14 C360,5 720,21 1080,14 C1260,10 1380,18 1440,14 L1440,24 L0,24 Z;
                                  M0,14 C360,21 720,5 1080,14 C1260,18 1380,10 1440,14 L1440,24 L0,24 Z;
                                  M0,14 C360,5 720,21 1080,14 C1260,10 1380,18 1440,14 L1440,24 L0,24 Z"/>
                      </path>
                    </svg>
                  </div>

                  {/* === RISING BUBBLES & DEEP-SEA MARINE SNOW === */}
                  <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
                    {[8, 17, 29, 44, 52, 63, 75, 88].map((leftPct, i) => (
                      <div key={`b-${i}`} style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        bottom: `${10 + (i % 4) * 18}%`,
                        width: 5 + (i % 3) * 3,
                        height: 5 + (i % 3) * 3,
                        borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.45)',
                        background: 'rgba(255,255,255,0.12)',
                        animation: `bubbleRise ${4 + (i % 4) * 1.4}s linear ${i * 0.6}s infinite`,
                      }} />
                    ))}
                    {[14, 24, 38, 49, 61, 72, 82, 91].map((leftPct, i) => (
                      <div key={`p-${i}`} style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        top: `${58 + (i % 5) * 8}%`,
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: i % 2 === 0 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(167, 243, 208, 0.65)',
                        boxShadow: '0 0 8px rgba(56, 189, 248, 0.85)',
                        animation: `float ${2.8 + (i % 3) * 0.9}s ease-in-out ${i * 0.4}s infinite alternate`,
                      }} />
                    ))}
                  </div>

                  {/* === NEAL.FUN-STYLE VERTICAL DEPTH RULER (ALIGNED TO EXACT DEPTHS) === */}
                  <div style={{
                    position: 'absolute', top: 64, right: 18, bottom: 20, width: 115, zIndex: 12,
                    pointerEvents: 'none', borderRight: '1px dashed rgba(255,255,255,0.2)'
                  }}>
                    {[
                      { label: '0 METER', top: 10 },
                      { label: '5 METER', top: 164 },
                      { label: '15 METER', top: 318 },
                      { label: '30 METER', top: 472 },
                      { label: '1.000 METER', top: 720 },
                      { label: '4.000 METER', top: 1120 },
                      { label: '10.924 METER', top: 1710 },
                    ].map(({ label, top }) => (
                      <div key={label} style={{ position: 'absolute', top, right: 0, display: 'flex', alignItems: 'center', gap: 5, paddingRight: 10 }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{label}</span>
                        <span style={{ width: 7, height: 1, background: 'rgba(255,255,255,0.45)', display: 'inline-block' }} />
                      </div>
                    ))}
                  </div>

                  {/* === SEAMLESS DEPTH ZONES === */}
                  {DEPTH_LAYERS.map((layer, idx) => {
                    const top = 64 + idx * 154;
                    const isSelected = selectedLayer === layer.id;
                    const layerSensors = sensorsByDepth[layer.id] || [];
                    const layerBiota = BIOTA_BY_DEPTH[layer.id] || [];
                    const turbOpacity = getTurbidityOpacity(simMode ? currentTurbidity + simTemp * 2 : currentTurbidity);

                    return (
                      <div key={layer.id}
                        onClick={() => setSelectedLayer(isSelected ? null : layer.id)}
                        style={{
                          position: 'absolute', top, left: 0, right: 0, height: 154,
                          background: isSelected
                            ? 'radial-gradient(ellipse at 50% 50%, rgba(56, 189, 248, 0.16) 0%, rgba(14, 165, 233, 0.05) 65%, transparent 100%)'
                            : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.3s ease',
                          zIndex: isSelected ? 10 : 5 + idx,
                        }}>

                        {/* Turbidity haze */}
                        <div style={{ position: 'absolute', inset: 0, background: `rgba(139,119,80,${turbOpacity * (idx + 1) * 0.1})`, pointerEvents: 'none' }} />

                        {/* Clean Zone Tag */}
                        <div style={{ position: 'absolute', left: 16, top: 12, display: 'flex', alignItems: 'center', gap: 6, zIndex: 7 }}>
                          <div style={{
                            background: isSelected ? 'rgba(14, 165, 233, 0.9)' : 'rgba(2, 6, 23, 0.35)',
                            backdropFilter: 'blur(8px)',
                            padding: '4px 12px', borderRadius: 9999,
                            fontSize: '0.7rem', fontWeight: 700, color: '#ffffff',
                            border: isSelected ? '1px solid rgba(255,255,255,0.75)' : '1px solid rgba(255,255,255,0.14)',
                            letterSpacing: '0.02em',
                            transition: 'all 0.25s ease'
                          }}>
                            {layer.label} · {layer.range}
                          </div>
                          {layerSensors.length > 0 && (
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.14)', backdropFilter: 'blur(6px)',
                              padding: '3px 9px', borderRadius: 9999,
                              fontSize: '0.65rem', fontWeight: 600, color: '#f0f9ff',
                              border: '1px solid rgba(255,255,255,0.18)'
                            }}>
                              {layerSensors.length} sensor
                            </div>
                          )}
                        </div>

                        {/* Clean Circular Sensor HI Badges (Left) */}
                        {layerSensors.length > 0 && (
                          <div style={{
                            position: 'absolute', left: 16, width: '24%', top: 44, bottom: 8,
                            display: 'flex', gap: 8, flexWrap: 'wrap', alignContent: 'flex-start',
                            overflowY: 'auto', scrollbarWidth: 'none', zIndex: 7
                          }}>
                            {layerSensors.map((s) => {
                              const hi = s.latest_reading?.health_index || 75;
                              const adjHi = simMode ? Math.max(0, Math.round(hi - simTemp * 8)) : Math.round(hi);
                              const c = getHealthColor(adjHi);
                              const isAlertHi = adjHi < 70;
                              return (
                                <div key={s.sensor_id}
                                  title={`${s.nama_lokasi}\n${s.sensor_id}\nHI: ${adjHi}/100`}
                                  style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: c,
                                    border: '1.5px solid rgba(255,255,255,0.9)',
                                    boxShadow: isAlertHi ? `0 0 0 3px ${c}44, 0 2px 6px rgba(0,0,0,0.22)` : '0 2px 6px rgba(0,0,0,0.2)',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', color: '#fff',
                                    cursor: 'help', flexShrink: 0, transition: 'transform 0.15s ease'
                                  }}>
                                  <span style={{ fontSize: '0.42rem', fontWeight: 700, lineHeight: 1, opacity: 0.9 }}>HI</span>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, lineHeight: 1.05 }}>{adjHi}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* === BIOTA 3D MODELS — Spacious Natural Deep-Sea Staging === */}
                        {layerBiota.map((biotaName, bi) => {
                          const modelSrc = MODEL_MAP[biotaName];
                          const totalBiota = layerBiota.length;
                          const xPct = 28 + ((bi + 0.5) / Math.max(1, totalBiota)) * 60;
                          const yPos = 28 + (bi % 2) * 32;
                          const size = modelSrc ? 76 : 44;
                          const floatDur = 2.6 + (bi % 4) * 0.7;
                          const floatDelay = bi * 0.45;
                          return (
                            <div key={biotaName} style={{
                              position: 'absolute',
                              left: `${xPct}%`,
                              top: yPos,
                              width: size,
                              height: size,
                              zIndex: 8,
                              cursor: 'pointer',
                              animation: `float ${floatDur * 0.65}s ease-in-out ${floatDelay}s infinite alternate`,
                              filter: idx >= 2 ? `brightness(${0.94 - idx * 0.06}) drop-shadow(0 6px 14px rgba(0,0,0,0.45))` : 'drop-shadow(0 6px 12px rgba(0,0,0,0.28))',
                              transition: 'transform 0.25s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.18)'; }}
                            onMouseMove={(e) => {
                              e.stopPropagation();
                              setHoveredBiota({ name: biotaName, ...BIOTA_INFO[biotaName], x: e.clientX, y: e.clientY });
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              setHoveredBiota(null);
                            }}>
                              {modelSrc ? (
                                <DigitalTwinModelViewer src={modelSrc} isPlaying={true} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Fish size={20} color="rgba(255,255,255,0.85)" />
                                </div>
                              )}
                            </div>
                          );
                        })}

                      </div>
                    );
                  })}

                  {/* === BUBBLE PARTICLES === */}
                  {[8, 20, 35, 50, 65, 78, 90].map((xPct, i) => (
                    <div key={i} style={{
                      position: 'absolute', left: `${xPct}%`, bottom: 60 + (i % 3) * 80,
                      width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3,
                      borderRadius: '50%', background: 'rgba(255,255,255,0.35)',
                      border: '1px solid rgba(255,255,255,0.5)',
                      zIndex: 8, pointerEvents: 'none',
                      animation: `bubbleRise ${3 + i * 0.6}s ease-in ${i * 0.7}s infinite`,
                    }} />
                  ))}

                  {/* === DEEP SEA ZONES (200m - 10.924m) === */}
                  {/* 1. Zona Senja (200m - 1.000m) */}
                  <div style={{ position: 'absolute', top: 720, left: 0, right: 0, height: 340, zIndex: 6 }}>
                    <div style={{ position: 'absolute', left: 18, top: 18, background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(6px)', padding: '4px 12px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, color: '#bae6fd', border: '1px solid rgba(255,255,255,0.14)', pointerEvents: 'none' }}>
                      Zona Senja (Twilight) · 200m – 1.000m
                    </div>
                    <div style={{ position: 'absolute', left: 18, top: 52, fontSize: '0.75rem', color: 'rgba(186,230,253,0.75)', maxWidth: 340, lineHeight: 1.5, pointerEvents: 'none' }}>
                      Cahaya matahari mulai menghilang sepenuhnya. Biota laut dalam mulai bermigrasi naik-turun di zona ini.
                    </div>
                    {/* 3D Pelagic & Twilight Creatures */}
                    {[
                      { name: 'Paus Biru', left: '34%', top: 95, size: 120 },
                      { name: 'Ikan Todak', left: '60%', top: 145, size: 90 },
                      { name: 'Ubur-ubur Kotak', left: '78%', top: 85, size: 78 },
                    ].map((item, i) => MODEL_MAP[item.name] && (
                      <div key={item.name} style={{
                        position: 'absolute', left: item.left, top: item.top, width: item.size, height: item.size,
                        animation: `float ${3 + i * 0.7}s ease-in-out infinite alternate`,
                        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.45))', cursor: 'pointer'
                      }}
                      onMouseMove={(e) => { e.stopPropagation(); setHoveredBiota({ name: item.name, ...BIOTA_INFO[item.name], x: e.clientX, y: e.clientY }); }}
                      onMouseLeave={() => setHoveredBiota(null)}>
                        <DigitalTwinModelViewer src={MODEL_MAP[item.name]} isPlaying={true} />
                      </div>
                    ))}
                  </div>

                  {/* 2. Zona Tengah Malam & Abisal (1.000m - 4.000m) */}
                  <div style={{ position: 'absolute', top: 1120, left: 0, right: 0, height: 360, zIndex: 7 }}>
                    <div style={{ position: 'absolute', left: 18, top: 18, background: 'rgba(2,6,23,0.55)', backdropFilter: 'blur(6px)', padding: '4px 12px', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700, color: '#7dd3fc', border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'none' }}>
                      Zona Abisal · 1.000m – 4.000m
                    </div>
                    <div style={{ position: 'absolute', left: 18, top: 52, fontSize: '0.75rem', color: 'rgba(148,163,184,0.85)', maxWidth: 350, lineHeight: 1.5, pointerEvents: 'none' }}>
                      Suhu air mendekati 2°C dengan tekanan sangat tinggi. Hanya spesies laut dalam beradaptasi ekstrem yang bertahan di sini.
                    </div>
                    {/* 3D Abyssal Creatures */}
                    {[
                      { name: 'Ikan Sungut Ganda (Anglerfish)', left: '38%', top: 130, size: 95 },
                      { name: 'Hiu Goblin', left: '66%', top: 155, size: 110 },
                    ].map((item, i) => MODEL_MAP[item.name] && (
                      <div key={item.name} style={{
                        position: 'absolute', left: item.left, top: item.top, width: item.size, height: item.size,
                        animation: `float ${3.4 + i * 0.8}s ease-in-out infinite alternate`,
                        filter: 'brightness(0.9) drop-shadow(0 10px 20px rgba(0,0,0,0.65))', cursor: 'pointer'
                      }}
                      onMouseMove={(e) => { e.stopPropagation(); setHoveredBiota({ name: item.name, ...BIOTA_INFO[item.name], x: e.clientX, y: e.clientY }); }}
                      onMouseLeave={() => setHoveredBiota(null)}>
                        <DigitalTwinModelViewer src={MODEL_MAP[item.name]} isPlaying={true} />
                      </div>
                    ))}
                  </div>

                  {/* 3. Dasar Palung Terdalam & Kapal Selam Riset (10.924 METERS DEEP) */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 320, zIndex: 8 }}>
                    <div style={{ position: 'absolute', left: 18, top: 16, background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', border: '1px solid rgba(56,189,248,0.38)', pointerEvents: 'none' }}>
                      🔱 Dasar Palung Terdalam · 10.924 METERS DEEP
                    </div>
                    <div style={{ position: 'absolute', left: 18, top: 52, fontSize: '0.75rem', color: '#94a3b8', maxWidth: 360, lineHeight: 1.5, pointerEvents: 'none' }}>
                      Tekanan mencapai ~1.100 atmosfer. Kapal selam riset laut dalam menyelam hingga dasar palung untuk memetakan ekosistem ekstrem.
                    </div>

                    {/* 3D Research Submarine at the Abyssal Trench Floor */}
                    <div style={{
                      position: 'absolute',
                      left: '44%',
                      bottom: 42,
                      width: 195,
                      height: 165,
                      zIndex: 9,
                      animation: 'float 3.6s ease-in-out infinite alternate',
                      filter: 'drop-shadow(0 14px 26px rgba(0,0,0,0.75))'
                    }}>
                      {/* Glowing Submarine Searchlight Cone */}
                      <div style={{
                        position: 'absolute',
                        left: -150,
                        top: 64,
                        width: 195,
                        height: 120,
                        background: 'linear-gradient(250deg, rgba(125,211,252,0.38) 0%, rgba(56,189,248,0.1) 55%, transparent 100%)',
                        clipPath: 'polygon(100% 35%, 0% 0%, 0% 100%, 100% 55%)',
                        pointerEvents: 'none',
                        filter: 'blur(2px)'
                      }} />
                      <DigitalTwinModelViewer src={modelSubmarine} isPlaying={true} />
                    </div>

                    {/* Gelembung halus dari kapal selam */}
                    {[48, 53, 58, 63].map((xPct, i) => (
                      <div key={`sub-b-${i}`} style={{
                        position: 'absolute', left: `${xPct}%`, bottom: 135 + (i % 2) * 20,
                        width: 5 + (i % 2) * 3, height: 5 + (i % 2) * 3,
                        borderRadius: '50%', background: 'rgba(125,211,252,0.4)', border: '1px solid rgba(186,230,253,0.6)',
                        pointerEvents: 'none',
                        animation: `bubbleRise ${3.2 + i * 0.7}s ease-in ${i * 0.5}s infinite`
                      }} />
                    ))}

                    {/* Dasar Laut Palung (Seabed Terrain) */}
                    <svg viewBox="0 0 900 120" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 120, pointerEvents: 'none' }} preserveAspectRatio="none">
                      <path d="M0,65 Q140,42 290,68 T580,55 T900,72 L900,120 L0,120 Z" fill="#0f172a" />
                      <path d="M0,86 Q210,70 440,90 T900,82 L900,120 L0,120 Z" fill="#1e293b" />
                      <path d="M80,86 Q74,62 85,46 Q92,66 88,86 Z" fill="#0f766e" opacity="0.55" />
                      <path d="M98,88 Q106,60 96,42 Q88,64 92,88 Z" fill="#115e59" opacity="0.65" />
                      <path d="M740,84 Q732,56 746,40 Q752,62 748,84 Z" fill="#0f766e" opacity="0.55" />
                      <path d="M760,86 Q770,62 758,44 Q750,66 754,86 Z" fill="#115e59" opacity="0.65" />
                    </svg>
                  </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Health Index & Detail Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. Health Index Radial Gauge Card */}
                <div className="card" style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '1rem', background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
                  <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Heart size={16} color="#dc2626" /> Ocean Health Index
                    </h3>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 120, height: 120, borderRadius: '50%', margin: '0 auto 0.75rem',
                      background: `conic-gradient(${healthColor} ${simulatedHealth * 3.6}deg, #e2e8f0 0deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: healthColor, lineHeight: 1 }}>{simulatedHealth}</div>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8' }}>/100</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: healthColor }}>{getHealthLabel(simulatedHealth)}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                      {selectedSensor ? selectedSensor.nama_lokasi : (selectedKabupaten !== 'all' ? selectedKabupaten : 'Jawa Barat')}
                    </div>
                  </div>
                </div>

                {/* 2. Layer & Biota Detail Card */}
                <div className="card" style={{ flex: 1, padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '1rem', background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                  <div className="card-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Fish size={16} color="#023e8a" />
                      {selectedLayer ? `Zona: ${DEPTH_LAYERS.find(l => l.id === selectedLayer)?.label}` : 'Detail Zona Kedalaman'}
                    </h3>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {selectedLayer ? (
                      <>
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Stasiun di Zona Ini:</div>
                          {(sensorsByDepth[selectedLayer] || []).map(s => {
                            const r = s.latest_reading;
                            return (
                              <div key={s.sensor_id} style={{ padding: '0.65rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.625rem', marginBottom: 6, fontSize: '0.8125rem' }}>
                                <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.sensor_id} — {s.nama_lokasi}</div>
                                {r && (
                                  <div style={{ marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.75rem', color: '#475569' }}>
                                    <span>pH: <strong>{r.ph}</strong></span>
                                    <span>Suhu: <strong>{r.suhu_celsius}°C</strong></span>
                                    <span>DO: <strong>{r.do_mg_l} mg/L</strong></span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {(sensorsByDepth[selectedLayer] || []).length === 0 && (
                            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', padding: '0.75rem', textAlign: 'center' }}>Tidak ada stasiun sensor di zona ini</div>
                          )}
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Spesies Biota Ditemukan:</div>
                          {(BIOTA_BY_DEPTH[selectedLayer] || []).map((name, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0', fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
                              <Fish size={14} color="#023e8a" /> {name}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', textAlign: 'center', padding: '2rem 1rem', lineHeight: 1.5 }}>
                        <strong>Petunjuk:</strong> Klik salah satu zona kedalaman (<em>Permukaan, Dangkal, Menengah, Dalam</em>) pada visualisasi 3D untuk melihat stasiun dan biota terkait.
                      </div>
                    )}
                  </div>
                </div>

              </div>
              </div>
              ); // End of IIFE return
            })()}

      </div>

      {/* Biota Hover Tooltip */}
      {hoveredBiota && (
        <div style={{
          position: 'fixed',
          left: hoveredBiota.x + 15,
          top: hoveredBiota.y + 15,
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(8px)',
          padding: '1rem',
          borderRadius: '12px',
          width: 320,
          zIndex: 9999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
          color: '#f8fafc',
          animation: 'fadeInUp 0.15s ease-out'
        }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#38bdf8', fontSize: '1rem', lineHeight: 1.2 }}>{hoveredBiota.name}</h4>
          <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#94a3b8', marginBottom: '0.75rem' }}>
            {hoveredBiota.ilmiah || 'Spesies Laut'}
          </div>
          
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Karakteristik
          </div>
          <div style={{ fontSize: '0.8125rem', lineHeight: 1.5, marginBottom: '0.75rem', color: '#e2e8f0' }}>
            {hoveredBiota.spesifikasi || 'Belum ada data spesifikasi.'}
          </div>

          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Sejarah & Pengetahuan
          </div>
          <div style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: '#e2e8f0' }}>
            {hoveredBiota.sejarah || 'Belum ada data sejarah.'}
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          from { transform: translateY(0px); }
          to { transform: translateY(-8px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lightRay {
          from { opacity: 0.6; transform: scaleX(1) rotate(var(--r, 0deg)); }
          to   { opacity: 0.25; transform: scaleX(1.15) rotate(var(--r, 0deg)); }
        }
        @keyframes bubbleRise {
          0%   { transform: translateY(0) scale(1); opacity: 0.6; }
          80%  { opacity: 0.3; }
          100% { transform: translateY(-320px) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
