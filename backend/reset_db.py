"""
Script reset database OceanSmart.
Hapus semua sensor, readings, alerts, dan operator.
Sisakan hanya akun admin.
Jalankan: python reset_db.py
"""
import sys
sys.path.insert(0, '.')
from app.database import get_db, engine
from app.models import Sensor, SensorReading, Alert, ConservationZone, User, Biota
from sqlalchemy.orm import Session

db: Session = next(get_db())

print("=== Reset Database OceanSmart ===")
print("Menghapus semua data sensor, readings, alerts...")

# Hapus dalam urutan yang benar (foreign key)
deleted_readings = db.query(SensorReading).delete()
db.commit()
print(f"  [OK] {deleted_readings} sensor readings dihapus")

deleted_alerts = db.query(Alert).delete()
db.commit()
print(f"  [OK] {deleted_alerts} alerts dihapus")

deleted_sensors = db.query(Sensor).delete()
db.commit()
print(f"  [OK] {deleted_sensors} sensors dihapus")

# Hapus operator (sisakan admin)
deleted_ops = db.query(User).filter(User.role != 'admin').delete()
db.commit()
print(f"  [OK] {deleted_ops} akun non-admin dihapus")

# Cek yang tersisa
admins = db.query(User).filter(User.role == 'admin').all()
print(f"\n  Akun admin tersisa: {len(admins)}")
for a in admins:
    print(f"    - {a.email} ({a.nama}) / password: ocean123")

db.close()
print("\n=== Reset selesai! ===")
print("Sekarang:")
print("  1. Login sebagai admin (admin@oceansmart.id / ocean123)")
print("  2. Buat akun Operator Wilayah di Panel Manajemen")
print("  3. Operator login dan tambahkan sensor di wilayahnya")
print("  4. Backend akan generate data otomatis setiap 10 detik")
