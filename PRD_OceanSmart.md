# Product Requirements Document (PRD)
# OceanSmart — Platform Pemetaan & Monitoring Kawasan Konservasi Laut Berbasis SIG dan IoT

**Versi:** 1.0 (Draft)
**Tanggal:** 3 Agustus 2026
**Status:** Draft — Fase Perencanaan (Data IoT Dummy, dikembangkan secara iteratif/vibe coding tanpa timeline kaku)

---

## 1. Ringkasan Eksekutif

OceanSmart adalah platform digital berbasis **Sistem Informasi Geografis (SIG/GIS)** yang mengintegrasikan **monitoring kualitas air laut secara real-time** melalui sensor IoT, sistem **peringatan dini (early warning)**, **basis data biota laut berdasarkan kedalaman**, dan **chatbot interaktif** untuk memudahkan akses informasi bagi pengelola kawasan konservasi, peneliti, nelayan, dan masyarakat umum.

Pada fase awal ini, seluruh data sensor IoT menggunakan **data dummy/simulasi** untuk keperluan pengembangan dan pengujian sistem sebelum integrasi dengan perangkat keras sensor sesungguhnya.

---

## 2. Latar Belakang & Masalah

Kawasan konservasi laut di Indonesia menghadapi tantangan:
- Minimnya pemantauan kualitas air secara berkelanjutan dan real-time.
- Data kondisi laut yang tersebar, tidak terintegrasi, dan sulit diakses publik.
- Tidak ada sistem peringatan dini terhadap kondisi ekstrem (pemutihan karang, pencemaran, kenaikan suhu).
- Minimnya edukasi publik mengenai keanekaragaman hayati laut di berbagai kedalaman.
- Pengelola kawasan kesulitan mengambil keputusan cepat karena data tidak tersaji secara visual dan terpusat.

## 3. Tujuan Produk

1. Menyediakan peta interaktif kawasan konservasi laut berbasis SIG.
2. Memantau parameter kualitas air (pH, suhu, salinitas, DO, kekeruhan) secara real-time.
3. Memberikan peringatan dini otomatis saat parameter melewati ambang batas aman.
4. Menyajikan informasi biota laut berdasarkan zona kedalaman.
5. Memudahkan akses informasi melalui chatbot berbasis bahasa alami.
6. Mendukung pengambilan keputusan berbasis data untuk pengelola kawasan & dinas terkait.

## 4. Target Pengguna

| Persona | Kebutuhan Utama |
|---|---|
| **Pengelola Kawasan Konservasi / BKKPN** | Monitoring real-time, laporan otomatis, early warning |
| **Peneliti / Akademisi** | Data historis, ekspor data, analisis tren |
| **Nelayan & Masyarakat Pesisir** | Info kondisi laut, peringatan cuaca/kualitas air, edukasi |
| **Wisatawan / Publik Umum** | Info biota laut, edukasi konservasi, chatbot |
| **Dinas Kelautan & Perikanan (Pemerintah)** | Laporan resmi, dashboard rekap wilayah |

## 5. Ruang Lingkup

**In Scope (Fase 1):**
- Peta SIG interaktif kawasan konservasi
- Dashboard monitoring kualitas air (data IoT dummy)
- Sistem early warning berbasis ambang batas
- Database & visualisasi biota laut per kedalaman
- Chatbot informasi dasar
- Fitur tambahan (lihat bagian 7)

**Out of Scope (Fase 1):**
- Integrasi sensor IoT fisik sungguhan (menyusul di Fase 2)
- Aplikasi mobile native (fokus awal web-based/responsive)
- Sistem pembayaran/monetisasi

---

## 6. Fitur Utama (Sesuai Deskripsi Awal)

### 6.1 Pemetaan Kawasan Konservasi Berbasis SIG
- Peta interaktif (Leaflet/Mapbox) menampilkan batas kawasan konservasi, zonasi (inti, pemanfaatan terbatas, rehabilitasi).
- Layer overlay: titik sensor, terumbu karang, lokasi biota, jalur monitoring.
- Filter berdasarkan zona, status kesehatan, jenis ekosistem (karang, mangrove, lamun).

### 6.2 Monitoring Kualitas Air Real-Time
Parameter yang dipantau:
| Parameter | Satuan | Ambang Aman (contoh) |
|---|---|---|
| pH | - | 7.5 – 8.5 |
| Suhu | °C | 26 – 30 |
| Salinitas | ppt | 30 – 35 |
| Dissolved Oxygen (DO) | mg/L | > 5 |
| Kekeruhan (Turbidity) | NTU | < 10 |

- Grafik tren per parameter (harian, mingguan, bulanan).
- Data ditampilkan per titik sensor pada peta.

### 6.3 Early Warning System
- Notifikasi otomatis saat parameter keluar dari ambang batas aman.
- Level peringatan: **Normal (Hijau) → Waspada (Kuning) → Bahaya (Merah)**.
- Riwayat log peringatan.

### 6.4 Informasi Biota Laut Berdasarkan Kedalaman
- Klasifikasi zona kedalaman: Epipelagik (0–200m), Mesopelagik (200–1000m), dst (disesuaikan kondisi kawasan, umumnya dangkal untuk konservasi pesisir: 0–5m, 5–15m, 15–30m+).
- Data biota: nama spesies, status konservasi (IUCN), foto, deskripsi habitat.
- Pencarian & filter biota berdasarkan lokasi dan kedalaman.

### 6.5 Chatbot Informasi
- Menjawab pertanyaan seputar kondisi kualitas air terkini, info biota, status kawasan, cara pakai fitur, dan edukasi konservasi laut.
- Menggunakan **Gemini API** sebagai LLM utama sejak awal pengembangan (bukan rule-based), dengan konteks (system prompt) berisi data real-time dummy (nilai sensor, status early warning, data biota) yang di-inject ke setiap request agar jawaban chatbot selalu relevan dengan kondisi kawasan terkini.
- Mendukung function calling/tool-use dari Gemini API untuk mengambil data terbaru dari backend (misal: "ambil nilai pH sensor X sekarang") sebelum menyusun jawaban.

---

## 7. Fitur Tambahan yang Diusulkan (Value Add)

Berikut fitur tambahan untuk meningkatkan daya tarik dan nilai kompetitif OceanSmart:

### 7.1 Ocean Health Index (Indeks Kesehatan Kawasan)
Skor komposit (0–100) per titik/zona berdasarkan gabungan parameter kualitas air, dihitung otomatis dan divisualisasikan sebagai heatmap warna di peta.

### 7.2 Prediksi & Forecasting Sederhana
Prediksi tren 24–72 jam ke depan (misal risiko kenaikan suhu) menggunakan model statistik sederhana (moving average/regresi) dari data historis dummy — landasan untuk model ML lanjutan di fase berikutnya.

### 7.3 Citizen Science / Laporan Warga
Masyarakat/nelayan dapat mengunggah laporan observasi (foto biota, kejadian pencemaran, ikan mati massal) lengkap dengan lokasi GPS — memperkaya data lapangan di luar sensor.

### 7.4 Notifikasi Multi-Channel
Peringatan dini dikirim via in-app, email, dan WhatsApp (menggunakan API pihak ketiga) ke pengelola & warga terdaftar di zona terdampak.

### 7.5 Perbandingan Multi-Lokasi & Multi-Waktu
Fitur membandingkan kualitas air antar titik sensor atau antar periode waktu dalam satu grafik (side-by-side).

### 7.6 Heatmap Sebaran Parameter
Visualisasi spasial (bukan hanya titik) untuk memperkirakan sebaran suhu/kekeruhan di area sekitar titik sensor menggunakan interpolasi sederhana (IDW).

### 7.7 Integrasi Data Cuaca & Pasang Surut
Menampilkan data cuaca, gelombang, dan pasang surut (dummy/API publik seperti BMKG) yang berkorelasi dengan kondisi laut, membantu prediksi risiko.

### 7.8 Gamifikasi Edukasi
Badge/level untuk pengguna publik yang aktif melaporkan data atau menyelesaikan modul edukasi tentang biota & konservasi laut — mendorong partisipasi komunitas.

### 7.9 Mode Offline / Low-Connectivity
Data cache lokal untuk area pesisir dengan sinyal terbatas; sinkronisasi otomatis saat online kembali.

### 7.10 Laporan Otomatis (Auto-Report Generator)
Ekspor laporan berkala (harian/mingguan/bulanan) dalam format PDF/Excel untuk kebutuhan pelaporan ke dinas/pemerintah, lengkap dengan grafik dan ringkasan status.

### 7.11 Manajemen Multi-Role & Hak Akses
- **Admin**: kelola sensor, data biota, pengguna.
- **Peneliti**: akses data mentah, ekspor data.
- **Publik**: lihat dashboard, chatbot, lapor warga.
- **Dinas**: laporan rekap wilayah, ekspor resmi.

### 7.12 Simulator "What-If" (Edukatif)
Simulasi interaktif menunjukkan dampak perubahan satu parameter (misal suhu naik 2°C) terhadap skor kesehatan ekosistem — untuk edukasi dan sosialisasi publik.

### 7.13 Digital Twin Kawasan Konservasi
Representasi virtual 3D/2.5D dari kawasan konservasi yang mencerminkan kondisi nyata (atau simulasi dummy) secara real-time — menjadi fitur unggulan pembeda OceanSmart.

**Cakupan fitur:**
- **Replika virtual kawasan**: model peta 3D/2.5D per zona (permukaan, kolom air, dasar laut) yang menampilkan titik sensor, terumbu karang, dan sebaran biota sesuai koordinat & kedalaman aslinya.
- **Sinkronisasi data real-time (dummy)**: setiap sensor pada digital twin menampilkan nilai pH, suhu, salinitas, DO, kekeruhan yang ter-update otomatis mengikuti data dummy, sehingga kondisi virtual "mencerminkan" kondisi nyata.
- **Visualisasi kondisi lingkungan**: warna air, kekeruhan, dan indikator kesehatan karang pada model 3D berubah dinamis mengikuti Ocean Health Index (§7.1) — misalnya air terlihat lebih keruh saat turbidity tinggi.
- **Simulasi skenario (What-If Digital Twin)**: menguji dampak perubahan parameter (kenaikan suhu, penurunan DO) terhadap kondisi virtual kawasan sebelum terjadi di dunia nyata — mendukung mitigasi berbasis prediksi.
- **Playback historis**: memutar ulang kondisi kawasan pada rentang waktu tertentu (mis. kondisi 3 bulan lalu vs sekarang) dalam tampilan 3D untuk analisis perubahan.
- **Mode eksplorasi edukatif**: publik/wisatawan dapat "menyelam virtual" menjelajahi kawasan secara digital sambil melihat info biota per kedalaman — menyatukan fitur §6.4 dengan pengalaman visual yang imersif.

**Catatan teknis Fase 1:** Digital twin awal cukup direpresentasikan sebagai **peta 2.5D layered** (per lapisan kedalaman) dengan data dummy live-update, tanpa perlu rendering 3D penuh. Rendering 3D/WebGL penuh (Three.js/CesiumJS) dapat menjadi peningkatan di Fase 2–3 setelah data sensor real tersedia.

---

## 8. Struktur Data IoT Dummy

Karena sensor fisik belum tersedia, sistem menggunakan **generator data dummy** yang mensimulasikan pembacaan sensor secara periodik.

### 8.1 Skema Data Sensor (JSON)

```json
{
  "sensor_id": "OS-SENSOR-001",
  "nama_lokasi": "Titik Monitoring Pulau Karang A",
  "koordinat": {
    "lat": -6.9147,
    "lng": 107.6098
  },
  "kedalaman_pemasangan_m": 5,
  "timestamp": "2026-08-03T09:00:00+07:00",
  "readings": {
    "ph": 8.1,
    "suhu_celsius": 28.4,
    "salinitas_ppt": 33.2,
    "do_mgL": 6.1,
    "kekeruhan_ntu": 4.7
  },
  "status_baterai_persen": 87,
  "status_koneksi": "online"
}
```

### 8.2 Aturan Generator Dummy
- Interval data: setiap **10–15 menit** per sensor (dapat dipercepat untuk testing).
- Nilai disimulasikan dengan variasi acak dalam rentang normal (lihat tabel ambang batas §6.2), dengan **peluang kecil (±5%)** memunculkan anomali untuk menguji fitur early warning.
- Minimal **5–10 titik sensor dummy** tersebar di kawasan simulasi untuk mendukung visualisasi peta yang realistis.
- Data historis dummy dibangkitkan mundur 30–90 hari agar fitur grafik tren & forecasting dapat langsung diuji.

### 8.3 Contoh Skema Data Biota

```json
{
  "biota_id": "BIO-0012",
  "nama_umum": "Ikan Kepe-kepe",
  "nama_ilmiah": "Chaetodon octofasciatus",
  "zona_kedalaman": "0-5m",
  "status_konservasi": "Least Concern",
  "lokasi_terkait": ["OS-SENSOR-001", "OS-SENSOR-003"],
  "deskripsi": "Ditemukan di area terumbu karang dangkal, aktif pada siang hari.",
  "foto_url": "dummy://biota/BIO-0012.jpg"
}
```

### 8.4 Contoh Skema Laporan Warga (Citizen Report)

```json
{
  "laporan_id": "RPT-2026-0045",
  "pelapor": "Nama Pengguna",
  "koordinat": { "lat": -6.9130, "lng": 107.6110 },
  "kategori": "ikan_mati_massal",
  "deskripsi": "Ditemukan beberapa ikan mati di sekitar area tambak.",
  "foto_url": "dummy://laporan/RPT-2026-0045.jpg",
  "timestamp": "2026-08-03T07:22:00+07:00",
  "status_verifikasi": "menunggu_review"
}
```

---

## 9. Arsitektur Teknis (High-Level)

| Layer | Teknologi yang Disarankan |
|---|---|
| **Data IoT (dummy)** | Script generator (Node.js/Python) → publish ke API/DB berkala |
| **Backend/API** | Node.js (Express) atau Python (FastAPI) |
| **Database** | PostgreSQL + PostGIS (untuk data spasial) |
| **Frontend Web** | React + Leaflet/Mapbox GL untuk peta |
| **Digital Twin** | Peta 2.5D layered (Fase 1) → Three.js/CesiumJS untuk render 3D (Fase 2+) |
| **Chatbot / LLM** | Gemini API (Google AI Studio / Vertex AI) dengan context injection data real-time & function calling |
| **Notifikasi** | Email (SMTP), WhatsApp Business API |
| **Hosting** | Cloud (VPS/Cloud Provider) dengan CI/CD sederhana |

---

## 10. Metrik Keberhasilan (KPI)

- Jumlah titik sensor (dummy → real) yang terintegrasi.
- Waktu rata-rata deteksi hingga notifikasi early warning terkirim (< 5 menit).
- Jumlah laporan warga yang masuk & terverifikasi per bulan.
- Tingkat keterlibatan pengguna dengan chatbot (jumlah interaksi/hari).
- Jumlah unduhan laporan otomatis oleh dinas/pengelola.

---

## 11. Roadmap Pengembangan (Berbasis Milestone)

Pengembangan dilakukan secara iteratif tanpa target waktu tetap (build-as-you-go / vibe coding), disusun berdasarkan urutan prioritas fitur:

| Milestone | Fokus |
|---|---|
| **M1 — Fondasi** | Peta SIG, dashboard monitoring (data IoT dummy), early warning, database biota, chatbot dasar dengan Gemini API |
| **M2 — Value Add** | Citizen science, gamifikasi, forecasting sederhana, multi-role, notifikasi multi-channel, Digital Twin 2.5D layered |
| **M3 — Pematangan** | Auto-report generator, mode offline, heatmap sebaran parameter, simulator what-if |
| **M4 — Lanjutan (opsional)** | Integrasi sensor IoT fisik sungguhan, Digital Twin 3D penuh (Three.js/CesiumJS), aplikasi mobile native |

Setiap milestone dapat dikembangkan dan dirilis secara bertahap begitu fiturnya selesai dan berfungsi, tanpa menunggu seluruh milestone rampung.

---

## 12. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Data dummy tidak merepresentasikan kondisi nyata | Validasi rentang nilai dengan referensi baku mutu air laut (KepMenLH) |
| Ketergantungan pada API pihak ketiga (WhatsApp, cuaca) | Sediakan fallback notifikasi via email/in-app |
| Skalabilitas saat sensor real bertambah banyak | Desain database & arsitektur API sejak awal mendukung horizontal scaling |
| Akurasi klasifikasi biota | Kurasi data oleh ahli/peneliti kelautan sebelum publikasi |

---

*Dokumen ini adalah draft awal dan dapat direvisi seiring masukan dari tim dan stakeholder.*
