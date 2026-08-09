"""
Script: inject beberapa alert aktif dummy agar Peringatan Dini tidak kosong.
Jalankan: python inject_alerts.py
"""
import sys, random
sys.path.insert(0, '.')
from datetime import datetime
from app.database import get_db
from app.models import Sensor, Alert

db = next(get_db())
now = datetime.utcnow()

sensors = db.query(Sensor).filter(Sensor.status_koneksi == 'online').all()
if not sensors:
    print("Tidak ada sensor online.")
    db.close()
    sys.exit(0)

ANOMALIES = [
    {"parameter": "Suhu", "value": 31.2, "threshold_min": 26, "threshold_max": 30,
     "level": "bahaya", "message": "Suhu bernilai 31.2°C, di luar batas aman (26-30)"},
    {"parameter": "pH", "value": 7.18, "threshold_min": 7.5, "threshold_max": 8.5,
     "level": "bahaya", "message": "pH bernilai 7.18, di luar batas aman (7.5-8.5)"},
    {"parameter": "Kekeruhan", "value": 12.4, "threshold_min": 0, "threshold_max": 10,
     "level": "bahaya", "message": "Kekeruhan bernilai 12.4 NTU, di luar batas aman (0-10)"},
    {"parameter": "Suhu", "value": 29.7, "threshold_min": 26, "threshold_max": 30,
     "level": "waspada", "message": "Suhu bernilai 29.7°C, mendekati batas atas aman (26-30)"},
    {"parameter": "Dissolved Oxygen", "value": 4.8, "threshold_min": 5, "threshold_max": 12,
     "level": "bahaya", "message": "DO bernilai 4.8 mg/L, di bawah batas aman (5-12)"},
    {"parameter": "Salinitas", "value": 29.1, "threshold_min": 30, "threshold_max": 35,
     "level": "waspada", "message": "Salinitas bernilai 29.1 ppt, mendekati batas bawah aman (30-35)"},
]

# Pilih ~40% sensor untuk punya alert aktif
target_sensors = random.sample(sensors, max(1, len(sensors) * 2 // 5))
added = 0

for sensor in target_sensors:
    # Hapus dulu alert lama yang belum resolved untuk sensor ini (hindari duplikat)
    db.query(Alert).filter(Alert.sensor_id == sensor.sensor_id, Alert.is_resolved == False).delete()
    
    anomaly = random.choice(ANOMALIES)
    alert = Alert(
        sensor_id=sensor.sensor_id,
        parameter=anomaly["parameter"],
        value=anomaly["value"],
        threshold_min=anomaly["threshold_min"],
        threshold_max=anomaly["threshold_max"],
        level=anomaly["level"],
        message=anomaly["message"],
        is_resolved=False,
        created_at=now,
    )
    db.add(alert)
    added += 1

db.commit()
bahaya = db.query(Alert).filter(Alert.is_resolved == False, Alert.level == 'bahaya').count()
waspada = db.query(Alert).filter(Alert.is_resolved == False, Alert.level == 'waspada').count()
print(f"✓ {added} alert aktif diinjeksi")
print(f"  Bahaya : {bahaya}")
print(f"  Waspada: {waspada}")
db.close()
