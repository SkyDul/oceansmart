import { useState, useEffect, useRef } from 'react';
import { Layers, Thermometer, Droplets, Wind, Eye, Activity, Heart, Play, Pause, SkipBack, Fish, AlertTriangle, Sliders, MapPin, ChevronDown, CheckCircle2, Globe, Building2 } from 'lucide-react';
import '@google/model-viewer';
import api from '../api';

import modelNemo from '../assets/models/nemo.glb';
import modelButterfly from '../assets/models/Butterfly Fish.glb';
import modelTurtle from '../assets/models/kura kura hijau.glb';
import modelBlowfish from '../assets/models/Blowfish.glb';
import modelStarfish from '../assets/models/starfish.glb';
import modelShark from '../assets/models/Great white shark.glb';
import modelSeahorse from '../assets/models/Seahorse.glb';
import modelHumphead from '../assets/models/Humphead.glb';
import modelJellyfish from '../assets/models/Jellyfish.glb';
import modelManta from '../assets/models/Manta ray.glb';
import modelTuna from '../assets/models/Tuna.glb';
import modelOctopus from '../assets/models/gurita.glb';
import modelSwordfish from '../assets/models/Swordfish.glb';
import modelCrayfish from '../assets/models/Crayfish.glb';
import modelGoldfish from '../assets/models/Goldfish.glb';
import modelHalibut from '../assets/models/Halibut.glb';
import modelBullShark from '../assets/models/shark.glb';

const MODEL_MAP = {
  'Ikan Badut (Nemo)': modelNemo,
  'Ikan Kepe-kepe': modelButterfly,
  'Penyu Hijau': modelTurtle,
  'Ikan Buntal': modelBlowfish,
  'Bintang Laut Biru': modelStarfish,
  'Hiu Karang Sirip Hitam': modelShark,
  'Kuda Laut Pygmy': modelSeahorse,
  'Ikan Napoleon': modelHumphead,
  'Ubur-ubur Kotak': modelJellyfish,
  'Pari Manta': modelManta,
  'Ikan Tuna': modelTuna,
  'Gurita Cincin Biru': modelOctopus,
  'Ikan Todak': modelSwordfish,
  'Lobster Mutiara': modelCrayfish,
  'Ikan Mas': modelGoldfish,
  'Ikan Sebelah (Halibut)': modelHalibut,
  'Hiu Banteng': modelBullShark,
  'Hiu Paus': null,
  'Dugong': null,
};

const PROVINCES = [
  { id: 'jabar', name: 'Jawa Barat' },
  { id: 'banten', name: 'Banten' },
  { id: 'dki', name: 'DKI Jakarta (Kep. Seribu)' },
  { id: 'jateng', name: 'Jawa Tengah' },
  { id: 'jatim', name: 'Jawa Timur' },
  { id: 'bali', name: 'Bali' },
];

const KABUPATEN_BY_PROVINCE = {
  jabar: [
    { id: 'all', name: 'Semua Daerah Pesisir Jawa Barat' },
    { id: 'Pangandaran', name: 'Kab. Pangandaran (Pesisir Selatan)' },
    { id: 'Sukabumi', name: 'Kab. Sukabumi / Pelabuhan Ratu (Pesisir Selatan)' },
    { id: 'Indramayu', name: 'Kab. Indramayu (Pesisir Utara / Pantura)' },
    { id: 'Cirebon', name: 'Kota & Kab. Cirebon (Pesisir Utara)' },
    { id: 'Karawang', name: 'Kab. Karawang (Pesisir Utara)' },
    { id: 'Subang', name: 'Kab. Subang (Pesisir Utara)' },
  ],
  banten: [
    { id: 'all', name: 'Semua Daerah Pesisir Banten' },
    { id: 'Pandeglang', name: 'Kab. Pandeglang' },
    { id: 'Serang', name: 'Kab. Serang' },
    { id: 'Lebak', name: 'Kab. Lebak' },
  ],
  dki: [
    { id: 'all', name: 'Semua Daerah Kepulauan Seribu' },
    { id: 'Seribu Utara', name: 'Kec. Kepulauan Seribu Utara' },
    { id: 'Seribu Selatan', name: 'Kec. Kepulauan Seribu Selatan' },
  ],
  jateng: [
    { id: 'all', name: 'Semua Daerah Pesisir Jawa Tengah' },
    { id: 'Jepara', name: 'Kab. Jepara' },
    { id: 'Cilacap', name: 'Kab. Cilacap' },
    { id: 'Kebumen', name: 'Kab. Kebumen' },
  ],
  jatim: [
    { id: 'all', name: 'Semua Daerah Pesisir Jawa Timur' },
    { id: 'Banyuwangi', name: 'Kab. Banyuwangi' },
    { id: 'Situbondo', name: 'Kab. Situbondo' },
    { id: 'Pacitan', name: 'Kab. Pacitan' },
  ],
  bali: [
    { id: 'all', name: 'Semua Daerah Pesisir Bali' },
    { id: 'Badung', name: 'Kab. Badung' },
    { id: 'Buleleng', name: 'Kab. Buleleng' },
    { id: 'Gianyar', name: 'Kab. Gianyar' },
  ]
};

function getSensorsForProvinceAndKabupaten(provinceId, kabupatenId, realSensors) {
  if (provinceId === 'jabar') {
    return kabupatenId === 'all' 
      ? realSensors 
      : realSensors.filter(s => (s.wilayah || '').toLowerCase() === kabupatenId.toLowerCase() || s.nama_lokasi.toLowerCase().includes(kabupatenId.toLowerCase()));
  }

  const kabList = KABUPATEN_BY_PROVINCE[provinceId] || [];
  const activeKabs = kabupatenId === 'all' ? kabList.filter(k => k.id !== 'all') : kabList.filter(k => k.id === kabupatenId);
  
  let dummySensors = [];
  let index = 1;
  
  activeKabs.forEach(kab => {
    for (let i = 1; i <= 2; i++) {
      const sensorId = `OS-DUMMY-${provinceId.toUpperCase()}-${index.toString().padStart(3, '0')}`;
      dummySensors.push({
        sensor_id: sensorId,
        nama_lokasi: `Sensor Telemetri ${kab.name} #${i}`,
        lat: provinceId === 'bali' ? -8.4 + (index * 0.05) : -6.5 - (index * 0.05),
        lng: provinceId === 'bali' ? 115.1 + (index * 0.05) : 106.8 + (index * 0.05),
        kedalaman_m: 2 + (index * 3) % 15,
        status_koneksi: 'online',
        status_baterai: 80 + (index * 7) % 21,
        kabupaten: kab.id,
        latest_reading: {
          timestamp: new Date().toISOString(),
          ph: parseFloat((8.1 + Math.sin(index) * 0.25).toFixed(2)),
          suhu_celsius: parseFloat((28.2 + Math.cos(index) * 1.1).toFixed(1)),
          salinitas_ppt: parseFloat((32.5 + Math.sin(index * 2) * 0.8).toFixed(1)),
          do_mg_l: parseFloat((6.8 + Math.cos(index * 2) * 0.7).toFixed(1)),
          kekeruhan_ntu: parseFloat((2.1 + Math.abs(Math.sin(index * 3)) * 2).toFixed(1)),
          health_index: 75 + (index * 4) % 21
        }
      });
      index++;
    }
  });
  
  return dummySensors;
}

const DEPTH_LAYERS = [
  { id: 'surface', label: 'Permukaan', range: '0m',     color: '#0ea5e9', bgGrad: 'linear-gradient(180deg, #bae6fd 0%, #7dd3fc 100%)' },
  { id: 'shallow', label: 'Dangkal',   range: '0–5m',   color: '#0284c7', bgGrad: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)' },
  { id: 'mid',     label: 'Menengah',  range: '5–15m',  color: '#0369a1', bgGrad: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' },
  { id: 'deep',    label: 'Dalam',     range: '15–30m', color: '#075985', bgGrad: 'linear-gradient(180deg, #0c4a6e 0%, #082f49 100%)' },
];

// Semua biota GLB tersebar merata ke tiap lapisan kedalaman
const BIOTA_BY_DEPTH = {
  'surface': ['Ubur-ubur Kotak', 'Bintang Laut Biru', 'Ikan Mas', 'Hiu Paus'],
  'shallow': ['Ikan Badut (Nemo)', 'Ikan Kepe-kepe', 'Penyu Hijau', 'Gurita Cincin Biru', 'Hiu Banteng'],
  'mid':     ['Ikan Buntal', 'Hiu Karang Sirip Hitam', 'Ikan Napoleon', 'Ikan Tuna', 'Ikan Todak', 'Ikan Sebelah (Halibut)'],
  'deep':    ['Kuda Laut Pygmy', 'Pari Manta', 'Lobster Mutiara', 'Dugong'],
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
  'Hiu Paus': { ilmiah: 'Rhincodon typus', spesifikasi: 'Spesies ikan terbesar pemakan plankton yang jinak.', sejarah: 'Telah mengarungi samudra sejak era Oligosen.' },
  'Dugong': { ilmiah: 'Dugong dugon', spesifikasi: 'Mamalia laut herbivora pemakan lamun.', sejarah: 'Spesies purba pemakan vegetasi dasar laut.' },
  'Ikan Mas': { ilmiah: 'Carassius auratus', spesifikasi: 'Tubuh keemasan mencolok, sirip elegan. Mudah beradaptasi di berbagai kondisi air.', sejarah: 'Didomestikasi di Tiongkok lebih dari 1.000 tahun lalu, kini tersebar global.' },
  'Ikan Sebelah (Halibut)': { ilmiah: 'Hippoglossus hippoglossus', spesifikasi: 'Tubuh pipih lateral dengan kedua mata di sisi kanan. Dapat tumbuh hingga 2 meter.', sejarah: 'Ikan demersal penting secara komersial, hidup di dasar laut bersuhu dingin.' },
  'Hiu Banteng': { ilmiah: 'Carcharhinus leucas', spesifikasi: 'Moncong tumpul, tubuh kekar. Mampu masuk ke perairan tawar dan asin.', sejarah: 'Salah satu hiu paling adaptif, dikenal agresif dan sering mendekati pesisir.' },
};

const DigitalTwinModelViewer = ({ src }) => {
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

  return (
    <model-viewer
      ref={viewerRef}
      src={src}
      camera-orbit="45deg 80deg 100%"
      autoplay
      animation-name={anim}
      interaction-prompt="none"
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    ></model-viewer>
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
  const [simTemp, setSimTemp] = useState(0);
  const [simMode, setSimMode] = useState(false);
  const [playback, setPlayback] = useState(false);
  const [time, setTime] = useState(100);
  const intervalRef = useRef(null);

  useEffect(() => {
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
    if (playback) {
      intervalRef.current = setInterval(() => {
        setTime(t => t >= 100 ? 0 : t + 1);
      }, 200);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playback]);

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

  const simulatedHealth = simMode ? Math.max(0, Math.min(100, currentHealth - simTemp * 8)) : currentHealth;
  const healthColor = getHealthColor(simulatedHealth);

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
            <Sliders size={14} /> Mode Simulasi (What-If)
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
          border: '1px solid #e2e8f0',
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
              icon: '🌡️',
              ok: activeReading.suhu_celsius >= 26 && activeReading.suhu_celsius <= 30,
              range: '26–30°C',
              color: '#f97316',
              bg: '#fff7ed',
              border: '#fed7aa',
            },
            {
              label: 'pH Air',
              value: `${activeReading.ph}`,
              icon: '⚗️',
              ok: activeReading.ph >= 7.5 && activeReading.ph <= 8.5,
              range: '7.5–8.5',
              color: '#8b5cf6',
              bg: '#f5f3ff',
              border: '#ddd6fe',
            },
            {
              label: 'Oksigen Terlarut',
              value: `${activeReading.do_mg_l} mg/L`,
              icon: '💧',
              ok: activeReading.do_mg_l >= 5,
              range: '≥5 mg/L',
              color: '#0284c7',
              bg: '#f0f9ff',
              border: '#bae6fd',
            },
            {
              label: 'Kekeruhan',
              value: `${activeReading.kekeruhan_ntu} NTU`,
              icon: '🌊',
              ok: activeReading.kekeruhan_ntu <= 10,
              range: '0–10 NTU',
              color: '#0891b2',
              bg: '#ecfeff',
              border: '#a5f3fc',
            },
            {
              label: 'Kedalaman',
              value: `${selectedSensor.kedalaman_m} m`,
              icon: '📏',
              ok: true,
              range: selectedSensor.zona,
              color: '#059669',
              bg: '#f0fdf4',
              border: '#a7f3d0',
            },
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
              {params.map(p => (
                <div key={p.label} style={{
                  background: p.ok ? p.bg : '#fff1f2',
                  border: `1px solid ${p.ok ? p.border : '#fecaca'}`,
                  borderRadius: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.1rem',
                  boxShadow: `0 1px 4px -1px ${p.ok ? p.color : '#ef4444'}14`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem' }}>{p.icon}</span>
                    <span style={{
                      fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px',
                      borderRadius: 999, letterSpacing: '0.04em',
                      background: p.ok ? p.color + '18' : '#fee2e2',
                      color: p.ok ? p.color : '#dc2626',
                    }}>
                      {p.ok ? 'NORMAL' : 'ALERT'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94a3b8', lineHeight: 1 }}>{p.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: p.ok ? p.color : '#dc2626', lineHeight: 1.2 }}>{p.value}</div>
                  <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 500 }}>{p.range}</div>
                </div>
              ))}
            </div>
          );
        })()}
        {simMode && (
              <div className="card" style={{ border: '2px solid #0077b6', background: '#f0f9ff', padding: '1.25rem', borderRadius: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
                      <Thermometer size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: '#dc2626' }} />
                      Simulasi Kenaikan Suhu: <span style={{ color: simTemp > 0 ? '#dc2626' : '#0f172a', fontWeight: 800 }}>+{simTemp.toFixed(1)}°C</span>
                    </div>
                    <input 
                      type="range" min="0" max="5" step="0.5" value={simTemp}
                      onChange={e => setSimTemp(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#dc2626', cursor: 'pointer' }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                      <span>Normal (0°C)</span><span>+2.5°C</span><span>+5.0°C (Kritis)</span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center', background: '#ffffff', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Prediksi Health Index</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: healthColor, lineHeight: 1.1 }}>{simulatedHealth}</div>
                    <div style={{ fontSize: '0.75rem', color: healthColor, fontWeight: 700 }}>{getHealthLabel(simulatedHealth)}</div>
                  </div>

                  {simTemp >= 2 && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.8125rem', color: '#b91c1c', maxWidth: 280 }}>
                      <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                      <strong>Peringatan Dini!</strong> Kenaikan suhu +{simTemp}°C dapat memicu pemutihan karang (*coral bleaching*) massal.
                    </div>
                  )}
                </div>
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
                <div className="card-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={18} color="#023e8a" />
                    Cross-Section Kedalaman 3D ({regionLabel})
                  </h3>
                  
                  {/* Playback Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setTime(0); setPlayback(false); }} title="Reset"><SkipBack size={14} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPlayback(!playback)}>
                      {playback ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                      {playback ? 'Memutar Simulasi...' : 'Live Stream'}
                    </span>
                  </div>
                </div>

                {/* Ocean Cross Section Scene */}
                <div style={{ position: 'relative', height: 480, background: 'linear-gradient(180deg, #0ea5e9 0%, #0369a1 30%, #075985 60%, #082f49 100%)', overflow: 'hidden', flex: 1 }}>

                  {/* === SKY === */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, background: 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 100%)', zIndex: 2 }}>
                    {/* Sun glow */}
                    <div style={{ position: 'absolute', top: -24, right: '12%', width: 80, height: 80, background: 'radial-gradient(circle, rgba(255,255,200,0.95) 0%, rgba(255,220,100,0.4) 45%, transparent 70%)', borderRadius: '50%' }} />
                    {/* Clouds */}
                    <div style={{ position: 'absolute', top: 8, left: '20%', width: 60, height: 18, background: 'rgba(255,255,255,0.7)', borderRadius: 20, filter: 'blur(2px)' }} />
                    <div style={{ position: 'absolute', top: 12, left: '22%', width: 80, height: 14, background: 'rgba(255,255,255,0.5)', borderRadius: 20, filter: 'blur(2px)' }} />
                    <div style={{ position: 'absolute', top: 6, left: '55%', width: 50, height: 14, background: 'rgba(255,255,255,0.6)', borderRadius: 20, filter: 'blur(2px)' }} />
                    <div style={{ position: 'absolute', bottom: 10, left: 16, fontSize: '0.6875rem', fontWeight: 800, color: '#0c4a6e', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Permukaan Laut — {regionLabel}
                    </div>
                  </div>

                  {/* === WATER SURFACE WAVE === */}
                  <div style={{ position: 'absolute', top: 44, left: 0, width: '100%', height: 20, zIndex: 3 }}>
                    <svg viewBox="0 0 1440 20" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                      <path fill="rgba(255,255,255,0.55)" d="M0,6 C240,0 480,14 720,6 C960,0 1200,14 1440,6 L1440,20 L0,20 Z">
                        <animate attributeName="d" dur="3.5s" repeatCount="indefinite"
                          values="M0,6 C240,0 480,14 720,6 C960,0 1200,14 1440,6 L1440,20 L0,20 Z;
                                  M0,6 C240,14 480,0 720,6 C960,14 1200,0 1440,6 L1440,20 L0,20 Z;
                                  M0,6 C240,0 480,14 720,6 C960,0 1200,14 1440,6 L1440,20 L0,20 Z"/>
                      </path>
                      <path fill="rgba(186,230,253,0.6)" d="M0,12 C360,4 720,18 1080,12 C1260,8 1380,16 1440,12 L1440,20 L0,20 Z">
                        <animate attributeName="d" dur="2.8s" repeatCount="indefinite"
                          values="M0,12 C360,4 720,18 1080,12 C1260,8 1380,16 1440,12 L1440,20 L0,20 Z;
                                  M0,12 C360,18 720,4 1080,12 C1260,16 1380,8 1440,12 L1440,20 L0,20 Z;
                                  M0,12 C360,4 720,18 1080,12 C1260,8 1380,16 1440,12 L1440,20 L0,20 Z"/>
                      </path>
                    </svg>
                  </div>

                  {/* === LIGHT RAYS from surface === */}
                  <div style={{ position: 'absolute', top: 56, left: 0, right: 0, height: 200, zIndex: 1, pointerEvents: 'none' }}>
                    {[15, 28, 42, 58, 72].map((xPct, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: `${xPct}%`, top: 0,
                        width: 3 + i * 2, height: 180,
                        background: `linear-gradient(180deg, rgba(255,255,255,${0.12 - i * 0.015}) 0%, transparent 100%)`,
                        transform: `rotate(${-8 + i * 4}deg)`,
                        transformOrigin: 'top center',
                        borderRadius: 4,
                        animation: `lightRay ${2.5 + i * 0.4}s ease-in-out ${i * 0.3}s infinite alternate`,
                      }} />
                    ))}
                  </div>

                  {/* === DEPTH LAYERS === */}
                  {DEPTH_LAYERS.map((layer, idx) => {
                    const top = 56 + idx * 106;
                    const isSelected = selectedLayer === layer.id;
                    const layerSensors = sensorsByDepth[layer.id] || [];
                    const layerBiota = BIOTA_BY_DEPTH[layer.id] || [];
                    const turbOpacity = getTurbidityOpacity(simMode ? currentTurbidity + simTemp * 2 : currentTurbidity);
                    // Each layer gets progressively darker
                    const darkOverlay = `rgba(2,47,73,${idx * 0.12})`;

                    return (
                      <div key={layer.id}
                        onClick={() => setSelectedLayer(isSelected ? null : layer.id)}
                        style={{
                          position: 'absolute', top, left: 0, right: 0, height: 106,
                          background: layer.bgGrad,
                          borderTop: `1px solid rgba(255,255,255,${0.25 - idx * 0.04})`,
                          cursor: 'pointer',
                          transition: 'box-shadow 0.2s',
                          boxShadow: isSelected ? 'inset 0 0 0 3px rgba(255,255,255,0.9)' : 'none',
                          zIndex: isSelected ? 10 : 4 + idx,
                        }}>

                        {/* Progressive dark overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: darkOverlay, pointerEvents: 'none' }} />
                        {/* Turbidity */}
                        <div style={{ position: 'absolute', inset: 0, background: `rgba(139,119,80,${turbOpacity * (idx + 1) * 0.12})`, pointerEvents: 'none' }} />

                        {/* Layer Label */}
                        <div style={{ position: 'absolute', left: 14, top: 8, display: 'flex', alignItems: 'center', gap: 6, zIndex: 6 }}>
                          <div style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', padding: '3px 10px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                            {layer.label} · {layer.range}
                          </div>
                          {layerSensors.length > 0 && (
                            <div style={{ background: 'rgba(2,62,138,0.65)', padding: '2px 7px', borderRadius: 20, fontSize: '0.625rem', fontWeight: 600, color: '#bae6fd', border: '1px solid rgba(186,230,253,0.2)' }}>
                              {layerSensors.length} sensor
                            </div>
                          )}
                        </div>

                        {/* Sensor dots — left area */}
                        <div style={{ position: 'absolute', left: 14, right: '52%', top: 34, bottom: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignContent: 'flex-start', overflowY: 'auto', scrollbarWidth: 'none' }}>
                          {layerSensors.map((s) => {
                            const hi = s.latest_reading?.health_index || 75;
                            const c = getHealthColor(simMode ? Math.max(0, hi - simTemp * 8) : hi);
                            return (
                              <div key={s.sensor_id}
                                title={`${s.nama_lokasi}\n${s.sensor_id}\nHI: ${simMode ? Math.max(0, Math.round(hi - simTemp * 8)) : Math.round(hi)}`}
                                style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: '2px solid rgba(255,255,255,0.9)', boxShadow: `0 0 12px ${c}90`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'help', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.4rem', fontWeight: 800, lineHeight: 1 }}>HI</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{simMode ? Math.max(0, Math.round(hi - simTemp * 8)) : Math.round(hi)}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* === BIOTA 3D MODELS — right area === */}
                        {layerBiota.map((biotaName, bi) => {
                          const modelSrc = MODEL_MAP[biotaName];
                          // Spread evenly across right 50-96% of layer
                          const totalBiota = layerBiota.length;
                          const xPct = 50 + ((bi + 0.5) / totalBiota) * 46;
                          // Alternate vertical positions for natural look
                          const yPos = bi % 3 === 0 ? 4 : bi % 3 === 1 ? 22 : 38;
                          const size = modelSrc ? 72 : 40;
                          const floatDur = 2.5 + (bi % 4) * 0.7;
                          const floatDelay = bi * 0.5;
                          return (
                            <div key={biotaName} style={{
                              position: 'absolute',
                              left: `${xPct}%`,
                              top: yPos,
                              width: size,
                              height: size,
                              zIndex: 6,
                              cursor: 'pointer',
                              animation: `float ${floatDur}s ease-in-out ${floatDelay}s infinite alternate`,
                              filter: idx >= 2 ? `brightness(${0.85 - idx * 0.08})` : 'none',
                            }}
                            onMouseMove={(e) => {
                              e.stopPropagation();
                              setHoveredBiota({ name: biotaName, ...BIOTA_INFO[biotaName], x: e.clientX, y: e.clientY });
                            }}
                            onMouseLeave={() => setHoveredBiota(null)}>
                              {modelSrc ? (
                                <DigitalTwinModelViewer src={modelSrc} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Fish size={22} color="rgba(255,255,255,0.85)" />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Seabed texture on last layer */}
                        {idx === 3 && (
                          <>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, background: 'linear-gradient(0deg, #071a2e 0%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }} />
                            {/* Coral silhouettes */}
                            <svg style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: 28, zIndex: 5, pointerEvents: 'none' }} viewBox="0 0 800 28" preserveAspectRatio="none">
                              <path d="M0,28 L0,18 Q10,8 20,16 Q30,6 40,14 Q50,4 60,14 L80,28 Z" fill="rgba(2,47,73,0.8)" />
                              <path d="M120,28 L120,14 Q132,4 144,14 Q156,6 168,16 Q176,8 184,18 L200,28 Z" fill="rgba(2,47,73,0.7)" />
                              <path d="M300,28 L300,16 Q314,4 328,14 Q340,6 352,16 L370,28 Z" fill="rgba(2,47,73,0.75)" />
                              <path d="M500,28 L500,18 Q512,6 524,14 Q534,4 546,14 Q556,8 564,18 L580,28 Z" fill="rgba(2,47,73,0.8)" />
                              <path d="M680,28 L680,14 Q692,4 704,14 Q716,8 724,18 L740,28 Z" fill="rgba(2,47,73,0.7)" />
                            </svg>
                          </>
                        )}
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

                  {/* Depth scale */}
                  <div style={{ position: 'absolute', right: 10, top: 60, bottom: 6, width: 28, zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                    {['0m', '5m', '15m', '30m'].map((d) => (
                      <div key={d} style={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '1px 5px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>{d}</div>
                    ))}
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
                        <strong>Petunjuk:</strong> Klik salah satu zona kedalaman (*Permukaan, Dangkal, Menengah, Dalam*) pada visualisasi 3D untuk melihat stasiun dan biota terkait.
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
