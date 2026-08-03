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
    "ph": {"min": 7.5, "max": 8.5, "normal_min": 7.8, "normal_max": 8.3},
    "suhu_celsius": {"min": 26, "max": 30, "normal_min": 27, "normal_max": 29},
    "salinitas_ppt": {"min": 30, "max": 35, "normal_min": 31, "normal_max": 34},
    "do_mg_l": {"min": 5, "max": 12, "normal_min": 5.5, "normal_max": 8},
    "kekeruhan_ntu": {"min": 0, "max": 10, "normal_min": 1, "normal_max": 6},
}


# -------------------- SENSOR DATA --------------------

SENSORS_DATA = [
    # Pangandaran (Pesisir Selatan Jabar)
    {"sensor_id": "OS-SENSOR-001", "nama_lokasi": "Cagar Alam Laut Pangandaran", "lat": -7.7100, "lng": 108.6500, "kedalaman_m": 3, "zona": "inti", "kabupaten": "Pangandaran"},
    {"sensor_id": "OS-SENSOR-002", "nama_lokasi": "Padang Lamun Karapyak Pangandaran", "lat": -7.7200, "lng": 108.6200, "kedalaman_m": 5, "zona": "pemanfaatan_terbatas", "kabupaten": "Pangandaran"},
    {"sensor_id": "OS-SENSOR-003", "nama_lokasi": "Dermaga Batu Hiu Pangandaran", "lat": -7.6800, "lng": 108.5900, "kedalaman_m": 1, "zona": "pemanfaatan_umum", "kabupaten": "Pangandaran"},
    
    # Sukabumi / Pelabuhan Ratu (Pesisir Selatan Jabar)
    {"sensor_id": "OS-SENSOR-004", "nama_lokasi": "Teluk Pelabuhan Ratu Sukabumi", "lat": -6.9800, "lng": 106.5500, "kedalaman_m": 12, "zona": "inti", "kabupaten": "Sukabumi"},
    {"sensor_id": "OS-SENSOR-005", "nama_lokasi": "Karang Hawu Pelabuhan Ratu", "lat": -6.9500, "lng": 106.4500, "kedalaman_m": 6, "zona": "pemanfaatan_terbatas", "kabupaten": "Sukabumi"},

    # Indramayu (Pantura Jabar)
    {"sensor_id": "OS-SENSOR-006", "nama_lokasi": "Hutan Mangrove Karangsong Indramayu", "lat": -6.3300, "lng": 108.3600, "kedalaman_m": 2, "zona": "rehabilitasi", "kabupaten": "Indramayu"},
    {"sensor_id": "OS-SENSOR-007", "nama_lokasi": "Pantai Tirta Maya Indramayu", "lat": -6.3800, "lng": 108.4200, "kedalaman_m": 4, "zona": "pemanfaatan_umum", "kabupaten": "Indramayu"},

    # Cirebon (Pantura Jabar)
    {"sensor_id": "OS-SENSOR-008", "nama_lokasi": "Pesisir Kejawanan Cirebon", "lat": -6.7300, "lng": 108.5700, "kedalaman_m": 3, "zona": "rehabilitasi", "kabupaten": "Cirebon"},

    # Karawang (Pantura Jabar)
    {"sensor_id": "OS-SENSOR-009", "nama_lokasi": "Tanjung Pakis Karawang", "lat": -5.9600, "lng": 107.1600, "kedalaman_m": 2, "zona": "pemanfaatan_terbatas", "kabupaten": "Karawang"},

    # Subang (Pantura Jabar)
    {"sensor_id": "OS-SENSOR-010", "nama_lokasi": "Pantai Pondok Bali Subang", "lat": -6.2100, "lng": 107.8200, "kedalaman_m": 3, "zona": "pemanfaatan_umum", "kabupaten": "Subang"},
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
    now = datetime.utcnow()
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



def generate_reading(base_time: datetime, sensor_data: dict, day_offset: int = 0) -> dict:
    """Generate a single sensor reading with realistic variations."""
    # Add time-of-day variations
    hour = base_time.hour
    day_factor = math.sin((hour - 6) * math.pi / 12)  # peaks at noon

    # Base values with sensor-specific bias
    depth_factor = sensor_data["kedalaman_m"] / 20.0

    # Gunakan telemetri asli Jawa Barat (Pangandaran) jika data real-time (day_offset == 0)
    base_temp = 28.0
    base_wave = 1.0
    if day_offset == 0:
        base_temp = REALTIME_OCEAN_CACHE["sea_temperature"]
        base_wave = REALTIME_OCEAN_CACHE["wave_height"]

    ph = 8.05 + random.gauss(0, 0.05) - depth_factor * 0.05
    suhu = base_temp + day_factor * 0.5 + random.gauss(0, 0.2) - depth_factor * 0.5
    salinitas = 32.5 + random.gauss(0, 0.3) + depth_factor * 0.3
    
    # DO & kekeruhan bereaksi secara dinamis dengan tinggi gelombang asli Jawa Barat
    do_val = 6.2 + (base_wave * 0.4) + day_factor * 0.3 + random.gauss(0, 0.2) - depth_factor * 0.3
    kekeruhan = 1.5 + (base_wave * 1.8) + random.gauss(0, 0.5) + (0.5 if sensor_data["zona"] == "rehabilitasi" else 0)

    # ~5% chance of anomaly
    if random.random() < 0.05:
        param = random.choice(["ph", "suhu", "salinitas", "do", "kekeruhan"])
        if param == "ph":
            ph += random.choice([-0.8, 0.8])
        elif param == "suhu":
            suhu += random.choice([-2.5, 3.0])
        elif param == "salinitas":
            salinitas += random.choice([-3, 3])
        elif param == "do":
            do_val -= 2.5
        else:
            kekeruhan += 8

    # Clamp values
    ph = max(6.5, min(9.5, round(ph, 2)))
    suhu = max(22, min(35, round(suhu, 1)))
    salinitas = max(25, min(40, round(salinitas, 1)))
    do_val = max(2, min(12, round(do_val, 1)))
    kekeruhan = max(0.1, min(25, round(kekeruhan, 1)))

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
    """Check if a reading breaches thresholds and return alert data."""
    for param, key in [("ph", "ph"), ("suhu_celsius", "suhu_celsius"),
                       ("salinitas_ppt", "salinitas_ppt"), ("do_mg_l", "do_mg_l"),
                       ("kekeruhan_ntu", "kekeruhan_ntu")]:
        val = reading[key]
        th = THRESHOLDS.get(param.replace("_celsius", "").replace("_ppt", "")
                            .replace("_mg_l", "").replace("_ntu", ""), THRESHOLDS.get(param))
        if th is None:
            continue

        label_map = {
            "ph": "pH",
            "suhu_celsius": "Suhu",
            "salinitas_ppt": "Salinitas",
            "do_mg_l": "Dissolved Oxygen",
            "kekeruhan_ntu": "Kekeruhan"
        }

        if val < th["min"] or val > th["max"]:
            return {
                "sensor_id": reading["sensor_id"],
                "parameter": label_map.get(key, key),
                "value": val,
                "threshold_min": th["min"],
                "threshold_max": th["max"],
                "level": "bahaya",
                "message": f'{label_map.get(key, key)} bernilai {val}, di luar batas aman ({th["min"]}-{th["max"]})',
            }
    return None


def seed_database(db: Session):
    """Main seeder function to populate the database with dummy data."""
    # 0. Create default users (seeded independently of sensor data check)
    admin_user = db.query(User).filter(User.email == "admin@oceansmart.id").first()
    if not admin_user:
        db.add(User(
            email="admin@oceansmart.id",
            nama="Admin OceanSmart",
            password_hash="admin123", # Plain text for simplicity/reliability
            role="operator"
        ))
        db.add(User(
            email="user@oceansmart.id",
            nama="Budi Santoso",
            password_hash="user123",
            role="pengguna"
        ))
        db.commit()
        print("  [OK] Default users seeded (admin@oceansmart.id / admin123)")

    # Check if data already exists
    existing = db.query(Sensor).first()
    if existing:
        print("Database already seeded. Skipping sensor seeding.")
        return

    print("[SEED] Seeding OceanSmart database...")

    # 1. Create sensors
    for s in SENSORS_DATA:
        db.add(Sensor(**s))
    db.commit()
    print(f"  [OK] {len(SENSORS_DATA)} sensors created")

    # 2. Generate 90 days of historical readings (every 15 min = 96/day)
    now = datetime.utcnow()
    total_readings = 0
    total_alerts = 0
    readings_batch = []
    alerts_batch = []

    for sensor_data in SENSORS_DATA:
        for day_offset in range(90, -1, -1):
            base_date = now - timedelta(days=day_offset)
            # Generate readings every 15 minutes
            for minute_offset in range(0, 1440, 15):
                reading_time = base_date.replace(
                    hour=minute_offset // 60,
                    minute=minute_offset % 60,
                    second=0, microsecond=0
                )
                reading = generate_reading(reading_time, sensor_data, day_offset)
                readings_batch.append(SensorReading(**reading))
                total_readings += 1

                # Check for alerts
                alert_data = check_thresholds_and_create_alert(reading)
                if alert_data:
                    alert_data["created_at"] = reading_time
                    alert_data["is_resolved"] = day_offset > 0
                    if day_offset > 0:
                        alert_data["resolved_at"] = reading_time + timedelta(hours=random.randint(1, 6))
                    alerts_batch.append(Alert(**alert_data))
                    total_alerts += 1

            # Batch insert every day
            if len(readings_batch) >= 960:
                db.bulk_save_objects(readings_batch)
                db.bulk_save_objects(alerts_batch)
                db.commit()
                readings_batch = []
                alerts_batch = []

    # Flush remaining
    if readings_batch:
        db.bulk_save_objects(readings_batch)
    if alerts_batch:
        db.bulk_save_objects(alerts_batch)
    db.commit()
    print(f"  [OK] {total_readings} sensor readings generated (90 days)")
    print(f"  [OK] {total_alerts} alerts generated")

    # 3. Create biota
    for b in BIOTA_DATA:
        db.add(Biota(**b))
    db.commit()
    print(f"  [OK] {len(BIOTA_DATA)} biota species added")

    # 4. Create conservation zones
    for z in ZONES_DATA:
        db.add(ConservationZone(**z))
    db.commit()
    print(f"  [OK] {len(ZONES_DATA)} conservation zones created")

    print("[DONE] Database seeding complete!")
