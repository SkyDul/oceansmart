"""
OceanSmart Backend -- FastAPI Application
Marine Conservation Monitoring Platform
"""
from datetime import datetime, timedelta
from typing import Optional, AsyncGenerator

from fastapi import FastAPI, Depends, HTTPException, Query, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
import os
import asyncio
import json
from fastapi.responses import StreamingResponse

# Global for SSE clients
sse_clients = set()
main_loop = None

# Tracks sensors currently in danger/warning: key = "sensor_id_parameter" -> True
# Cleared when sensor returns to normal (so next danger triggers a new notification)
active_danger_states = {}

# Tracks ongoing simulated anomalies per sensor: sensor_id -> {"anomaly_type": "heatwave", "remaining": 5}
active_anomalies = {}

def push_alert_to_clients(alert_dict):
    """Broadcast alert to all SSE clients immediately (no cooldown — handled by active_danger_states)."""
    if not main_loop: return
    for client in list(sse_clients):
        asyncio.run_coroutine_threadsafe(client.put(alert_dict), main_loop)

def push_resolved_to_clients(alert_dict):
    """Broadcast a resolved event to all SSE clients."""
    if not main_loop: return
    resolved = {**alert_dict, "event_type": "resolved", "is_resolved": True}
    for client in list(sse_clients):
        asyncio.run_coroutine_threadsafe(client.put(resolved), main_loop)

import httpx

from app.database import engine, get_db, Base
from app.models import Sensor, SensorReading, Alert, Biota, ConservationZone, CitizenReport, User
from app.seeder import seed_database, THRESHOLDS, calculate_health_index, upsert_new_biota, upsert_operators

# -------------------- APP INIT --------------------

app = FastAPI(
    title="OceanSmart API",
    description="Marine Conservation Monitoring & GIS Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





@app.on_event("startup")
def startup():
    """Create tables and seed dummy data on startup."""
    global main_loop
    try:
        main_loop = asyncio.get_running_loop()
    except RuntimeError:
        pass
        
    Base.metadata.create_all(bind=engine)
    
    # Auto-migration: check if no_hp and foto_url columns exist, if not add them
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN no_hp VARCHAR(50) NULL"))
            print("  [DB] Auto-migration: Added 'no_hp' column to 'users' table")
    except Exception as e:
        pass # Column already exists or table doesn't exist yet

    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN foto_url TEXT NULL"))
            print("  [DB] Auto-migration: Added 'foto_url' column to 'users' table")
    except Exception as e:
        pass
        
    db = next(get_db())
    try:
        seed_database(db)
        upsert_new_biota(db)
        upsert_operators(db)
        
        # Sync admin user credentials
        admin_acc = db.query(User).filter((User.email == "admin@oceansmart.id") | (User.nama == "oceansmart")).first()
        if admin_acc:
            admin_acc.nama = "oceansmart"
            admin_acc.email = "admin@oceansmart.id"
            admin_acc.password_hash = "ocean123"
            admin_acc.role = "admin"
            db.commit()
        else:
            db.add(User(
                email="admin@oceansmart.id",
                nama="oceansmart",
                password_hash="ocean123",
                role="admin"
            ))
            db.commit()
    finally:
        db.close()
        
    # Start Realtime Data Generator
    from apscheduler.schedulers.background import BackgroundScheduler
    from app.seeder import generate_reading, check_thresholds_and_create_alert, update_realtime_ocean_cache
    
    def generate_realtime_data():
        db = next(get_db())
        try:
            # Sinkronisasi parameter laut real-time
            update_realtime_ocean_cache()
            
            now = datetime.utcnow()
            db_sensors = db.query(Sensor).all()
            
            # Count online sensors to enforce anomaly minimum
            online_sensors = [s for s in db_sensors if s.status_koneksi == "online" and s.status_baterai > 0]
            
            # Clean active anomalies list of any deleted/offline sensors
            online_ids = {s.sensor_id for s in online_sensors}
            for sid in list(active_anomalies.keys()):
                if sid not in online_ids:
                    active_anomalies.pop(sid, None)
                    
            # Enforce at least 3 active anomalies at any time
            min_anomalies = 3
            current_anomalies_count = len(active_anomalies)
            if len(online_sensors) > 0 and current_anomalies_count < min_anomalies:
                needed = min_anomalies - current_anomalies_count
                available = [s for s in online_sensors if s.sensor_id not in active_anomalies]
                if available:
                    import random
                    chosen_sensors = random.sample(available, min(needed, len(available)))
                    for s in chosen_sensors:
                        anomaly_type = random.choice(["heatwave", "acidification", "storm"])
                        active_anomalies[s.sensor_id] = {
                            "anomaly_type": anomaly_type,
                            "remaining": random.randint(3, 6) # lasts 30 to 60 seconds
                        }
            
            for s in online_sensors:
                # Nominal battery drain
                s.status_baterai = max(0, s.status_baterai - 0.1)
                
                sensor_dict = {
                    "sensor_id": s.sensor_id,
                    "zona": s.zona,
                    "kedalaman_m": s.kedalaman_m,
                    "wilayah": s.wilayah or "default",
                }
                
                # Determine anomaly type
                anomaly = "normal"
                del_later = False
                if s.sensor_id in active_anomalies:
                    state = active_anomalies[s.sensor_id]
                    anomaly = state["anomaly_type"]
                    state["remaining"] -= 1
                    if state["remaining"] <= 0:
                        del_later = True
                else:
                    import random
                    # Random 2% chance to start new anomaly normally
                    if random.random() < 0.02:
                        anomaly = random.choice(["heatwave", "acidification", "storm"])
                        active_anomalies[s.sensor_id] = {
                            "anomaly_type": anomaly,
                            "remaining": random.randint(3, 6)
                        }
                
                reading = generate_reading(now, sensor_dict, 0, anomaly_type=anomaly)
                db.add(SensorReading(**reading))
                
                if del_later:
                    active_anomalies.pop(s.sensor_id, None)
                    
                # Ambil alert yang belum resolved untuk sensor ini
                existing_unresolved = db.query(Alert).filter(
                    Alert.sensor_id == s.sensor_id,
                    Alert.is_resolved == False
                ).all()

                # Cek parameter secara independen
                param_configs = [
                    {"key": "ph", "label": "pH", "unit": ""},
                    {"key": "suhu_celsius", "label": "Suhu", "unit": "°C"},
                    {"key": "salinitas_ppt", "label": "Salinitas", "unit": " ppt"},
                    {"key": "do_mg_l", "label": "Dissolved Oxygen", "unit": " mg/L"},
                    {"key": "kekeruhan_ntu", "label": "Kekeruhan", "unit": " NTU"}
                ]
                
                active_params_in_reading = set()
                
                for cfg in param_configs:
                    r_key = cfg["key"]
                    label = cfg["label"]
                    unit = cfg["unit"]
                    val = reading[r_key]
                    
                    th_key = r_key.replace("_celsius","").replace("_ppt","").replace("_mg_l","").replace("_ntu","")
                    th = THRESHOLDS.get(th_key) or THRESHOLDS.get(r_key)
                    if not th:
                        continue
                        
                    lmin, lmax = th["min"], th["max"]
                    wmin, wmax = th.get("warn_min", lmin), th.get("warn_max", lmax)
                    
                    alert_level = None
                    alert_msg = None
                    
                    if val < lmin or val > lmax:
                        alert_level = "bahaya"
                        alert_msg = f"{label} bernilai {val}{unit}, di luar batas aman ({lmin}–{lmax})"
                    elif val < wmin or val > wmax:
                        alert_level = "waspada"
                        direction = "mendekati batas bawah" if val < wmin else "mendekati batas atas"
                        alert_msg = f"{label} bernilai {val}{unit}, {direction} aman ({lmin}–{lmax})"
                        
                    danger_key = f"{s.sensor_id}_{label}"
                    
                    if alert_level:
                        active_params_in_reading.add(label)
                        match_alert = next((a for a in existing_unresolved if a.parameter == label), None)
                        
                        if match_alert:
                            # Update in-place
                            match_alert.level = alert_level
                            match_alert.value = val
                            match_alert.message = alert_msg
                            match_alert.is_resolved = False
                            alert_obj = match_alert
                        else:
                            # Create new alert
                            alert_obj = Alert(
                                sensor_id=s.sensor_id,
                                parameter=label,
                                value=val,
                                threshold_min=lmin,
                                threshold_max=lmax,
                                level=alert_level,
                                message=alert_msg,
                                created_at=now,
                                is_resolved=False
                            )
                            db.add(alert_obj)
                            db.flush()
                            
                        # Kirim notifikasi HANYA jika pertama kali bahaya
                        was_already_in_danger = active_danger_states.get(danger_key, False)
                        if not was_already_in_danger:
                            active_danger_states[danger_key] = True
                            alert_dict = {
                                "id": alert_obj.id,
                                "sensor_id": alert_obj.sensor_id,
                                "parameter": alert_obj.parameter,
                                "value": float(alert_obj.value),
                                "threshold_min": alert_obj.threshold_min,
                                "threshold_max": alert_obj.threshold_max,
                                "level": alert_obj.level,
                                "message": alert_obj.message,
                                "created_at": alert_obj.created_at.isoformat() if alert_obj.created_at else now.isoformat(),
                                "is_resolved": False
                            }
                            push_alert_to_clients(alert_dict)
                        else:
                            # Kirim silent update untuk update nilai real-time di UI
                            db.flush()
                            if alert_obj.id:
                                update_dict = {
                                    "id": alert_obj.id,
                                    "sensor_id": alert_obj.sensor_id,
                                    "parameter": alert_obj.parameter,
                                    "value": float(alert_obj.value),
                                    "threshold_min": alert_obj.threshold_min,
                                    "threshold_max": alert_obj.threshold_max,
                                    "level": alert_obj.level,
                                    "message": alert_obj.message,
                                    "created_at": alert_obj.created_at.isoformat() if alert_obj.created_at else now.isoformat(),
                                    "is_resolved": False,
                                    "event_type": "update"
                                }
                                push_alert_to_clients(update_dict)
                
                # Jika parameter kembali normal: auto-selesaikan alert yang ada.
                # Update in-place (bukan buat riwayat baru) → tampil sebagai Terselesaikan (✅).
                # Hapus dari active_danger_states → notifikasi baru muncul jika bahaya kembali.
                for a in existing_unresolved:
                    if a.parameter not in active_params_in_reading:
                        danger_key = f"{s.sensor_id}_{a.parameter}"
                        param_key_map = {
                            "pH": "ph",
                            "Suhu": "suhu_celsius",
                            "Salinitas": "salinitas_ppt",
                            "Dissolved Oxygen": "do_mg_l",
                            "Kekeruhan": "kekeruhan_ntu"
                        }
                        r_key = param_key_map.get(a.parameter, "ph")
                        normal_val = reading.get(r_key, a.value)
                        # Update alert in-place → Terselesaikan
                        a.is_resolved = True
                        a.resolved_at = now
                        a.level = "normal"
                        a.value = normal_val
                        a.message = f"{a.parameter} kembali ke kondisi Normal ({normal_val})"
                        db.flush()
                        # Kirim SSE resolved agar kartu langsung berubah hijau di frontend
                        if active_danger_states.pop(danger_key, False):
                            resolved_dict = {
                                "id": a.id,
                                "sensor_id": a.sensor_id,
                                "parameter": a.parameter,
                                "value": float(normal_val),
                                "threshold_min": a.threshold_min,
                                "threshold_max": a.threshold_max,
                                "level": "normal",
                                "message": a.message,
                                "created_at": a.created_at.isoformat() if a.created_at else now.isoformat(),
                                "is_resolved": True,
                                "event_type": "resolved"
                            }
                            push_resolved_to_clients(resolved_dict)
                    else:
                        db.flush()
                    
            db.commit()
            print(f"[Realtime] Siklus 10s selesai: {now.strftime('%H:%M:%S')} | Bahaya aktif: {len(active_danger_states)}")
        except Exception as e:
            print("Error generating realtime data:", e)
            db.rollback()
        finally:
            db.close()
            
    scheduler = BackgroundScheduler()
    scheduler.add_job(generate_realtime_data, 'interval', seconds=10)
    scheduler.start()


# -------------------- DASHBOARD / OVERVIEW --------------------

class LoginSchema(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login_user(req: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == req.email) | (User.nama == req.email)
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Pengguna tidak ditemukan. Periksa email/username Anda.")
        
    if user.password_hash != req.password:
        raise HTTPException(status_code=400, detail="Kata sandi salah. Silakan coba lagi.")
    
    return {
        "id": user.id,
        "nama": user.nama,
        "name": user.nama,
        "email": user.email,
        "role": user.role,
        "wilayah": user.wilayah or "",
        "provinsi": user.provinsi or "",
        "no_hp": getattr(user, "no_hp", "") or "",
        "picture": getattr(user, "foto_url", None)
    }


@app.get("/api/dashboard/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    x_user_role: Optional[str] = Header(None),
    x_user_wilayah: Optional[str] = Header(None),
    x_user_provinsi: Optional[str] = Header(None)
):
    """Get overview statistics for the main dashboard."""
    sensor_q = db.query(Sensor)
    if x_user_role == "operator" and x_user_wilayah:
        sensor_q = sensor_q.filter(Sensor.wilayah == x_user_wilayah)
    elif x_user_role in ("admin", "pengguna") and x_user_provinsi:
        sensor_q = sensor_q.filter(Sensor.provinsi == x_user_provinsi)

    sensor_count = sensor_q.count()
    online_count = sensor_q.filter(Sensor.status_koneksi == "online").count()
    biota_count = db.query(Biota).count()

    alert_q = db.query(Alert).filter(Alert.is_resolved == False)
    if x_user_role == "operator" and x_user_wilayah:
        alert_q = alert_q.join(Sensor, Alert.sensor_id == Sensor.sensor_id).filter(Sensor.wilayah == x_user_wilayah)
    elif x_user_role in ("admin", "pengguna") and x_user_provinsi:
        alert_q = alert_q.join(Sensor, Alert.sensor_id == Sensor.sensor_id).filter(Sensor.provinsi == x_user_provinsi)
    active_alerts = alert_q.count()

    # Average health index from latest readings
    sensor_ids = None
    if x_user_role == "operator" and x_user_wilayah:
        sensor_ids = [s.sensor_id for s in sensor_q.all()]
    elif x_user_role in ("admin", "pengguna") and x_user_provinsi:
        sensor_ids = [s.sensor_id for s in sensor_q.all()]

    subq_query = db.query(
        SensorReading.sensor_id,
        func.max(SensorReading.timestamp).label("latest")
    )
    if sensor_ids is not None:
        subq_query = subq_query.filter(SensorReading.sensor_id.in_(sensor_ids))
        
    subq = subq_query.group_by(SensorReading.sensor_id).subquery()
    
    latest_readings = (
        db.query(SensorReading)
        .join(subq, and_(
            SensorReading.sensor_id == subq.c.sensor_id,
            SensorReading.timestamp == subq.c.latest
        ))
        .all()
    )
    
    avg_health = 0
    if latest_readings:
        avg_health = round(
            sum(r.health_index or 0 for r in latest_readings) / len(latest_readings), 1
        )

    return {
        "total_sensors": sensor_count,
        "online_sensors": online_count,
        "total_biota": biota_count,
        "active_alerts": active_alerts,
        "avg_health_index": avg_health,
        "total_zones": db.query(ConservationZone).count(),
        "total_readings": db.query(SensorReading).count(),
    }



# -------------------- SENSORS --------------------

@app.get("/api/wilayah")
def get_wilayah_list(db: Session = Depends(get_db)):
    """Get list of all unique wilayah with their sensor counts — used by frontend dropdowns."""
    rows = (
        db.query(
            Sensor.wilayah,
            Sensor.provinsi,
            func.count(Sensor.id).label("sensor_count"),
        )
        .filter(Sensor.wilayah.isnot(None))
        .group_by(Sensor.wilayah, Sensor.provinsi)
        .order_by(Sensor.provinsi, Sensor.wilayah)
        .all()
    )
    return [
        {
            "wilayah": r.wilayah,
            "provinsi": r.provinsi,
            "sensor_count": r.sensor_count,
        }
        for r in rows
    ]


@app.get("/api/sensors")
def get_sensors(
    db: Session = Depends(get_db),
    wilayah: Optional[str] = None,
    x_user_role: Optional[str] = Header(None),
    x_user_wilayah: Optional[str] = Header(None),
    x_user_provinsi: Optional[str] = Header(None)
):
    """Get all sensors with their latest readings."""
    query = db.query(Sensor)
    # Operator: filter by assigned wilayah (dari header)
    if x_user_role == "operator" and x_user_wilayah:
        query = query.filter(Sensor.wilayah == x_user_wilayah)
    # Filter by wilayah query param (opsional — dari frontend dropdown)
    elif wilayah and wilayah != "all":
        query = query.filter(Sensor.wilayah == wilayah)
    sensors = query.all()
    result = []
    for s in sensors:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.sensor_id == s.sensor_id)
            .order_by(desc(SensorReading.timestamp))
            .first()
        )
        result.append({
            "sensor_id": s.sensor_id,
            "nama_lokasi": s.nama_lokasi,
            "lat": s.lat,
            "lng": s.lng,
            "kedalaman_m": s.kedalaman_m,
            "zona": s.zona,
            "status_koneksi": s.status_koneksi,
            "status_baterai": s.status_baterai,
            "provinsi": s.provinsi,
            "wilayah": s.wilayah,
            "latest_reading": {
                "timestamp": latest.timestamp.isoformat() if latest else None,
                "ph": latest.ph if latest else None,
                "suhu_celsius": latest.suhu_celsius if latest else None,
                "salinitas_ppt": latest.salinitas_ppt if latest else None,
                "do_mg_l": latest.do_mg_l if latest else None,
                "kekeruhan_ntu": latest.kekeruhan_ntu if latest else None,
                "health_index": latest.health_index if latest else None,
            } if latest else None,
        })
    return result


@app.get("/api/sensors/{sensor_id}")
def get_sensor_detail(sensor_id: str, db: Session = Depends(get_db)):
    """Get detailed information about a single sensor."""
    sensor = db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor_id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )

    return {
        "sensor_id": sensor.sensor_id,
        "nama_lokasi": sensor.nama_lokasi,
        "lat": sensor.lat,
        "lng": sensor.lng,
        "kedalaman_m": sensor.kedalaman_m,
        "zona": sensor.zona,
        "status_koneksi": sensor.status_koneksi,
        "status_baterai": sensor.status_baterai,
        "provinsi": sensor.provinsi,
        "wilayah": sensor.wilayah,
        "latest_reading": {
            "timestamp": latest.timestamp.isoformat() if latest else None,
            "ph": latest.ph if latest else None,
            "suhu_celsius": latest.suhu_celsius if latest else None,
            "salinitas_ppt": latest.salinitas_ppt if latest else None,
            "do_mg_l": latest.do_mg_l if latest else None,
            "kekeruhan_ntu": latest.kekeruhan_ntu if latest else None,
            "health_index": latest.health_index if latest else None,
        } if latest else None,
        "thresholds": THRESHOLDS,
    }


@app.get("/api/sensors/{sensor_id}/readings")
def get_sensor_readings(
    sensor_id: str,
    period: str = Query("24h", description="Period: 24h, 7d, 30d, 90d"),
    db: Session = Depends(get_db),
):
    """Get historical readings for a sensor."""
    now = datetime.utcnow()
    periods = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}
    days = periods.get(period, 1)
    start_time = now - timedelta(days=days)

    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.sensor_id == sensor_id,
            SensorReading.timestamp >= start_time,
        )
        .order_by(SensorReading.timestamp)
        .all()
    )

    # Downsample for large datasets
    step = 1
    if period == "7d":
        step = 4  # every hour
    elif period == "30d":
        step = 16  # every 4 hours
    elif period == "90d":
        step = 48  # every 12 hours

    result = []
    for i, r in enumerate(readings):
        if i % step == 0:
            result.append({
                "timestamp": r.timestamp.isoformat(),
                "ph": r.ph,
                "suhu_celsius": r.suhu_celsius,
                "salinitas_ppt": r.salinitas_ppt,
                "do_mg_l": r.do_mg_l,
                "kekeruhan_ntu": r.kekeruhan_ntu,
                "health_index": r.health_index,
            })

    return result


# -------------------- SENSORS OPERATOR CRUD --------------------

@app.post("/api/sensors")
def create_sensor(body: dict, db: Session = Depends(get_db)):
    """[Operator/Admin] Tambah sensor baru + generate data historis dummy 7 hari."""
    import uuid
    from app.seeder import generate_reading, check_thresholds_and_create_alert, WILAYAH_PROFILE

    wilayah = body.get("wilayah", "default")
    
    # Map wilayah to its abbreviation
    ABBREVIATIONS = {
        "pangandaran": "PGD",
        "sukabumi": "SKB",
        "indramayu": "IDR",
        "cirebon": "CRB",
        "karawang": "KRW",
        "subang": "SBG",
        "parangtritis": "PRG",
        "karimunjawa": "KJW",
        "nusa penida": "NPD",
        "buleleng": "BLL",
        "banyuwangi": "BWI",
        "wakatobi": "WKT",
        "bunaken": "BNK",
        "manggarai barat": "KMD",
        "raja ampat": "RAA",
        "maluku tengah": "MLK"
    }
    
    abbrev = ABBREVIATIONS.get(wilayah.lower(), "SNS")
    
    sensor_id = body.get("sensor_id")
    if not sensor_id:
        count = db.query(Sensor).filter(Sensor.wilayah == wilayah).count()
        num = count + 1
        while True:
            temp_id = f"OS-{abbrev}-{str(num).zfill(3)}"
            if not db.query(Sensor).filter(Sensor.sensor_id == temp_id).first():
                sensor_id = temp_id
                break
            num += 1

    if db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first():
        raise HTTPException(status_code=400, detail="sensor_id sudah ada")

    sensor = Sensor(
        sensor_id=sensor_id,
        nama_lokasi=body.get("nama_lokasi", ""),
        lat=float(body.get("lat", 0)),
        lng=float(body.get("lng", 0)),
        provinsi=body.get("provinsi"),
        wilayah=body.get("wilayah"),
        kedalaman_m=float(body.get("kedalaman_m", 0)),
        zona=body.get("zona", "pemanfaatan_umum"),
        status_koneksi=body.get("status_koneksi", "online"),
        status_baterai=int(float(str(body.get("status_baterai", 100)))),
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)

    # --- Generate data historis dummy 7 hari (setiap 30 menit) ---
    sensor_dict = {
        "sensor_id": sensor.sensor_id,
        "zona": sensor.zona,
        "kedalaman_m": sensor.kedalaman_m,
        "wilayah": sensor.wilayah or "default",
    }

    now = datetime.utcnow()
    readings_batch = []
    alerts_batch = []

    for day_offset in range(7, -1, -1):
        base_date = now - timedelta(days=day_offset)
        for minute_offset in range(0, 1440, 30):  # setiap 30 menit
            reading_time = base_date.replace(
                hour=minute_offset // 60,
                minute=minute_offset % 60,
                second=0, microsecond=0
            )
            reading = generate_reading(reading_time, sensor_dict, day_offset)
            readings_batch.append(SensorReading(**reading))

            alert_data = check_thresholds_and_create_alert(reading)
            if alert_data:
                alert_data["created_at"] = reading_time
                alert_data["is_resolved"] = day_offset > 0
                if day_offset > 0:
                    import random
                    alert_data["resolved_at"] = reading_time + timedelta(hours=random.randint(1, 4))
                alerts_batch.append(Alert(**alert_data))

    db.bulk_save_objects(readings_batch)
    db.bulk_save_objects(alerts_batch)
    db.commit()

    profile = WILAYAH_PROFILE.get(sensor.wilayah or "default", WILAYAH_PROFILE["default"])
    return {
        "message": f"Sensor {sensor_id} berhasil ditambahkan dengan {len(readings_batch)} data historis (7 hari)",
        "sensor_id": sensor.sensor_id,
        "wilayah": sensor.wilayah,
        "data_generated": len(readings_batch),
        "alerts_generated": len(alerts_batch),
    }


@app.put("/api/sensors/{sensor_id}/update")
def update_sensor(sensor_id: str, body: dict, db: Session = Depends(get_db)):
    """[Operator/Admin] Update sensor."""
    sensor = db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor tidak ditemukan")
    for field in ["nama_lokasi", "zona", "status_koneksi", "provinsi", "wilayah"]:
        if field in body and body[field] is not None:
            setattr(sensor, field, str(body[field]))
    for float_field in ["lat", "lng", "kedalaman_m"]:
        if float_field in body and body[float_field] is not None:
            setattr(sensor, float_field, float(body[float_field]))
    if "status_baterai" in body and body["status_baterai"] is not None:
        sensor.status_baterai = int(float(str(body["status_baterai"])))
    db.commit()
    db.refresh(sensor)
    return {"message": "Sensor berhasil diperbarui", "sensor_id": sensor.sensor_id}


@app.delete("/api/sensors/{sensor_id}/delete")
def delete_sensor(sensor_id: str, db: Session = Depends(get_db)):
    """[Operator] Hapus sensor beserta semua readingnya."""
    sensor = db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor tidak ditemukan")
    db.query(Alert).filter(Alert.sensor_id == sensor_id).delete()
    db.query(SensorReading).filter(SensorReading.sensor_id == sensor_id).delete()
    db.delete(sensor)
    db.commit()
    return {"message": "Sensor berhasil dihapus"}


# -------------------- ALERTS --------------------

@app.get("/api/alerts")
def get_alerts(
    active_only: bool = Query(False),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    x_user_role: Optional[str] = Header(None),
    x_user_wilayah: Optional[str] = Header(None),
    x_user_provinsi: Optional[str] = Header(None)
):
    """Get recent alerts."""
    query = db.query(Alert)
    if x_user_role == "operator" and x_user_wilayah:
        query = query.join(Sensor, Alert.sensor_id == Sensor.sensor_id).filter(Sensor.wilayah == x_user_wilayah)
    elif x_user_role in ("admin", "pengguna") and x_user_provinsi:
        query = query.join(Sensor, Alert.sensor_id == Sensor.sensor_id).filter(Sensor.provinsi == x_user_provinsi)
        
    if active_only:
        query = query.filter(Alert.is_resolved == False)
    alerts = query.order_by(desc(Alert.created_at)).limit(limit).all()

    return [
        {
            "id": a.id,
            "sensor_id": a.sensor_id,
            "parameter": a.parameter,
            "value": a.value,
            "threshold_min": a.threshold_min,
            "threshold_max": a.threshold_max,
            "level": a.level,
            "message": a.message,
            "is_resolved": a.is_resolved,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
        }
        for a in alerts
    ]


@app.patch("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """[Operator/Admin] Tandai peringatan sebagai selesai (manual oleh operator)."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert tidak ditemukan")
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    db.commit()
    # Hapus dari tracking state agar notifikasi baru bisa muncul jika bahaya kembali
    danger_key = f"{alert.sensor_id}_{alert.parameter}"
    active_danger_states.pop(danger_key, None)
    return {"message": "Peringatan berhasil diselesaikan", "id": alert_id}


@app.get("/api/alerts/stream")
async def alerts_stream(request: Request):
    """Server-Sent Events stream untuk peringatan real-time."""
    queue = asyncio.Queue()
    sse_clients.add(queue)

    async def event_generator():
        try:
            # Kirim sinyal koneksi berhasil
            yield "data: {\"type\": \"connected\"}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    alert_dict = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"data: {json.dumps(alert_dict)}\n\n"
                except asyncio.TimeoutError:
                    # Keepalive agar koneksi tidak terputus
                    yield "data: {\"type\": \"ping\"}\n\n"
        finally:
            sse_clients.discard(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


# -------------------- BIOTA --------------------

@app.get("/api/biota")
def get_biota(
    zona: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get marine biota species, optionally filtered by depth zone or search."""
    query = db.query(Biota)
    if zona:
        query = query.filter(Biota.zona_kedalaman == zona)
    if search:
        query = query.filter(
            Biota.nama_umum.contains(search) | Biota.nama_ilmiah.contains(search)
        )
    species = query.order_by(Biota.zona_kedalaman, Biota.nama_umum).all()

    return [
        {
            "biota_id": b.biota_id,
            "nama_umum": b.nama_umum,
            "nama_ilmiah": b.nama_ilmiah,
            "zona_kedalaman": b.zona_kedalaman,
            "status_konservasi": b.status_konservasi,
            "deskripsi": b.deskripsi,
            "foto_url": b.foto_url,
            "habitat": b.habitat,
        }
        for b in species
    ]


@app.get("/api/biota/{biota_id}")
def get_biota_detail(biota_id: str, db: Session = Depends(get_db)):
    """Get detailed info about a species."""
    b = db.query(Biota).filter(Biota.biota_id == biota_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Biota not found")
    return {
        "biota_id": b.biota_id,
        "nama_umum": b.nama_umum,
        "nama_ilmiah": b.nama_ilmiah,
        "zona_kedalaman": b.zona_kedalaman,
        "status_konservasi": b.status_konservasi,
        "deskripsi": b.deskripsi,
        "foto_url": b.foto_url,
        "habitat": b.habitat,
    }


# -------------------- BIOTA OPERATOR CRUD --------------------

@app.post("/api/biota")
def create_biota(body: dict, db: Session = Depends(get_db)):
    """[Operator] Tambah spesies biota baru."""
    import uuid
    biota_id = body.get("biota_id") or f"BIO-{uuid.uuid4().hex[:6].upper()}"
    if db.query(Biota).filter(Biota.biota_id == biota_id).first():
        raise HTTPException(status_code=400, detail="biota_id sudah ada")
    b = Biota(
        biota_id=biota_id,
        nama_umum=body.get("nama_umum", ""),
        nama_ilmiah=body.get("nama_ilmiah", ""),
        zona_kedalaman=body.get("zona_kedalaman", "epipelagik"),
        status_konservasi=body.get("status_konservasi", "Data Deficient"),
        deskripsi=body.get("deskripsi", ""),
        foto_url=body.get("foto_url", ""),
        habitat=body.get("habitat", ""),
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"message": "Biota berhasil ditambahkan", "biota_id": b.biota_id}


@app.put("/api/biota/{biota_id}/update")
def update_biota(biota_id: str, body: dict, db: Session = Depends(get_db)):
    """[Operator] Update data spesies biota."""
    b = db.query(Biota).filter(Biota.biota_id == biota_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Biota tidak ditemukan")
    for field in ["nama_umum", "nama_ilmiah", "zona_kedalaman", "status_konservasi", "deskripsi", "foto_url", "habitat"]:
        if field in body:
            setattr(b, field, body[field])
    db.commit()
    return {"message": "Biota berhasil diperbarui"}


@app.delete("/api/biota/{biota_id}/delete")
def delete_biota(biota_id: str, db: Session = Depends(get_db)):
    """[Operator] Hapus spesies biota."""
    b = db.query(Biota).filter(Biota.biota_id == biota_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Biota tidak ditemukan")
    db.delete(b)
    db.commit()
    return {"message": "Biota berhasil dihapus"}


# -------------------- CONSERVATION ZONES --------------------

@app.get("/api/zones")
def get_zones(db: Session = Depends(get_db)):
    """Get conservation zones with GeoJSON boundaries."""
    zones = db.query(ConservationZone).all()
    return [
        {
            "id": z.id,
            "name": z.name,
            "zone_type": z.zone_type,
            "description": z.description,
            "color": z.color,
            "geojson": z.geojson,
        }
        for z in zones
    ]


# -------------------- HEALTH INDEX --------------------

@app.get("/api/health-index")
def get_health_index(db: Session = Depends(get_db)):
    """Get Ocean Health Index for all sensors."""
    sensors = db.query(Sensor).all()
    result = []
    for s in sensors:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.sensor_id == s.sensor_id)
            .order_by(desc(SensorReading.timestamp))
            .first()
        )
        result.append({
            "sensor_id": s.sensor_id,
            "nama_lokasi": s.nama_lokasi,
            "lat": s.lat,
            "lng": s.lng,
            "health_index": latest.health_index if latest else None,
            "zona": s.zona,
        })
    return result


# -------------------- CHATBOT --------------------

SYSTEM_PROMPT = """Kamu adalah OceanBot, asisten AI resmi platform OceanSmart untuk monitoring konservasi laut Indonesia.

Kamu adalah pakar kelautan yang memiliki pengetahuan mendalam tentang:
- Ekosistem terumbu karang, mangrove, padang lamun, dan perairan tropis Indonesia
- Biota laut: ikan, mamalia laut, invertebrata, alga, dan organisme karang
- Kualitas air laut: pH, suhu, salinitas, oksigen terlarut (DO), kekeruhan (turbidity)
- Konservasi laut: status IUCN, ancaman, program perlindungan
- Sensor IoT kelautan: monitoring, kalibrasi, interpretasi data, penanganan anomali
- Platform OceanSmart: fitur dashboard, digital twin, simulator, monitoring, biota database

PENGETAHUAN DASAR YANG HARUS KAMU KUASAI:

Tentang Parameter Kualitas Air:
- pH normal laut: 7.5–8.5. Di bawah 7.5 = asidifikasi berbahaya untuk karang & moluska. Di atas 8.5 = alkalinitas tinggi.
- Suhu normal: 26–30°C. Di atas 30°C memicu coral bleaching. Di bawah 25°C = stres termal pada ikan tropis.
- Salinitas: 30–35 ppt. Turun drastis = limpasan air tawar (banjir/hujan). Naik = penguapan tinggi.
- DO (Oksigen Terlarut): minimal 5 mg/L. Di bawah 5 = hipoksia, ikan mati massal. Idealnya 6–8 mg/L.
- Kekeruhan: di bawah 10 NTU idealnya. Tinggi = sedimen, pencemaran, atau badai.

Tentang Coral Bleaching (Pemutihan Karang):
- Terjadi saat suhu naik 1–2°C di atas normal selama 4+ minggu
- Karang mengusir alga simbiotik (zooxanthellae) → karang memutih
- Pemutihan bukan berarti karang mati, tapi stres berat — jika tidak pulih dalam 4–8 minggu, karang mati
- Penyebab: El Niño, perubahan iklim, polusi, sedimentasi
- Solusi: kurangi tekanan lokal (penangkapan berlebih, pariwisata destruktif, polusi), amati dari jarak aman

Tentang Biota Laut Umum:
- Ikan Badut (Nemo) / Amphiprion ocellaris: hidup di anemon laut, Least Concern IUCN, tersebar Indo-Pasifik. Kedalaman 1–15m.
- Penyu Hijau / Chelonia mydas: Endangered, pemakan lamun & alga, bertelur di pantai tropis Indonesia. Dilindungi penuh.
- Hiu Karang Sirip Hitam / Carcharhinus melanopterus: Vulnerable, predator puncak perairan dangkal, penting untuk keseimbangan ekosistem.
- Pari Manta / Mobula birostris: Vulnerable, pemakan plankton, rentang sayap hingga 7m. Sering terlihat di Komodo & Raja Ampat.
- Kuda Laut Pygmy: Data Deficient IUCN, ukuran < 2cm, terancam perdagangan ilegal & kerusakan habitat.
- Ubur-ubur Kotak / Cubozoa: Least Concern, sengatan berbahaya bagi manusia, populasi meningkat akibat perubahan iklim.
- Gurita Cincin Biru / Hapalochlaena: racun tetrodotoxin sangat mematikan, ukuran kecil, tersebar Indo-Pasifik.

Tentang Kawasan Konservasi di OceanSmart:
- Pangandaran: karang fringing, lamun, mangrove. Kondisi relatif baik. Ancaman: sedimentasi pantai.
- Karimunjawa: taman nasional laut Jawa Tengah. 50+ spesies karang, 242+ spesies ikan. Ancaman: pariwisata masif.
- Wakatobi: biodiversitas tertinggi di Indonesia. 750+ spesies karang, 942+ spesies ikan. Status RAMSAR.
- Bunaken: salah satu wall dive terbaik dunia. 70% spesies karang dunia ada di sini.
- Raja Ampat: "epicenter of marine biodiversity", 1.427 spesies ikan, 537 spesies karang.
- Nusa Penida: habitat manta ray & mola-mola (ikan bulan).

Kemampuan utamamu:
1. Membaca & menganalisis data sensor real-time (pH, suhu, salinitas, DO, kekeruhan, health index)
2. Menjelaskan peringatan aktif — penyebab, tingkat risiko, dampak ekologis, dan rekomendasi penanganan spesifik
3. Menjawab pertanyaan detail tentang biota laut (habitat, distribusi, status konservasi, ancaman, perilaku)
4. Menjelaskan fenomena laut: coral bleaching, eutrofikasi, asidifikasi, upwelling, ENSO/El Niño, dll
5. Memberikan edukasi konservasi yang menarik untuk semua kalangan
6. Membantu operator/admin memahami kondisi sensor berdasarkan ID

Panduan menjawab:
- Gunakan data konteks sensor yang diberikan untuk pertanyaan monitoring. Jangan mengarang nilai sensor.
- Untuk pertanyaan biota dan kelautan umum: gunakan pengetahuanmu yang luas untuk menjawab secara detail dan informatif.
- Untuk biota yang ada di database OceanSmart (tertera di konteks): sertakan informasi dari database tersebut.
- Batas aman parameter: pH (7.5–8.5), Suhu (26–30°C), Salinitas (30–35 ppt), DO (≥5 mg/L), Kekeruhan (0–10 NTU).
- JANGAN gunakan tanda ** (bold markdown). Tulis teks biasa saja.
- Gunakan emoji secukupnya agar mudah dibaca dan menarik.
- Jawab dalam Bahasa Indonesia yang ramah, informatif, dan ilmiah tapi mudah dipahami.
- Untuk pertanyaan yang tidak ada di konteks sensor: tetap jawab dengan pengetahuan kelautan yang kamu miliki.
- Berikan jawaban yang DETAIL dan LENGKAP — jangan terlalu singkat untuk pertanyaan yang membutuhkan penjelasan."""


def clean_reply(text: str) -> str:
    """Remove markdown bold markers from reply."""
    return text.replace("**", "")


ABBREVIATIONS = {
    "pangandaran": "PGD",
    "sukabumi": "SKB",
    "indramayu": "IDR",
    "cirebon": "CRB",
    "karawang": "KRW",
    "subang": "SBG",
    "parangtritis": "PRG",
    "karimunjawa": "KJW",
    "nusa penida": "NPD",
    "buleleng": "BLL",
    "banyuwangi": "BWI",
    "wakatobi": "WKT",
    "bunaken": "BNK",
    "manggarai barat": "KMD",
    "raja ampat": "RAA",
    "maluku tengah": "MLK"
}

def find_sensors_in_query(message: str, sensors: list, x_user_wilayah: str = None) -> list:
    import re
    msg_lower = message.lower()
    found = []
    
    # 1. Match exact sensor IDs, e.g. OS-PGD-001, OS-SENSOR-002
    id_pattern = re.findall(r'os[-\s]?(sensor|[a-z]{3})[-\s]?(\d+)', msg_lower)
    for abbrev, num in id_pattern:
        num_str = num.zfill(3)
        sid = f"OS-{abbrev.upper()}-{num_str}"
        match = next((s for s in sensors if s.sensor_id == sid), None)
        if match and match not in found:
            found.append(match)
            
    # 2. Match general "sensor 1", "sensor #1", "sensor 001"
    sensor_num_matches = re.findall(r'sensor[-\s]?#?(\d+)', msg_lower)
    for num in sensor_num_matches:
        num_str = num.zfill(3)
        region_matched = False
        for s in sensors:
            if s.wilayah.lower() in msg_lower and s.sensor_id.endswith(num_str):
                if s not in found:
                    found.append(s)
                region_matched = True
        
        if not region_matched and x_user_wilayah:
            for s in sensors:
                if s.wilayah.lower() == x_user_wilayah.lower() and s.sensor_id.endswith(num_str):
                    if s not in found:
                        found.append(s)
                    region_matched = True
                    
        if not region_matched:
            for s in sensors:
                if s.sensor_id.endswith(num_str):
                    if s not in found:
                        found.append(s)
                    break
                    
    return found

def build_sensor_context(message: str, sensors: list, active_alerts: list, db, x_user_wilayah: str = None) -> str:
    """Builds a rich, relevant context string based on what the user is asking."""
    import re
    msg_up = message.upper()
    
    # Extract attempted sensor ID mentions for error reporting
    sensor_id_pattern = re.findall(r'OS[-\s]?[A-Z]{3,6}[-\s]?\d+', msg_up)
    sensor_id_pattern = [re.sub(r'\s', '', s) for s in sensor_id_pattern]

    focused_sensors = find_sensors_in_query(message, sensors, x_user_wilayah)
    # If no specific sensor mentioned, use only first 5 to keep context lean
    sensors_to_show = focused_sensors if focused_sensors else sensors[:5]

    # --- 2. Build sensor data blocks ---
    parts = []

    if focused_sensors:
        parts.append(f"=== DATA SENSOR YANG DIMINTA ===")
    else:
        parts.append(f"=== DATA SENSOR REAL-TIME (SEMUA, {len(sensors)} SENSOR) ===")

    for s in sensors_to_show:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.sensor_id == s.sensor_id)
            .order_by(desc(SensorReading.timestamp))
            .first()
        )
        sensor_alerts = [a for a in active_alerts if a.sensor_id == s.sensor_id]
        status_alert = f"⚠️ {len(sensor_alerts)} PERINGATAN AKTIF" if sensor_alerts else "✅ Normal"

        parts.append(f"\nSensor ID : {s.sensor_id}")
        parts.append(f"Lokasi    : {s.nama_lokasi} ({s.wilayah}, {s.provinsi})")
        parts.append(f"Zona      : {s.zona} | Kedalaman: {s.kedalaman_m}m")
        parts.append(f"Koneksi   : {s.status_koneksi} | Baterai: {s.status_baterai}%")
        parts.append(f"Status    : {status_alert}")

        if latest:
            parts.append(f"--- Pembacaan Terakhir ({latest.timestamp.strftime('%d %b %Y %H:%M') if latest.timestamp else '-'}) ---")
            parts.append(f"  pH          : {latest.ph}  (aman: 7.5–8.5)")
            parts.append(f"  Suhu        : {latest.suhu_celsius}°C  (aman: 26–30°C)")
            parts.append(f"  Salinitas   : {latest.salinitas_ppt} ppt  (aman: 30–35 ppt)")
            parts.append(f"  DO          : {latest.do_mg_l} mg/L  (aman: ≥5 mg/L)")
            parts.append(f"  Kekeruhan   : {latest.kekeruhan_ntu} NTU  (aman: 0–10 NTU)")
            parts.append(f"  Health Index: {latest.health_index}/100")
        else:
            parts.append("  [Tidak ada data pembacaan terbaru]")

        # Attach active alerts for this sensor
        if sensor_alerts:
            parts.append(f"--- Peringatan Aktif ---")
            for a in sensor_alerts:
                parts.append(
                    f"  🔴 [{a.level.upper()}] {a.parameter}: nilai={a.value}, "
                    f"batas aman={a.threshold_min}–{a.threshold_max} | {a.message}"
                )

    # --- 3. If sensor ID was mentioned but not found ---
    if sensor_id_pattern and not focused_sensors:
        parts.append(f"\n⚠️ Sensor ID '{', '.join(sensor_id_pattern)}' tidak ditemukan dalam database OceanSmart.")
        parts.append("Sensor yang terdaftar: " + ", ".join(s.sensor_id for s in sensors))

    # --- 4. Overall active alert summary ---
    if active_alerts and not focused_sensors:
        parts.append(f"\n=== RINGKASAN PERINGATAN AKTIF ({len(active_alerts)} total) ===")
        by_sensor: dict = {}
        for a in active_alerts:
            by_sensor.setdefault(a.sensor_id, []).append(a)
        for sid, sal in list(by_sensor.items())[:5]:  # max 5 sensors
            sensor_name = next((s.nama_lokasi for s in sensors if s.sensor_id == sid), sid)
            for a in sal[:1]:  # 1 alert per sensor in summary
                parts.append(
                    f"  [{a.level.upper()}] {sid} ({sensor_name}): "
                    f"{a.parameter}={a.value} (batas: {a.threshold_min}–{a.threshold_max})"
                )

    return "\n".join(parts)


@app.post("/api/chatbot")
async def chatbot_message(
    body: dict,
    db: Session = Depends(get_db),
    x_user_role: Optional[str] = Header(None),
    x_user_wilayah: Optional[str] = Header(None)
):
    """Chatbot endpoint with rich real-time sensor context."""
    message = body.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    # --- Fetch all relevant sensors ---
    sensor_q = db.query(Sensor)
    if x_user_role == "operator" and x_user_wilayah:
        sensor_q = sensor_q.filter(Sensor.wilayah == x_user_wilayah)
    sensors = sensor_q.all()

    # --- Fetch active alerts ---
    active_alerts_q = db.query(Alert).filter(Alert.is_resolved == False)
    if x_user_role == "operator" and x_user_wilayah:
        operator_sensor_ids = [s.sensor_id for s in sensors]
        active_alerts_q = active_alerts_q.filter(Alert.sensor_id.in_(operator_sensor_ids))
    active_alerts = active_alerts_q.order_by(desc(Alert.created_at)).all()

    # --- Build rich context ---
    context = build_sensor_context(message, sensors, active_alerts, db, x_user_wilayah)

    # --- Inject biota context if question is about biota/species ---
    msg_lower = message.lower()
    biota_keywords = ["biota", "ikan", "nemo", "penyu", "hiu", "ubur", "pari", "kuda laut", "gurita",
                      "tuna", "napoleon", "buntal", "manta", "kepe", "bintang laut", "terancam",
                      "punah", "konservasi", "habitat", "spesies", "iucn", "laut", "karang", "reef",
                      "coral", "mangrove", "lamun", "ekosistem", "biodiversitas"]
    if any(kw in msg_lower for kw in biota_keywords):
        biota_list = db.query(Biota).all()
        if biota_list:
            context += "\n\n=== DATABASE BIOTA LAUT OCEANSMART ==="
            for b in biota_list:
                context += f"\n{b.nama_umum} ({b.nama_ilmiah}): Zona {b.zona_kedalaman}, Status IUCN: {b.status_konservasi}. {b.deskripsi or ''} Habitat: {b.habitat or '-'}"

    from app.config import GEMINI_API_KEY, MISTRAL_API_KEY
    import httpx

    user_prompt = (
        f"Konteks Data Real-Time OceanSmart:\n{context}\n\n"
        f"Pertanyaan/Pesan dari pengguna ({x_user_role or 'pengguna'}): {message}"
    )

    # --- Try Gemini ---
    if GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                    json={
                        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                        "contents": [{"parts": [{"text": user_prompt}]}],
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if text:
                        return {"reply": clean_reply(text), "context_used": True}
        except Exception:
            pass

    # --- Try Mistral ---
    if MISTRAL_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": "mistral-small-latest",
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt}
                        ]
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        return {"reply": clean_reply(text), "context_used": True}
        except Exception:
            pass

    # --- Offline fallback — still uses real data ---
    import re
    msg_lower = message.lower()

    # Detect sensor ID request
    focused_sensors = find_sensors_in_query(message, sensors, x_user_wilayah)
    if focused_sensors:
        sensor = focused_sensors[0]
        sid = sensor.sensor_id
    else:
        # Check if they attempted to query a sensor ID, e.g. "os-pgd-099" or "sensor 99"
        attempted_matches = re.findall(r'(?:os[-\s]?)?(sensor|[a-z]{3})[-\s]?#?(\d+)', msg_lower)
        if attempted_matches:
            abbrev, num = attempted_matches[0]
            sid = f"OS-{abbrev.upper()}-{num.zfill(3)}"
            return {"reply": f"❌ Sensor **{sid}** tidak ditemukan dalam database OceanSmart.\n\nSensor yang terdaftar: {', '.join(s.sensor_id for s in sensors[:10])}{'...' if len(sensors) > 10 else ''}.", "context_used": False}

        latest = db.query(SensorReading).filter(SensorReading.sensor_id == sid).order_by(desc(SensorReading.timestamp)).first()
        sensor_alerts = [a for a in active_alerts if a.sensor_id == sid]

        lines = [f"📡 **{sensor.sensor_id}** — {sensor.nama_lokasi}"]
        lines.append(f"📍 {sensor.wilayah}, {sensor.provinsi} | Zona: {sensor.zona} | Kedalaman: {sensor.kedalaman_m}m")
        lines.append(f"🔋 Baterai: {sensor.status_baterai}% | Koneksi: {sensor.status_koneksi}")

        if latest:
            lines.append(f"\n📊 **Parameter Terakhir:**")
            lines.append(f"• pH: {latest.ph} {'✅' if 7.5 <= latest.ph <= 8.5 else '🔴 di luar batas (7.5–8.5)'}")
            lines.append(f"• Suhu: {latest.suhu_celsius}°C {'✅' if 26 <= latest.suhu_celsius <= 30 else '🔴 di luar batas (26–30°C)'}")
            lines.append(f"• Salinitas: {latest.salinitas_ppt} ppt {'✅' if 30 <= latest.salinitas_ppt <= 35 else '🔴 di luar batas (30–35 ppt)'}")
            lines.append(f"• DO: {latest.do_mg_l} mg/L {'✅' if latest.do_mg_l >= 5 else '🔴 di bawah batas aman (≥5 mg/L)'}")
            lines.append(f"• Kekeruhan: {latest.kekeruhan_ntu} NTU {'✅' if latest.kekeruhan_ntu <= 10 else '🔴 melebihi batas (0–10 NTU)'}")
            lines.append(f"• Health Index: {latest.health_index}/100")

        if sensor_alerts:
            lines.append(f"\n⚠️ **{len(sensor_alerts)} Peringatan Aktif:**")
            for a in sensor_alerts[:5]:
                lines.append(f"• [{a.level.upper()}] {a.parameter}: {a.value} (batas: {a.threshold_min}–{a.threshold_max})")
                lines.append(f"  → {a.message}")
        else:
            lines.append("\n✅ Tidak ada peringatan aktif pada sensor ini.")

        return {"reply": "\n".join(lines), "context_used": True}

    # Alert/parameter queries
    if any(w in msg_lower for w in ["peringatan", "alert", "bahaya", "waspada"]):
        if not active_alerts:
            return {"reply": "✅ Tidak ada peringatan aktif saat ini. Semua sensor dalam kondisi normal.", "context_used": True}
        lines = [f"⚠️ **{len(active_alerts)} Peringatan Aktif:**\n"]
        for a in active_alerts[:8]:
            sensor_name = next((s.nama_lokasi for s in sensors if s.sensor_id == a.sensor_id), a.sensor_id)
            lines.append(f"🔴 **[{a.level.upper()}]** {a.sensor_id} — {sensor_name}")
            lines.append(f"   {a.parameter}: {a.value} (batas aman: {a.threshold_min}–{a.threshold_max})")
            lines.append(f"   {a.message}\n")
        if len(active_alerts) > 8:
            lines.append(f"_...dan {len(active_alerts) - 8} peringatan lainnya._")
        return {"reply": "\n".join(lines), "context_used": True}

    if any(w in msg_lower for w in ["suhu", "ph", "salinitas", "do ", "dissolved", "kekeruhan", "kualitas", "parameter"]):
        lines = ["📊 **Kondisi Parameter Terkini (5 Sensor Pertama):**\n"]
        for s in sensors[:5]:
            latest = db.query(SensorReading).filter(SensorReading.sensor_id == s.sensor_id).order_by(desc(SensorReading.timestamp)).first()
            if latest:
                hi = latest.health_index or 0
                status = "🟢" if hi >= 70 else "🟡" if hi >= 50 else "🔴"
                lines.append(f"{status} **{s.sensor_id}** ({s.nama_lokasi})")
                lines.append(f"   pH={latest.ph} | Suhu={latest.suhu_celsius}°C | DO={latest.do_mg_l} mg/L | HI={hi}/100\n")
        return {"reply": "\n".join(lines), "context_used": True}

    if any(w in msg_lower for w in ["biota", "ikan", "nemo", "penyu", "hiu", "ubur", "pari", "kuda laut",
                                     "gurita", "tuna", "napoleon", "manta", "karang", "terumbu", "spesies",
                                     "terancam", "punah", "iucn", "habitat", "coral", "reef", "ekosistem"]):
        biota_list = db.query(Biota).all()
        biota_count = len(biota_list)
        # Cari spesies yang relevan dengan kata kunci
        msg_words = msg_lower.split()
        matched = [b for b in biota_list if any(
            w in b.nama_umum.lower() or w in (b.nama_ilmiah or '').lower()
            for w in msg_words if len(w) > 3
        )]
        if matched:
            b = matched[0]
            lines = [f"🐠 {b.nama_umum} ({b.nama_ilmiah})"]
            lines.append(f"Zona kedalaman: {b.zona_kedalaman}")
            lines.append(f"Status konservasi IUCN: {b.status_konservasi}")
            if b.deskripsi:
                lines.append(f"Deskripsi: {b.deskripsi}")
            if b.habitat:
                lines.append(f"Habitat: {b.habitat}")
            lines.append(f"\nDatabase OceanSmart mencatat {biota_count} spesies biota laut total.")
            return {"reply": "\n".join(lines), "context_used": True}
        return {"reply": f"🐠 Database OceanSmart mencatat {biota_count} spesies biota laut dari berbagai zona kedalaman.\n\nGunakan menu Biota Laut untuk melihat model 3D interaktif dan informasi lengkap tiap spesies!", "context_used": True}

    if any(w in msg_lower for w in ["health", "index", "kesehatan laut", "ocean health"]):
        return {"reply": "💙 **Ocean Health Index (OHI)** adalah nilai 0–100 yang menggambarkan kesehatan ekosistem perairan.\n\n**Rumus:** rata-rata skor dari pH, Suhu, Salinitas, DO, dan Kekeruhan.\n\n🟢 85–100: Sangat Baik\n🟡 70–84: Baik\n🟠 50–69: Sedang\n🔴 <50: Perlu Perhatian", "context_used": False}

    if any(w in msg_lower for w in ["halo", "hai", "hello", "hi", "pagi", "siang", "malam", "selamat"]):
        jumlah_aktif = len(active_alerts)
        status_msg = f"⚠️ Ada {jumlah_aktif} peringatan aktif yang perlu ditangani." if jumlah_aktif else "✅ Semua sensor dalam kondisi aman."
        return {"reply": f"🌊 Halo! Saya OceanBot, asisten AI OceanSmart.\n\n{status_msg}\n\nSaya bisa membantu kamu dengan:\n\n🔬 Monitoring Sensor\n  Contoh: 'kondisi OS-PGD-001' atau 'ada peringatan di Pangandaran?'\n\n🐠 Biota & Ekosistem Laut\n  Contoh: 'Nemo hidup dimana?' atau 'Apa itu coral bleaching?'\n\n📊 Kualitas Air & Konservasi\n  Contoh: 'Apa itu pH aman untuk karang?' atau 'Wakatobi ada berapa spesies?'\n\n⚠️ Analisis Peringatan\n  Contoh: 'Apa penyebab pH turun?' atau 'Bagaimana penanganan suhu tinggi?'\n\nAda yang ingin ditanyakan?", "context_used": True}

    # Generic fallback with real context
    return {
        "reply": f"📋 Berikut ringkasan kondisi OceanSmart saat ini:\n\n{context[:800]}...\n\nSilakan tanyakan lebih spesifik, misalnya: *'kondisi OS-SENSOR-001'* atau *'ada peringatan apa?'*",
        "context_used": True
    }


# -------------------- AUTHENTICATION --------------------

@app.post("/api/register")
def register_user(body: dict, db: Session = Depends(get_db)):
    nama = body.get("nama")
    email = body.get("email")
    password = body.get("password")
    
    if not email or not password or not nama:
        raise HTTPException(status_code=400, detail="Semua field wajib diisi")
    
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar. Silakan masuk.")
    
    # Registrasi mandiri selalu menjadi 'pengguna'
    # Akun operator hanya dibuat oleh admin sistem melalui seeder/DB
    new_user = User(
        email=email,
        nama=nama,
        password_hash=password,
        role="pengguna"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Registrasi berhasil! Silakan masuk.", "email": email}

@app.get("/api/users/{user_id}/profile")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return {
        "id": user.id,
        "nama": user.nama,
        "name": user.nama,
        "email": user.email,
        "role": user.role,
        "provinsi": user.provinsi,
        "wilayah": user.wilayah,
        "no_hp": user.no_hp or "",
        "picture": getattr(user, "foto_url", None)
    }

@app.put("/api/users/{user_id}/profile")
def update_profile(user_id: int, body: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    if "nama" in body and body["nama"]:
        user.nama = body["nama"]
    if "email" in body and body["email"]:
        existing = db.query(User).filter(User.email == body["email"], User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah digunakan")
        user.email = body["email"]
    if "no_hp" in body:
        user.no_hp = body["no_hp"]
    if "foto_url" in body:
        user.foto_url = body["foto_url"]
    if "picture" in body:
        user.foto_url = body["picture"]
    if "password" in body and body["password"]:
        user.password_hash = body["password"]
    
    db.commit()
    db.refresh(user)
    return {
        "message": "Profil berhasil diperbarui", 
        "user": {
            "id": user.id,
            "name": user.nama,
            "nama": user.nama,
            "email": user.email,
            "role": user.role,
            "provinsi": user.provinsi,
            "wilayah": user.wilayah,
            "no_hp": user.no_hp or "",
            "picture": getattr(user, "foto_url", None)
        }
    }

# ─── In-memory token store: { email: (token, expiry) }
_reset_tokens: dict = {}


@app.post("/api/users/{user_id}/change-password")
def change_password(user_id: int, body: dict, db: Session = Depends(get_db)):
    """Change password — requires old password verification."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")

    old_password = body.get("old_password", "")
    new_password = body.get("new_password", "")

    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Password lama dan baru wajib diisi")

    if user.password_hash != old_password:
        raise HTTPException(status_code=401, detail="Password lama tidak sesuai")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password baru minimal 6 karakter")

    user.password_hash = new_password
    db.commit()
    return {"message": "Password berhasil diperbarui"}


@app.post("/api/forgot-password")
def forgot_password(body: dict, db: Session = Depends(get_db)):
    """Generate a reset token (& optionally email it)."""
    import secrets, datetime

    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email wajib diisi")

    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar di sistem OceanSmart")

    token = str(secrets.randbelow(900000) + 100000)
    expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    _reset_tokens[email] = (token, expiry)

    # Try to send email (optional — needs SMTP config)
    try:
        import smtplib
        from email.mime.text import MIMEText
        from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
        if SMTP_HOST and SMTP_USER:
            msg = MIMEText(
                f"Halo {user.nama},\n\n"
                f"Kode reset password OceanSmart Anda:\n\n  {token}\n\n"
                f"Berlaku 15 menit.\n\nTim OceanSmart"
            )
            msg['Subject'] = f"[OceanSmart] Kode Reset Password: {token}"
            msg['From'] = SMTP_USER
            msg['To'] = user.email
            with smtplib.SMTP(SMTP_HOST, int(SMTP_PORT or 587)) as s:
                s.starttls(); s.login(SMTP_USER, SMTP_PASS); s.send_message(msg)
    except Exception:
        pass

    # In dev: return token directly for testing
    response = {"message": f"Kode reset telah dikirim ke {user.email}"}
    try:
        from app.config import DEBUG_MODE
        if DEBUG_MODE:
            response["debug_token"] = token
    except Exception:
        pass
    return response


@app.post("/api/reset-password")
def reset_password(body: dict, db: Session = Depends(get_db)):
    """Validate token and set new password."""
    import datetime

    email        = (body.get("email") or "").strip().lower()
    token        = (body.get("token") or "").strip()
    new_password = body.get("new_password", "")

    if not email or not token or not new_password:
        raise HTTPException(status_code=400, detail="Semua field wajib diisi")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")

    stored = _reset_tokens.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="Tidak ada permintaan reset untuk email ini")

    stored_token, expiry = stored
    if datetime.datetime.utcnow() > expiry:
        _reset_tokens.pop(email, None)
        raise HTTPException(status_code=400, detail="Kode reset sudah kadaluarsa. Minta kode baru.")

    if token != stored_token:
        raise HTTPException(status_code=400, detail="Kode reset tidak valid")

    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")

    user.password_hash = new_password
    db.commit()
    _reset_tokens.pop(email, None)
    return {"message": "Password berhasil direset. Silakan login dengan password baru."}


@app.post("/api/login")
def login_user(body: dict, db: Session = Depends(get_db)):
    email = (body.get("email") or "").strip()
    password = (body.get("password") or "").strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email/Username dan password wajib diisi")

    # Case-insensitive lookup by email or nama
    user = db.query(User).filter(
        (func.lower(User.email) == email.lower()) |
        (func.lower(User.nama) == email.lower())
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Akun tidak terdaftar. Silakan daftar terlebih dahulu.")

    if user.password_hash != password:
        raise HTTPException(status_code=401, detail="Kata sandi salah.")

    return {
        "id": user.id,
        "name": user.nama,
        "email": user.email,
        "role": user.role,
        "provinsi": user.provinsi,
        "wilayah": user.wilayah,
        "no_hp": user.no_hp
    }

# -------------------- OPERATOR MANAGEMENT (Admin Only) --------------------

def serialize_user(u) -> dict:
    """Serialize a User ORM object to a plain dict."""
    return {
        "id": u.id,
        "nama": u.nama,
        "email": u.email,
        "role": u.role,
        "provinsi": u.provinsi,
        "wilayah": u.wilayah,
        "no_hp": u.no_hp,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@app.get("/api/operators")
def get_operators(db: Session = Depends(get_db)):
    """[Admin] Returns all users with role 'operator'."""
    operators = db.query(User).filter(User.role == "operator").order_by(User.wilayah).all()
    return [serialize_user(op) for op in operators]


@app.post("/api/operators")
def create_operator(body: dict, db: Session = Depends(get_db)):
    """[Admin] Create a new operator account."""
    nama = body.get("nama")
    email = body.get("email")
    password = body.get("password")

    if not email or not password or not nama:
        raise HTTPException(status_code=400, detail="Semua field wajib diisi")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar.")

    new_operator = User(
        email=email,
        nama=nama,
        password_hash=password,
        role="operator",
        provinsi=body.get("provinsi"),
        wilayah=body.get("wilayah"),
        no_hp=body.get("no_hp"),
    )
    db.add(new_operator)
    db.commit()
    db.refresh(new_operator)
    return {"message": "Akun operator berhasil dibuat", "operator": serialize_user(new_operator)}


@app.put("/api/operators/{user_id}")
def update_operator(user_id: int, body: dict, db: Session = Depends(get_db)):
    """[Admin] Update an existing operator account."""
    operator = db.query(User).filter(User.id == user_id, User.role == "operator").first()
    if not operator:
        raise HTTPException(status_code=404, detail="Operator tidak ditemukan")

    if "nama" in body and body["nama"]:
        operator.nama = body["nama"]
    if "email" in body and body["email"]:
        existing = db.query(User).filter(User.email == body["email"], User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah digunakan akun lain")
        operator.email = body["email"]
    if "password" in body and body["password"]:
        operator.password_hash = body["password"]
    if "provinsi" in body:
        operator.provinsi = body["provinsi"]
    if "wilayah" in body:
        operator.wilayah = body["wilayah"]
    if "no_hp" in body:
        operator.no_hp = body["no_hp"]

    db.commit()
    db.refresh(operator)
    return {"message": "Operator berhasil diperbarui", "operator": serialize_user(operator)}


@app.delete("/api/operators/{user_id}")
def delete_operator(user_id: int, db: Session = Depends(get_db)):
    """[Admin] Delete an operator account."""
    operator = db.query(User).filter(User.id == user_id, User.role == "operator").first()
    if not operator:
        raise HTTPException(status_code=404, detail="Operator tidak ditemukan")

    db.delete(operator)
    db.commit()
    return {"message": "Operator berhasil dihapus"}

@app.post("/api/login/google")
def login_google(body: dict, db: Session = Depends(get_db)):
    email = body.get("email")
    nama = body.get("nama")
    google_id = body.get("google_id")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email Google tidak valid")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="Akun Google Anda belum terdaftar. Silakan daftar terlebih dahulu."
        )
        
    if not user.google_id:
        user.google_id = google_id
        db.commit()
        
    return {
        "id": user.id,
        "name": user.nama,
        "nama": user.nama,
        "email": user.email,
        "role": user.role,
        "provinsi": user.provinsi,
        "wilayah": user.wilayah,
        "no_hp": user.no_hp or "",
        "picture": getattr(user, "foto_url", None)
    }





# -------------------- ALERTS STREAM & ACTIONS --------------------

@app.get("/api/alerts/stream")
async def alert_stream():
    """SSE Endpoint for realtime alert streaming."""
    async def event_generator() -> AsyncGenerator[str, None]:
        q = asyncio.Queue()
        sse_clients.add(q)
        try:
            while True:
                alert = await q.get()
                yield f"data: {json.dumps(alert)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_clients.remove(q)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.patch("/api/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    x_user_role: Optional[str] = Header(None)
):
    """Mark an alert as resolved."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.is_resolved = True
    db.commit()
    
    # Reset notified state so future breaches trigger a new notification
    danger_key = f"{alert.sensor_id}_{alert.parameter}"
    active_danger_states.pop(danger_key, None)
    
    # Notify clients that this alert is resolved
    alert_dict = {
        "id": alert.id,
        "sensor_id": alert.sensor_id,
        "parameter": alert.parameter,
        "value": alert.value,
        "threshold_min": alert.threshold_min,
        "threshold_max": alert.threshold_max,
        "level": alert.level,
        "message": alert.message,
        "created_at": alert.created_at.isoformat(),
        "is_resolved": True,
        "event_type": "resolved"
    }
    push_alert_to_clients(alert_dict)
    
    return {"status": "success", "message": "Alert resolved"}


# -------------------- ROOT --------------------


@app.get("/")
def root():
    return {"message": "🌊 OceanSmart API is running", "docs": "/docs"}
