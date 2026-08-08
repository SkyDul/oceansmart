import { useState, useEffect, useRef } from 'react';
import { Fish, Search, Filter, Anchor, Shield, Compass } from 'lucide-react';
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
import modelGoldfish from '../assets/models/Goldfish.glb';
import modelHalibut from '../assets/models/Halibut.glb';
import modelBullShark from '../assets/models/shark.glb';
import modelCrayfish from '../assets/models/Crayfish.glb';
import modelSwordfish from '../assets/models/Swordfish.glb';

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
  'Ikan Mas': modelGoldfish,
  'Ikan Sebelah (Halibut)': modelHalibut,
  'Hiu Banteng': modelBullShark,
  'Lobster Mutiara': modelCrayfish,
  'Ikan Todak': modelSwordfish,
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
          <h2>Database Biota Laut</h2>
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
                  <div key={b.biota_id} className="biota-card">
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
    </>
  );
}
