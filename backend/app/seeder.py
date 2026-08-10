"""
Dummy data seeder for OceanSmart.
Generates sensors, readings (90 days historical), biota, zones, and sample alerts.
"""
import random
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Sensor, SensorReading, Alert, Biota, ConservationZone, User


# -------------------- THRESHOLDS --------------------

THRESHOLDS = {
    "ph":            {"min": 7.0, "max": 8.8, "warn_min": 7.3, "warn_max": 8.6},
    "suhu_celsius":  {"min": 24.0, "max": 33.0, "warn_min": 25.0, "warn_max": 31.5},
    "salinitas_ppt": {"min": 26.0, "max": 38.0, "warn_min": 28.0, "warn_max": 36.5},
    "do_mg_l":       {"min": 4.0, "max": 14.0, "warn_min": 4.8, "warn_max": 13.0},
    "kekeruhan_ntu": {"min": 0.0, "max": 25.0, "warn_min": 0.0, "warn_max": 7.0},
}

# Karakteristik dasar tiap wilayah — berpengaruh ke base value generator
# Sehingga data tiap wilayah berbeda tapi tetap realistis
WILAYAH_PROFILE = {
    # Jawa Barat Selatan — pesisir selatan, ombak lebih tinggi
    "Pangandaran": {"ph_bias": 0.02,  "suhu_bias": 0.0,  "sal_bias": 0.2,  "do_bias": 0.3,  "turb_bias": 0.5,  "anomaly_rate": 0.01},
    "Sukabumi":    {"ph_bias": 0.0,   "suhu_bias": -0.3, "sal_bias": 0.0,  "do_bias": 0.5,  "turb_bias": 0.3,  "anomaly_rate": 0.015},
    # Jawa Barat Utara (Pantura) — lebih tercemar, turbidity lebih tinggi
    "Indramayu":   {"ph_bias": -0.05, "suhu_bias": 0.5,  "sal_bias": -0.3, "do_bias": -0.4, "turb_bias": 4.0,  "anomaly_rate": 0.04},
    "Cirebon":           {"ph_bias": -0.08, "suhu_bias": 0.6,  "sal_bias": -0.5, "do_bias": -0.5, "turb_bias": 4.5,  "anomaly_rate": 0.05},
    "Karawang":          {"ph_bias": -0.06, "suhu_bias": 0.4,  "sal_bias": -0.4, "do_bias": -0.3, "turb_bias": 1.8,  "anomaly_rate": 0.03},
    "Subang":            {"ph_bias": -0.04, "suhu_bias": 0.3,  "sal_bias": -0.2, "do_bias": -0.2, "turb_bias": 1.5,  "anomaly_rate": 0.025},
    # Bali — kondisi terbaik
    "Nusa Penida":       {"ph_bias": 0.05,  "suhu_bias": -0.2, "sal_bias": 0.5,  "do_bias": 0.8,  "turb_bias": -0.5, "anomaly_rate": 0.005},
    "Denpasar":          {"ph_bias": 0.0,   "suhu_bias": 0.1,  "sal_bias": 0.3,  "do_bias": 0.4,  "turb_bias": 0.2,  "anomaly_rate": 0.02},
    "Buleleng":          {"ph_bias": 0.02,  "suhu_bias": -0.1, "sal_bias": 0.4,  "do_bias": 0.6,  "turb_bias": 0.1,  "anomaly_rate": 0.01},
    # Jawa Timur
    "Banyuwangi":        {"ph_bias": 0.03,  "suhu_bias": 0.2,  "sal_bias": 0.2,  "do_bias": 0.3,  "turb_bias": 0.4,  "anomaly_rate": 0.015},
    "Malang":            {"ph_bias": 0.0,   "suhu_bias": -0.1, "sal_bias": 0.1,  "do_bias": 0.5,  "turb_bias": 0.6,  "anomaly_rate": 0.02},
    # Wilayah Konservasi Nasional
    "Karimunjawa":       {"ph_bias": 0.04,  "suhu_bias": 0.1,  "sal_bias": 0.4,  "do_bias": 0.6,  "turb_bias": -0.3, "anomaly_rate": 0.01},
    "Parangtritis":      {"ph_bias": -0.02, "suhu_bias": 0.3,  "sal_bias": -0.2, "do_bias": 0.0,  "turb_bias": 1.2,  "anomaly_rate": 0.03},
    "Wakatobi":          {"ph_bias": 0.06,  "suhu_bias": -0.3, "sal_bias": 0.6,  "do_bias": 1.0,  "turb_bias": -0.8, "anomaly_rate": 0.003},
    "Bunaken":           {"ph_bias": 0.07,  "suhu_bias": -0.4, "sal_bias": 0.7,  "do_bias": 1.2,  "turb_bias": -1.0, "anomaly_rate": 0.002},
    "Raja Ampat":        {"ph_bias": 0.08,  "suhu_bias": -0.5, "sal_bias": 0.8,  "do_bias": 1.5,  "turb_bias": -1.2, "anomaly_rate": 0.001},
    "Manggarai Barat":   {"ph_bias": 0.05,  "suhu_bias": -0.2, "sal_bias": 0.5,  "do_bias": 0.9,  "turb_bias": -0.6, "anomaly_rate": 0.005},
    "Maluku Tengah":     {"ph_bias": 0.04,  "suhu_bias": -0.1, "sal_bias": 0.4,  "do_bias": 0.7,  "turb_bias": -0.4, "anomaly_rate": 0.008},
    # Default
    "default":           {"ph_bias": 0.0,   "suhu_bias": 0.0,  "sal_bias": 0.0,  "do_bias": 0.0,  "turb_bias": 0.0,  "anomaly_rate": 0.02},
}


# -------------------- SENSOR DATA --------------------
# Setiap sensor punya sensor_id unik, nama_lokasi berbeda, dan wilayah masing-masing
# Ini adalah data awal — operator dapat menambah sensor baru via CRUD

SENSORS_DATA = [
    # ── Pangandaran (Jabar Selatan) — 3 sensor, kondisi baik ──
    {"sensor_id": "OS-PGD-001", "nama_lokasi": "Cagar Alam Laut Pangandaran", "lat": -7.7100, "lng": 108.6500, "kedalaman_m": 3, "zona": "inti", "provinsi": "Jawa Barat", "wilayah": "Pangandaran"},
    {"sensor_id": "OS-PGD-002", "nama_lokasi": "Padang Lamun Karapyak", "lat": -7.7200, "lng": 108.6200, "kedalaman_m": 5, "zona": "pemanfaatan_terbatas", "provinsi": "Jawa Barat", "wilayah": "Pangandaran"},
    {"sensor_id": "OS-PGD-003", "nama_lokasi": "Dermaga Batu Hiu Pangandaran", "lat": -7.6800, "lng": 108.5900, "kedalaman_m": 1, "zona": "pemanfaatan_umum", "provinsi": "Jawa Barat", "wilayah": "Pangandaran"},

    # ── Sukabumi / Pelabuhan Ratu (Jabar Selatan) — 2 sensor ──
    {"sensor_id": "OS-SKB-001", "nama_lokasi": "Teluk Pelabuhan Ratu", "lat": -6.9800, "lng": 106.5500, "kedalaman_m": 12, "zona": "inti", "provinsi": "Jawa Barat", "wilayah": "Sukabumi"},
    {"sensor_id": "OS-SKB-002", "nama_lokasi": "Karang Hawu Pelabuhan Ratu", "lat": -6.9500, "lng": 106.4500, "kedalaman_m": 6, "zona": "pemanfaatan_terbatas", "provinsi": "Jawa Barat", "wilayah": "Sukabumi"},

    # ── Indramayu (Pantura Jabar) — 2 sensor, sedikit tercemar ──
    {"sensor_id": "OS-IDR-001", "nama_lokasi": "Mangrove Karangsong Indramayu", "lat": -6.3300, "lng": 108.3600, "kedalaman_m": 2, "zona": "rehabilitasi", "provinsi": "Jawa Barat", "wilayah": "Indramayu"},
    {"sensor_id": "OS-IDR-002", "nama_lokasi": "Pantai Tirta Maya Indramayu", "lat": -6.3800, "lng": 108.4200, "kedalaman_m": 4, "zona": "pemanfaatan_umum", "provinsi": "Jawa Barat", "wilayah": "Indramayu"},

    # ── Cirebon (Pantura Jabar) — 2 sensor, tercemar industri ──
    {"sensor_id": "OS-CRB-001", "nama_lokasi": "Pesisir Kejawanan Cirebon", "lat": -6.7300, "lng": 108.5700, "kedalaman_m": 3, "zona": "rehabilitasi", "provinsi": "Jawa Barat", "wilayah": "Cirebon"},
    {"sensor_id": "OS-CRB-002", "nama_lokasi": "Muara Sungai Cimanuk Cirebon", "lat": -6.7500, "lng": 108.5500, "kedalaman_m": 1, "zona": "rehabilitasi", "provinsi": "Jawa Barat", "wilayah": "Cirebon"},

    # ── Karawang & Subang (Pantura Jabar) — 1 sensor masing-masing ──
    {"sensor_id": "OS-KRW-001", "nama_lokasi": "Tanjung Pakis Karawang", "lat": -5.9600, "lng": 107.1600, "kedalaman_m": 2, "zona": "pemanfaatan_terbatas", "provinsi": "Jawa Barat", "wilayah": "Karawang"},
    {"sensor_id": "OS-SBG-001", "nama_lokasi": "Pantai Pondok Bali Subang", "lat": -6.2100, "lng": 107.8200, "kedalaman_m": 3, "zona": "pemanfaatan_umum", "provinsi": "Jawa Barat", "wilayah": "Subang"},

    # ── Parangtritis (DIY) — 2 sensor, ombak tinggi ──
    {"sensor_id": "OS-PRG-001", "nama_lokasi": "Pantai Parangtritis Utama", "lat": -8.0257, "lng": 110.3324, "kedalaman_m": 4, "zona": "pemanfaatan_umum", "provinsi": "DI Yogyakarta", "wilayah": "Parangtritis"},
    {"sensor_id": "OS-PRG-002", "nama_lokasi": "Laguna Pantai Depok Bantul", "lat": -7.9900, "lng": 110.2900, "kedalaman_m": 2, "zona": "pemanfaatan_terbatas", "provinsi": "DI Yogyakarta", "wilayah": "Parangtritis"},

    # ── Karimunjawa (Jateng) — 3 sensor, kondisi baik ──
    {"sensor_id": "OS-KJW-001", "nama_lokasi": "Taman Nasional Karimunjawa Inti", "lat": -5.8670, "lng": 110.4388, "kedalaman_m": 8, "zona": "inti", "provinsi": "Jawa Tengah", "wilayah": "Karimunjawa"},
    {"sensor_id": "OS-KJW-002", "nama_lokasi": "Perairan Pulau Menjangan Karimunjawa", "lat": -5.8200, "lng": 110.4800, "kedalaman_m": 12, "zona": "pemanfaatan_terbatas", "provinsi": "Jawa Tengah", "wilayah": "Karimunjawa"},
    {"sensor_id": "OS-KJW-003", "nama_lokasi": "Zona Snorkeling Karimunjawa", "lat": -5.8900, "lng": 110.4200, "kedalaman_m": 3, "zona": "pemanfaatan_umum", "provinsi": "Jawa Tengah", "wilayah": "Karimunjawa"},

    # ── Bali — Nusa Penida (3 sensor, sangat bersih) ──
    {"sensor_id": "OS-NPD-001", "nama_lokasi": "Konservasi Manta Point Nusa Penida", "lat": -8.7400, "lng": 115.4900, "kedalaman_m": 15, "zona": "inti", "provinsi": "Bali", "wilayah": "Nusa Penida"},
    {"sensor_id": "OS-NPD-002", "nama_lokasi": "Crystal Bay Nusa Penida", "lat": -8.7200, "lng": 115.4700, "kedalaman_m": 10, "zona": "pemanfaatan_terbatas", "provinsi": "Bali", "wilayah": "Nusa Penida"},
    {"sensor_id": "OS-NPD-003", "nama_lokasi": "Pantai Kelingking Nusa Penida", "lat": -8.7600, "lng": 115.4500, "kedalaman_m": 5, "zona": "pemanfaatan_umum", "provinsi": "Bali", "wilayah": "Nusa Penida"},

    # ── Bali — Buleleng / Lovina ──
    {"sensor_id": "OS-BLL-001", "nama_lokasi": "Taman Laut Lovina Buleleng", "lat": -8.1600, "lng": 115.0200, "kedalaman_m": 6, "zona": "pemanfaatan_terbatas", "provinsi": "Bali", "wilayah": "Buleleng"},
    {"sensor_id": "OS-BLL-002", "nama_lokasi": "Pantai Singaraja Buleleng", "lat": -8.1100, "lng": 115.0900, "kedalaman_m": 3, "zona": "pemanfaatan_umum", "provinsi": "Bali", "wilayah": "Buleleng"},

    # ── Jawa Timur — Banyuwangi / Alas Purwo ──
    {"sensor_id": "OS-BWI-001", "nama_lokasi": "Taman Nasional Alas Purwo", "lat": -8.7000, "lng": 114.3600, "kedalaman_m": 10, "zona": "inti", "provinsi": "Jawa Timur", "wilayah": "Banyuwangi"},
    {"sensor_id": "OS-BWI-002", "nama_lokasi": "Perairan Selat Bali Banyuwangi", "lat": -8.4000, "lng": 114.4000, "kedalaman_m": 8, "zona": "pemanfaatan_terbatas", "provinsi": "Jawa Timur", "wilayah": "Banyuwangi"},
    {"sensor_id": "OS-BWI-003", "nama_lokasi": "Pantai Boom Banyuwangi", "lat": -8.2200, "lng": 114.3700, "kedalaman_m": 2, "zona": "pemanfaatan_umum", "provinsi": "Jawa Timur", "wilayah": "Banyuwangi"},

    # ── Wakatobi (Sulawesi Tenggara) — 3 sensor, biodiversitas tinggi ──
    {"sensor_id": "OS-WKT-001", "nama_lokasi": "Taman Nasional Wakatobi Inti", "lat": -5.3500, "lng": 123.5800, "kedalaman_m": 20, "zona": "inti", "provinsi": "Sulawesi Tenggara", "wilayah": "Wakatobi"},
    {"sensor_id": "OS-WKT-002", "nama_lokasi": "Perairan Pulau Wangi-Wangi", "lat": -5.3200, "lng": 123.5400, "kedalaman_m": 12, "zona": "pemanfaatan_terbatas", "provinsi": "Sulawesi Tenggara", "wilayah": "Wakatobi"},
    {"sensor_id": "OS-WKT-003", "nama_lokasi": "Dermaga Wisata Wakatobi", "lat": -5.3800, "lng": 123.6100, "kedalaman_m": 3, "zona": "pemanfaatan_umum", "provinsi": "Sulawesi Tenggara", "wilayah": "Wakatobi"},

    # ── Bunaken (Sulawesi Utara) — 2 sensor, salah satu terbaik di dunia ──
    {"sensor_id": "OS-BNK-001", "nama_lokasi": "Taman Laut Bunaken Inti", "lat": 1.6200, "lng": 124.7500, "kedalaman_m": 18, "zona": "inti", "provinsi": "Sulawesi Utara", "wilayah": "Bunaken"},
    {"sensor_id": "OS-BNK-002", "nama_lokasi": "Perairan Pulau Manado Tua", "lat": 1.5800, "lng": 124.6900, "kedalaman_m": 10, "zona": "pemanfaatan_terbatas", "provinsi": "Sulawesi Utara", "wilayah": "Bunaken"},

    # ── Komodo (NTT) — 2 sensor ──
    {"sensor_id": "OS-KMD-001", "nama_lokasi": "Taman Nasional Komodo Laut", "lat": -8.5300, "lng": 119.4500, "kedalaman_m": 15, "zona": "inti", "provinsi": "Nusa Tenggara Timur", "wilayah": "Manggarai Barat"},
    {"sensor_id": "OS-KMD-002", "nama_lokasi": "Perairan Pink Beach Komodo", "lat": -8.5800, "lng": 119.5000, "kedalaman_m": 5, "zona": "pemanfaatan_terbatas", "provinsi": "Nusa Tenggara Timur", "wilayah": "Manggarai Barat"},

    # ── Raja Ampat (Papua Barat Daya) — 3 sensor, terkaya di dunia ──
    {"sensor_id": "OS-RAA-001", "nama_lokasi": "Kepulauan Raja Ampat Inti", "lat": -0.2300, "lng": 130.5200, "kedalaman_m": 20, "zona": "inti", "provinsi": "Papua Barat Daya", "wilayah": "Raja Ampat"},
    {"sensor_id": "OS-RAA-002", "nama_lokasi": "Misool Raja Ampat", "lat": -1.8700, "lng": 130.1400, "kedalaman_m": 15, "zona": "inti", "provinsi": "Papua Barat Daya", "wilayah": "Raja Ampat"},
    {"sensor_id": "OS-RAA-003", "nama_lokasi": "Wayag Raja Ampat", "lat": 0.1900, "lng": 130.0200, "kedalaman_m": 8, "zona": "pemanfaatan_terbatas", "provinsi": "Papua Barat Daya", "wilayah": "Raja Ampat"},

    # ── Maluku Tengah ──
    {"sensor_id": "OS-MLK-001", "nama_lokasi": "Taman Nasional Manusela Maluku", "lat": -2.9500, "lng": 129.5800, "kedalaman_m": 12, "zona": "rehabilitasi", "provinsi": "Maluku", "wilayah": "Maluku Tengah"},
]


# -------------------- BIOTA DATA --------------------

BIOTA_DATA = [
    {"biota_id": "BIO-0001", "nama_umum": "Ikan Badut (Nemo)", "nama_ilmiah": "Amphiprion ocellaris", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Ikan kecil berwarna oranye dengan garis putih, hidup bersimbiosis dengan anemon laut di perairan dangkal.", "habitat": "Terumbu karang dangkal", "foto_url": "/images/biota/clownfish.jpg"},
    {"biota_id": "BIO-0002", "nama_umum": "Ikan Kepe-kepe", "nama_ilmiah": "Chaetodon octofasciatus", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Ikan berbentuk pipih dengan pola garis hitam-kuning, sering ditemukan berkelompok di area terumbu karang.", "habitat": "Terumbu karang dangkal", "foto_url": "/images/biota/butterflyfish.jpg"},
    {"biota_id": "BIO-0003", "nama_umum": "Penyu Hijau", "nama_ilmiah": "Chelonia mydas", "zona_kedalaman": "0-15m", "status_konservasi": "Endangered", "deskripsi": "Penyu laut herbivora berukuran besar, memakan lamun dan alga. Sering terlihat di perairan dangkal kawasan konservasi.", "habitat": "Padang lamun, terumbu karang", "foto_url": "/images/biota/green_turtle.jpg"},
    {"biota_id": "BIO-0004", "nama_umum": "Ikan Buntal", "nama_ilmiah": "Tetraodontidae", "zona_kedalaman": "5-15m", "status_konservasi": "Least Concern", "deskripsi": "Ikan yang dapat menggelembungkan dirinya menjadi seperti bola berduri saat terancam.", "habitat": "Terumbu karang, perairan pantai", "foto_url": "/images/biota/blowfish.jpg"},
    {"biota_id": "BIO-0005", "nama_umum": "Bintang Laut Biru", "nama_ilmiah": "Linckia laevigata", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Bintang laut berwarna biru cerah, bergerak lambat di atas karang dan pasir.", "habitat": "Terumbu karang, substrat berpasir", "foto_url": "/images/biota/blue_starfish.jpg"},
    {"biota_id": "BIO-0006", "nama_umum": "Hiu Karang Sirip Hitam", "nama_ilmiah": "Carcharhinus melanopterus", "zona_kedalaman": "5-15m", "status_konservasi": "Vulnerable", "deskripsi": "Hiu berukuran sedang dengan ujung sirip berwarna hitam, predator puncak di ekosistem terumbu karang.", "habitat": "Terumbu karang, laguna", "foto_url": "/images/biota/blacktip_shark.jpg"},
    {"biota_id": "BIO-0007", "nama_umum": "Kuda Laut Pygmy", "nama_ilmiah": "Hippocampus bargibanti", "zona_kedalaman": "15-30m", "status_konservasi": "Data Deficient", "deskripsi": "Kuda laut sangat kecil (< 2cm) yang berkamuflase sempurna di kipas laut Muricella.", "habitat": "Kipas laut (gorgonian)", "foto_url": "/images/biota/pygmy_seahorse.jpg"},
    {"biota_id": "BIO-0008", "nama_umum": "Ikan Napoleon", "nama_ilmiah": "Cheilinus undulatus", "zona_kedalaman": "5-15m", "status_konservasi": "Endangered", "deskripsi": "Ikan karang terbesar, bisa mencapai 2 meter. Memiliki tonjolan khas di kepala dan bibir tebal.", "habitat": "Terumbu karang, slope", "foto_url": "/images/biota/napoleon_wrasse.jpg"},
    {"biota_id": "BIO-0009", "nama_umum": "Ubur-ubur Kotak", "nama_ilmiah": "Chironex fleckeri", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Ubur-ubur transparan berbentuk kotak, memiliki tentakel beracun yang sangat berbahaya bagi manusia.", "habitat": "Perairan dangkal tropis", "foto_url": "/images/biota/box_jellyfish.jpg"},
    {"biota_id": "BIO-0010", "nama_umum": "Pari Manta", "nama_ilmiah": "Mobula birostris", "zona_kedalaman": "5-30m", "status_konservasi": "Vulnerable", "deskripsi": "Pari terbesar di dunia, memiliki lebar sayap hingga 7 meter. Memakan plankton di dekat permukaan.", "habitat": "Pelagis, cleaning station", "foto_url": "/images/biota/manta_ray.jpg"},
    {"biota_id": "BIO-0011", "nama_umum": "Ikan Tuna", "nama_ilmiah": "Thunnus", "zona_kedalaman": "15-30m", "status_konservasi": "Near Threatened", "deskripsi": "Ikan pelagis besar perenang cepat yang sering bermigrasi melintasi samudera.", "habitat": "Perairan laut lepas", "foto_url": "/images/biota/tuna.jpg"},
    {"biota_id": "BIO-0012", "nama_umum": "Gurita Cincin Biru", "nama_ilmiah": "Hapalochlaena lunulata", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Gurita berukuran kecil dengan cincin biru bercahaya saat merasa terancam, memiliki bisa yang sangat mematikan.", "habitat": "Celah karang, rubble", "foto_url": "/images/biota/blue_ring_octopus.jpg"},
    {"biota_id": "BIO-0013", "nama_umum": "Ikan Mas", "nama_ilmiah": "Carassius auratus", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Ikan berwarna keemasan mencolok dengan sirip yang elegan. Mudah beradaptasi di berbagai kondisi perairan dan dikenal sebagai ikan hias populer di seluruh dunia.", "habitat": "Perairan dangkal, laguna, kolam pesisir", "foto_url": "/images/biota/goldfish.jpg"},
    {"biota_id": "BIO-0014", "nama_umum": "Ikan Sebelah (Halibut)", "nama_ilmiah": "Hippoglossus hippoglossus", "zona_kedalaman": "15-30m", "status_konservasi": "Vulnerable", "deskripsi": "Ikan demersal berbentuk pipih lateral dengan kedua mata berada di satu sisi tubuh. Dapat tumbuh hingga 2 meter dan merupakan ikan dasar laut yang penting secara komersial.", "habitat": "Dasar laut berpasir, perairan dingin", "foto_url": "/images/biota/halibut.jpg"},
    {"biota_id": "BIO-0015", "nama_umum": "Hiu Banteng", "nama_ilmiah": "Carcharhinus leucas", "zona_kedalaman": "0-15m", "status_konservasi": "Vulnerable", "deskripsi": "Hiu bertubuh kekar dengan moncong tumpul. Salah satu hiu paling adaptif — mampu hidup di perairan laut maupun tawar. Dikenal agresif dan sering mendekati kawasan pesisir.", "habitat": "Muara, laguna, perairan dangkal pesisir", "foto_url": "/images/biota/bull_shark.jpg"},
    {"biota_id": "BIO-0016", "nama_umum": "Lobster Mutiara", "nama_ilmiah": "Panulirus ornatus", "zona_kedalaman": "15-30m", "status_konservasi": "Near Threatened", "deskripsi": "Lobster besar bercorak mutiara indah yang hidup di dasar karang dan celah batu. Komoditas perikanan bernilai tinggi di perairan tropis Indonesia.", "habitat": "Dasar karang, celah batu, slope dalam", "foto_url": "/images/biota/lobster.jpg"},
    {"biota_id": "BIO-0017", "nama_umum": "Ikan Todak", "nama_ilmiah": "Xiphias gladius", "zona_kedalaman": "5-30m", "status_konservasi": "Least Concern", "deskripsi": "Ikan pelagis besar dengan moncong rahang atas yang memanjang menyerupai pedang. Perenang cepat dan predator tangguh di perairan laut terbuka tropis hingga subtropis.", "habitat": "Perairan laut lepas, zona pelagis", "foto_url": "/images/biota/swordfish.jpg"},
    {"biota_id": "BIO-0018", "nama_umum": "Ikan Sungut Ganda (Anglerfish)", "nama_ilmiah": "Lophiiformes", "zona_kedalaman": "15-30m", "status_konservasi": "Least Concern", "deskripsi": "Ikan laut dalam unik dengan organ bioluminesensi penggantung di atas kepala untuk memikat mangsa.", "habitat": "Dasar laut dalam, abyss", "foto_url": "/images/biota/anglerfish.jpg"},
    {"biota_id": "BIO-0019", "nama_umum": "Kerapu Sunu (Coral Grouper)", "nama_ilmiah": "Plectropomus leopardus", "zona_kedalaman": "5-15m", "status_konservasi": "Least Concern", "deskripsi": "Ikan kerapu merah dengan bintik biru mencolok, predator karang bernilai ekonomi tinggi.", "habitat": "Terumbu karang, lereng luar", "foto_url": "/images/biota/grouper.jpg"},
    {"biota_id": "BIO-0020", "nama_umum": "Lumba-lumba Botol", "nama_ilmiah": "Tursiops truncatus", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Mamalia laut sangat cerdas yang sering bersosialisasi dan melompat indah di permukaan pesisir.", "habitat": "Pesisir, laut lepas", "foto_url": "/images/biota/dolphin.jpg"},
    {"biota_id": "BIO-0021", "nama_umum": "Hiu Goblin", "nama_ilmiah": "Mitsukurina owstoni", "zona_kedalaman": "15-30m", "status_konservasi": "Least Concern", "deskripsi": "Hiu fosil hidup laut dalam yang memiliki moncong panjang pipih dan rahang elastis penjangkau mangsa.", "habitat": "Laut dalam, slope benua", "foto_url": "/images/biota/goblin_shark.jpg"},
    {"biota_id": "BIO-0022", "nama_umum": "Ikan Kembung", "nama_ilmiah": "Rastrelliger kanagurta", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Ikan pelagis kecil perenang cepat dalam koloni besar, sumber konsumsi protein utama masyarakat pesisir.", "habitat": "Perairan pesisir, neritik", "foto_url": "/images/biota/mackerel.jpg"},
    {"biota_id": "BIO-0023", "nama_umum": "Ikan Gramma Kerajaan", "nama_ilmiah": "Gramma loreto", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Ikan karang hias mungil dwiwarna ungu dan kuning terang, sering berlindung di celah terumbu karang.", "habitat": "Gua karang, dinding terumbu", "foto_url": "/images/biota/royal_gramma.jpg"},
    {"biota_id": "BIO-0024", "nama_umum": "Bulu Babi", "nama_ilmiah": "Diadema setosum", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Invertebrata pemakan alga dengan duri-duri tajam panjang yang menjaga kebersihan terumbu karang.", "habitat": "Rubble, dasar karang", "foto_url": "/images/biota/sea_urchin.jpg"},
    {"biota_id": "BIO-0025", "nama_umum": "Ikan Turbot", "nama_ilmiah": "Scophthalmus maximus", "zona_kedalaman": "15-30m", "status_konservasi": "Least Concern", "deskripsi": "Ikan demersal pipih besar yang tersamar sempurna dengan dasar laut berpasir dan lumpur.", "habitat": "Substrat pasir, dasar laut", "foto_url": "/images/biota/turbot.jpg"},
    {"biota_id": "BIO-0026", "nama_umum": "Paus Biru", "nama_ilmiah": "Balaenoptera musculus", "zona_kedalaman": "0-15m", "status_konservasi": "Endangered", "deskripsi": "Hewan terbesar di bumi, mamalia laut raksasa penyaring krill yang melintasi samudera terbuka.", "habitat": "Samudera pelagis", "foto_url": "/images/biota/blue_whale.jpg"},
]


# -------------------- ZONES DATA --------------------

ZONES_DATA = [
    {
        "name": "Zona Inti Cagar Alam Pananjung",
        "zone_type": "inti",
        "description": "Area lindung utama Cagar Alam Laut Pangandaran dengan tutupan karang tertinggi.",
        "color": "#dc2626",
        "geojson": {
            "type": "Polygon",
            "coordinates": [[
                [108.630, -7.695], [108.660, -7.695], [108.670, -7.715],
                [108.660, -7.730], [108.630, -7.730], [108.620, -7.715],
                [108.630, -7.695]
            ]]
        }
    },
    {
        "name": "Zona Pemanfaatan Terbatas Karapyak",
        "zone_type": "pemanfaatan_terbatas",
        "description": "Area wisata bahari terbatas dan penelitian di perairan Karapyak.",
        "color": "#eab308",
        "geojson": {
            "type": "Polygon",
            "coordinates": [[
                [108.610, -7.710], [108.635, -7.710], [108.640, -7.730],
                [108.615, -7.735], [108.605, -7.725], [108.610, -7.710]
            ]]
        }
    },
    {
        "name": "Zona Rehabilitasi Mangrove Citanduy",
        "zone_type": "rehabilitasi",
        "description": "Area restorasi ekosistem mangrove di muara Sungai Citanduy.",
        "color": "#16a34a",
        "geojson": {
            "type": "Polygon",
            "coordinates": [[
                [108.540, -7.690], [108.570, -7.690], [108.570, -7.710],
                [108.540, -7.710], [108.540, -7.690]
            ]]
        }
    },
    {
        "name": "Zona Pemanfaatan Umum Batu Hiu",
        "zone_type": "pemanfaatan_umum",
        "description": "Area terbuka untuk aktivitas nelayan tradisional dan wisata Batu Hiu.",
        "color": "#2563eb",
        "geojson": {
            "type": "Polygon",
            "coordinates": [[
                [108.575, -7.670], [108.600, -7.670], [108.605, -7.695],
                [108.580, -7.695], [108.575, -7.670]
            ]]
        }
    },
]


def calculate_health_index(ph, suhu, salinitas, do_val, kekeruhan) -> float:
    """Calculate Ocean Health Index (0-100) based on water quality parameters."""
    scores = []

    # pH score
    if 7.8 <= ph <= 8.3:
        scores.append(100)
    elif 7.5 <= ph <= 8.5:
        deviation = max(abs(ph - 8.05) - 0.25, 0) / 0.45
        scores.append(max(100 - deviation * 60, 30))
    else:
        scores.append(10)

    # Temperature score
    if 27 <= suhu <= 29:
        scores.append(100)
    elif 26 <= suhu <= 30:
        deviation = max(abs(suhu - 28) - 1, 0) / 1
        scores.append(max(100 - deviation * 60, 30))
    else:
        scores.append(10)

    # Salinity score
    if 31 <= salinitas <= 34:
        scores.append(100)
    elif 30 <= salinitas <= 35:
        deviation = max(abs(salinitas - 32.5) - 1.5, 0) / 1
        scores.append(max(100 - deviation * 60, 30))
    else:
        scores.append(10)

    # DO score
    if do_val >= 6:
        scores.append(100)
    elif do_val >= 5:
        scores.append(70)
    else:
        scores.append(max(do_val / 5 * 50, 10))

    # Turbidity score (lower is better)
    if kekeruhan <= 4:
        scores.append(100)
    elif kekeruhan <= 7:
        scores.append(70)
    elif kekeruhan <= 10:
        scores.append(40)
    else:
        scores.append(10)

    return round(sum(scores) / len(scores), 1)


# -------------------- REAL-TIME TELEMETRY CACHE --------------------

REALTIME_OCEAN_CACHE = {
    "last_fetched": None,
    "sea_temperature": 28.2,
    "wave_height": 1.1
}

def update_realtime_ocean_cache():
    import urllib.request
    import json
    from datetime import datetime
    
    # Hanya lakukan request baru setiap 5 menit sekali agar tidak diblokir/rate-limit
    now = datetime.now()
    last = REALTIME_OCEAN_CACHE["last_fetched"]
    if last is not None and (now - last).total_seconds() < 300:
        return
        
    try:
        url = "https://marine-api.open-meteo.com/v1/marine?latitude=-7.71&longitude=108.65&current=wave_height,sea_temperature"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            current = data.get("current", {})
            temp = current.get("sea_temperature")
            wave = current.get("wave_height")
            if temp is not None:
                REALTIME_OCEAN_CACHE["sea_temperature"] = float(temp)
            if wave is not None:
                REALTIME_OCEAN_CACHE["wave_height"] = float(wave)
            REALTIME_OCEAN_CACHE["last_fetched"] = now
            print(f"[Realtime API Sync] Berhasil! Suhu: {temp}°C, Tinggi Gelombang: {wave}m")
    except Exception as e:
        print("[Realtime API Sync] Gagal, menggunakan data fallback seeder:", e)



def generate_reading(base_time: datetime, sensor_data: dict, day_offset: int = 0, anomaly_type: str = "normal") -> dict:
    """Generate a single sensor reading with realistic per-wilayah variations."""
    hour = base_time.hour
    day_factor = math.sin((hour - 6) * math.pi / 12)  # peaks at noon
    depth_factor = sensor_data["kedalaman_m"] / 20.0

    # Ambil profil wilayah
    wilayah = sensor_data.get("wilayah", "default")
    profile = WILAYAH_PROFILE.get(wilayah, WILAYAH_PROFILE["default"])

    # Base values dari realtime cache (Pangandaran reference)
    base_temp = 28.0
    base_wave = 1.0
    if day_offset == 0:
        base_temp = REALTIME_OCEAN_CACHE["sea_temperature"]
        base_wave = REALTIME_OCEAN_CACHE["wave_height"]

    # Generate dengan variasi kecil + bias wilayah
    ph       = 8.05 + profile["ph_bias"]   + random.gauss(0, 0.04) - depth_factor * 0.04
    suhu     = base_temp + profile["suhu_bias"] + day_factor * 0.4 + random.gauss(0, 0.15) - depth_factor * 0.4
    salinitas= 32.5 + profile["sal_bias"]  + random.gauss(0, 0.25) + depth_factor * 0.2
    do_val   = 6.5 + profile["do_bias"]    + (base_wave * 0.3) + day_factor * 0.2 + random.gauss(0, 0.15) - depth_factor * 0.25
    kekeruhan= 1.2 + profile["turb_bias"]  + (base_wave * 1.5) + random.gauss(0, 0.4)
    if sensor_data["zona"] == "rehabilitasi":
        kekeruhan += 0.8  # Zona rehabilitasi sedikit lebih keruh

    # Terapkan Anomali Buatan dari Simulator
    if anomaly_type == "heatwave":
        suhu += 4.0
        do_val = max(2.0, do_val - 2.5)
    elif anomaly_type == "acidification":
        ph -= 1.1
    elif anomaly_type == "storm":
        salinitas -= 5.5
        kekeruhan += 15.0
    # Anomali acak sesuai anomaly_rate wilayah (wilayah tercemar lebih sering anomali)
    elif random.random() < profile["anomaly_rate"]:
        # Pilih jenis anomali yang sesuai karakteristik wilayah
        if wilayah in ("Indramayu", "Cirebon", "Karawang"):
            # Pantura lebih sering turbidity & pH rendah
            param = random.choice(["kekeruhan", "ph", "do"])
        elif wilayah in ("Pangandaran", "Sukabumi"):
            # Selatan lebih sering suhu & salinitas
            param = random.choice(["suhu", "salinitas"])
        else:
            param = random.choice(["ph", "suhu", "kekeruhan"])

        if param == "ph":
            ph += random.choice([-0.5, 0.5])
        elif param == "suhu":
            suhu += random.choice([-1.2, 1.8])
        elif param == "salinitas":
            salinitas += random.choice([-2.5, 2.5])
        elif param == "do":
            do_val -= 1.5
        elif param == "kekeruhan":
            kekeruhan += random.uniform(3, 7)

    # Clamp values dalam batas realistis
    ph        = max(7.0, min(9.0, round(ph, 2)))
    suhu      = max(24, min(34, round(suhu, 1)))
    salinitas = max(27, min(38, round(salinitas, 1)))
    do_val    = max(3, min(12, round(do_val, 1)))
    kekeruhan = max(0.1, min(20, round(kekeruhan, 1)))

    health = calculate_health_index(ph, suhu, salinitas, do_val, kekeruhan)

    return {
        "sensor_id": sensor_data["sensor_id"],
        "timestamp": base_time,
        "ph": ph,
        "suhu_celsius": suhu,
        "salinitas_ppt": salinitas,
        "do_mg_l": do_val,
        "kekeruhan_ntu": kekeruhan,
        "health_index": health,
    }


def check_thresholds_and_create_alert(reading: dict) -> dict | None:
    """Check if a reading breaches thresholds and return alert data.
    Level:
    - 'bahaya'  : nilai di luar batas aman (min/max)
    - 'waspada' : nilai mendekati batas (dalam warn zone)
    """
    label_map = {
        "ph": "pH",
        "suhu_celsius": "Suhu",
        "salinitas_ppt": "Salinitas",
        "do_mg_l": "Dissolved Oxygen",
        "kekeruhan_ntu": "Kekeruhan"
    }
    unit_map = {
        "ph": "", "suhu_celsius": "°C", "salinitas_ppt": " ppt",
        "do_mg_l": " mg/L", "kekeruhan_ntu": " NTU"
    }

    for key in ["ph", "suhu_celsius", "salinitas_ppt", "do_mg_l", "kekeruhan_ntu"]:
        val = reading[key]
        th_key = key.replace("_celsius","").replace("_ppt","").replace("_mg_l","").replace("_ntu","")
        th = THRESHOLDS.get(th_key) or THRESHOLDS.get(key)
        if not th:
            continue

        label = label_map[key]
        unit = unit_map[key]
        lmin, lmax = th["min"], th["max"]
        wmin, wmax = th.get("warn_min", lmin), th.get("warn_max", lmax)

        # Bahaya: di luar batas aman
        if val < lmin or val > lmax:
            return {
                "sensor_id": reading["sensor_id"],
                "parameter": label,
                "value": val,
                "threshold_min": lmin,
                "threshold_max": lmax,
                "level": "bahaya",
                "message": f"{label} bernilai {val}{unit}, di luar batas aman ({lmin}–{lmax})",
            }

        # Waspada: mendekati batas (dalam warn zone tapi belum bahaya)
        if val < wmin or val > wmax:
            direction = "mendekati batas bawah" if val < wmin else "mendekati batas atas"
            return {
                "sensor_id": reading["sensor_id"],
                "parameter": label,
                "value": val,
                "threshold_min": lmin,
                "threshold_max": lmax,
                "level": "waspada",
                "message": f"{label} bernilai {val}{unit}, {direction} aman ({lmin}–{lmax})",
            }

    return None


def seed_database(db: Session):
    """Main seeder function.
    - Buat akun admin jika belum ada
    - Buat akun operator demo per wilayah jika belum ada
    - Buat sensor demo per wilayah jika belum ada sensor sama sekali
    - TIDAK menghapus data yang sudah ada
    """
    # 0. Admin account
    if not db.query(User).filter(User.email == "admin@oceansmart.id").first():
        db.add(User(
            email="admin@oceansmart.id",
            nama="oceansmart",
            password_hash="ocean123",
            role="admin"
        ))
        db.commit()
        print("  [OK] Akun admin: admin@oceansmart.id / ocean123")

    # Skip seluruh seeding jika sensor sudah ada
    existing_sensors = db.query(Sensor).count()
    if existing_sensors > 0:
        print(f"[SEED] {existing_sensors} sensor sudah ada, skip seeding.")
        return

    print("[SEED] Database kosong — mulai seeding demo...")

    # 1. Buat akun operator demo per wilayah (semua 6 wilayah wajib + extra)
    DEMO_OPERATORS = [
        {"email": "op.pangandaran@oceansmart.id", "nama": "Operator Pangandaran",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Jawa Barat", "wilayah": "Pangandaran"},
        {"email": "op.parangtritis@oceansmart.id", "nama": "Operator Parangtritis",
         "password_hash": "op123", "role": "operator",
         "provinsi": "DI Yogyakarta", "wilayah": "Parangtritis"},
        {"email": "op.karimunjawa@oceansmart.id", "nama": "Operator Karimunjawa",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Jawa Tengah", "wilayah": "Karimunjawa"},
        {"email": "op.wakatobi@oceansmart.id", "nama": "Operator Wakatobi",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Sulawesi Tenggara", "wilayah": "Wakatobi"},
        {"email": "op.bunaken@oceansmart.id", "nama": "Operator Bunaken",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Sulawesi Utara", "wilayah": "Bunaken"},
        {"email": "op.rajaamapat@oceansmart.id", "nama": "Operator Raja Ampat",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Papua Barat Daya", "wilayah": "Raja Ampat"},
        {"email": "op.indramayu@oceansmart.id", "nama": "Operator Indramayu",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Jawa Barat", "wilayah": "Indramayu"},
        {"email": "op.bali@oceansmart.id", "nama": "Operator Nusa Penida",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Bali", "wilayah": "Nusa Penida"},
        {"email": "op.banyuwangi@oceansmart.id", "nama": "Operator Banyuwangi",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Jawa Timur", "wilayah": "Banyuwangi"},
        {"email": "op.komodo@oceansmart.id", "nama": "Operator Komodo",
         "password_hash": "op123", "role": "operator",
         "provinsi": "Nusa Tenggara Timur", "wilayah": "Manggarai Barat"},
    ]
    for op in DEMO_OPERATORS:
        if not db.query(User).filter(User.email == op["email"]).first():
            db.add(User(**op))
    db.commit()
    print(f"  [OK] {len(DEMO_OPERATORS)} akun operator demo dibuat (password: op123)")

    # 2. Buat sensor per wilayah dengan karakteristik berbeda
    for s in SENSORS_DATA:
        db.add(Sensor(**s))
    db.commit()
    print(f"  [OK] {len(SENSORS_DATA)} sensors created")

    # 3. Generate historical readings (30 hari, setiap 30 menit)
    now = datetime.now()
    total_readings = 0
    total_alerts = 0
    readings_batch = []
    alerts_batch = []

    for sensor_data in SENSORS_DATA:
        for day_offset in range(30, -1, -1):
            base_date = now - timedelta(days=day_offset)
            # Setiap 30 menit (lebih ringan)
            for minute_offset in range(0, 1440, 30):
                reading_time = base_date.replace(
                    hour=minute_offset // 60,
                    minute=minute_offset % 60,
                    second=0, microsecond=0
                )
                reading = generate_reading(reading_time, sensor_data, day_offset)
                readings_batch.append(SensorReading(**reading))
                total_readings += 1

                alert_data = check_thresholds_and_create_alert(reading)
                if alert_data:
                    # Hanya simpan alert aktif (day_offset == 0) agar tidak menumpuk riwayat resolved
                    if day_offset == 0:
                        alert_data["created_at"] = reading_time
                        alert_data["is_resolved"] = False
                        alerts_batch.append(Alert(**alert_data))
                        total_alerts += 1

            if len(readings_batch) >= 500:
                db.bulk_save_objects(readings_batch)
                db.bulk_save_objects(alerts_batch)
                db.commit()
                readings_batch = []
                alerts_batch = []

    if readings_batch:
        db.bulk_save_objects(readings_batch)
    if alerts_batch:
        db.bulk_save_objects(alerts_batch)
    db.commit()
    print(f"  [OK] {total_readings} readings (30 hari), {total_alerts} alerts")

    # 4. Create biota
    for b in BIOTA_DATA:
        if not db.query(Biota).filter(Biota.biota_id == b["biota_id"]).first():
            db.add(Biota(**b))
    db.commit()
    print(f"  [OK] Biota seeded")

    # 5. Create conservation zones
    from app.models import ConservationZone
    if db.query(ConservationZone).count() == 0:
        for z in ZONES_DATA:
            db.add(ConservationZone(**z))
        db.commit()
    print("[DONE] Seeding selesai!")
    print("\n  Akun Demo:")
    print("  Admin            : admin@oceansmart.id / ocean123")
    print("  Op. Pangandaran  : op.pangandaran@oceansmart.id / op123")
    print("  Op. Parangtritis : op.parangtritis@oceansmart.id / op123")
    print("  Op. Karimunjawa  : op.karimunjawa@oceansmart.id / op123")
    print("  Op. Wakatobi     : op.wakatobi@oceansmart.id / op123")
    print("  Op. Bunaken      : op.bunaken@oceansmart.id / op123")
    print("  Op. Raja Ampat   : op.rajaamapat@oceansmart.id / op123")


def upsert_new_biota(db: Session):
    """Insert any BIOTA_DATA entries that don't exist in the DB yet (safe to run every startup)."""
    added = 0
    for b in BIOTA_DATA:
        if not db.query(Biota).filter(Biota.biota_id == b["biota_id"]).first():
            db.add(Biota(**b))
            added += 1
    if added > 0:
        db.commit()
        print(f"  [OK] {added} biota baru ditambahkan ke database")


# Semua operator demo — dijalankan setiap startup agar aman jika DB direset sebagian
ALL_DEMO_OPERATORS = [
    {"email": "op.pangandaran@oceansmart.id", "nama": "Operator Pangandaran",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Jawa Barat", "wilayah": "Pangandaran"},
    {"email": "op.parangtritis@oceansmart.id", "nama": "Operator Parangtritis",
     "password_hash": "op123", "role": "operator",
     "provinsi": "DI Yogyakarta", "wilayah": "Parangtritis"},
    {"email": "op.karimunjawa@oceansmart.id", "nama": "Operator Karimunjawa",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Jawa Tengah", "wilayah": "Karimunjawa"},
    {"email": "op.wakatobi@oceansmart.id", "nama": "Operator Wakatobi",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Sulawesi Tenggara", "wilayah": "Wakatobi"},
    {"email": "op.bunaken@oceansmart.id", "nama": "Operator Bunaken",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Sulawesi Utara", "wilayah": "Bunaken"},
    {"email": "op.rajaamapat@oceansmart.id", "nama": "Operator Raja Ampat",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Papua Barat Daya", "wilayah": "Raja Ampat"},
    {"email": "op.indramayu@oceansmart.id", "nama": "Operator Indramayu",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Jawa Barat", "wilayah": "Indramayu"},
    {"email": "op.bali@oceansmart.id", "nama": "Operator Nusa Penida",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Bali", "wilayah": "Nusa Penida"},
    {"email": "op.banyuwangi@oceansmart.id", "nama": "Operator Banyuwangi",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Jawa Timur", "wilayah": "Banyuwangi"},
    {"email": "op.komodo@oceansmart.id", "nama": "Operator Komodo",
     "password_hash": "op123", "role": "operator",
     "provinsi": "Nusa Tenggara Timur", "wilayah": "Manggarai Barat"},
]


def upsert_operators(db: Session):
    """Insert missing operator accounts. Safe to run every startup."""
    added = 0
    for op in ALL_DEMO_OPERATORS:
        if not db.query(User).filter(User.email == op["email"]).first():
            db.add(User(**op))
            added += 1
    if added > 0:
        db.commit()
        print(f"  [OK] {added} akun operator demo ditambahkan")
    else:
        print("  [OK] Semua akun operator sudah ada")
