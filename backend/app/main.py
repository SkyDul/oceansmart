"""
OceanSmart Backend -- FastAPI Application
Marine Conservation Monitoring Platform
"""
from datetime import datetime, timedelta
from typing import Optional, AsyncGenerator

from fastapi import FastAPI, Depends, HTTPException, Query, Header
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

def push_alert_to_clients(alert_dict):
    if not main_loop: return
    for client in list(sse_clients):
        asyncio.run_coroutine_threadsafe(client.put(alert_dict), main_loop)

import httpx

from app.database import engine, get_db, Base
from app.models import Sensor, SensorReading, Alert, Biota, ConservationZone, CitizenReport, User
from app.seeder import seed_database, THRESHOLDS, calculate_health_index, upsert_new_biota

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
    
    # Auto-migration: check if no_hp column exists, if not add it
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN no_hp VARCHAR(50) NULL"))
            print("  [DB] Auto-migration: Added 'no_hp' column to 'users' table")
    except Exception as e:
        pass # Column already exists or table doesn't exist yet
        
    db = next(get_db())
    try:
        seed_database(db)
        upsert_new_biota(db)
    finally:
        db.close()
        
    # Start Realtime Data Generator
    from apscheduler.schedulers.background import BackgroundScheduler
    from app.seeder import generate_reading, check_thresholds_and_create_alert, update_realtime_ocean_cache
    
    def generate_realtime_data():
        db = next(get_db())
        try:
            # Sinkronisasi parameter laut real-time Jawa Barat (Pangandaran)
            update_realtime_ocean_cache()
            
            now = datetime.utcnow()
            # Fetch actual sensors from database
            db_sensors = db.query(Sensor).all()
            for s in db_sensors:
                # Skip sensor jika offline/maintenance
                if s.status_koneksi != "online":
                    continue
                
                # Check battery
                if s.status_baterai <= 0:
                    s.status_koneksi = "offline"
                    db.commit()
                    continue
                
                # Constant nominal battery usage
                s.status_baterai = max(0, s.status_baterai - 0.1)
                
                # Construct dict matching seeder config
                sensor_dict = {
                    "sensor_id": s.sensor_id,
                    "zona": s.zona,
                    "kedalaman_m": s.kedalaman_m
                }
                
                # Generate reading normally without global anomalies
                reading = generate_reading(now, sensor_dict, 0, anomaly_type="normal")
                db.add(SensorReading(**reading))
                
                alert_data = check_thresholds_and_create_alert(reading)
                if alert_data:
                    alert_data["created_at"] = now
                    alert_data["is_resolved"] = False
                    new_alert = Alert(**alert_data)
                    db.add(new_alert)
                    db.flush()
                    
                    # Push to SSE clients
                    alert_dict = {
                        "id": new_alert.id,
                        "sensor_id": new_alert.sensor_id,
                        "parameter": new_alert.parameter,
                        "value": new_alert.value,
                        "threshold_min": new_alert.threshold_min,
                        "threshold_max": new_alert.threshold_max,
                        "level": new_alert.level,
                        "message": new_alert.message,
                        "created_at": new_alert.created_at.isoformat(),
                        "is_resolved": new_alert.is_resolved
                    }
                    push_alert_to_clients(alert_dict)
                    
            db.commit()
            print(f"[Realtime] Data baru ditambahkan pada {now}")
        except Exception as e:
            print("Error generating realtime data:", e)
            db.rollback()
        finally:
            db.close()
            
    scheduler = BackgroundScheduler()
    scheduler.add_job(generate_realtime_data, 'interval', seconds=10)
    scheduler.start()


# -------------------- DASHBOARD / OVERVIEW --------------------

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

@app.get("/api/sensors")
def get_sensors(
    db: Session = Depends(get_db),
    x_user_role: Optional[str] = Header(None),
    x_user_wilayah: Optional[str] = Header(None),
    x_user_provinsi: Optional[str] = Header(None)
):
    """Get all sensors with their latest readings."""
    query = db.query(Sensor)
    # Operator: filter by assigned wilayah
    if x_user_role == "operator" and x_user_wilayah:
        query = query.filter(Sensor.wilayah == x_user_wilayah)
    # Admin/pengguna: filter by provinsi if explicitly requested
    elif x_user_role in ("admin", "pengguna") and x_user_provinsi:
        query = query.filter(Sensor.provinsi == x_user_provinsi)
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
    """[Operator] Tambah sensor baru."""
    import uuid
    sensor_id = body.get("sensor_id") or f"SNS-{uuid.uuid4().hex[:6].upper()}"
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
        status_baterai=int(body.get("status_baterai", 100)),
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    return {"message": "Sensor berhasil ditambahkan", "sensor_id": sensor.sensor_id}


@app.put("/api/sensors/{sensor_id}/update")
def update_sensor(sensor_id: str, body: dict, db: Session = Depends(get_db)):
    """[Operator] Update sensor."""
    sensor = db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor tidak ditemukan")
    for field in ["nama_lokasi", "lat", "lng", "kedalaman_m", "zona", "status_koneksi", "status_baterai", "provinsi", "wilayah"]:
        if field in body:
            setattr(sensor, field, body[field])
    db.commit()
    return {"message": "Sensor berhasil diperbarui"}


@app.delete("/api/sensors/{sensor_id}/delete")
def delete_sensor(sensor_id: str, db: Session = Depends(get_db)):
    """[Operator] Hapus sensor beserta semua readingnya."""
    sensor = db.query(Sensor).filter(Sensor.sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor tidak ditemukan")
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

Kemampuan utamamu:
1. Membaca & menganalisis data sensor real-time (pH, suhu, salinitas, DO, kekeruhan, health index)
2. Menjelaskan peringatan aktif — penyebab, tingkat risiko, dan dampak ekologisnya
3. Memberikan rekomendasi penanganan konkret berdasarkan data nyata
4. Menjawab pertanyaan tentang biota laut, konservasi, dan kualitas perairan
5. Membantu operator/admin memahami kondisi sensor tertentu berdasarkan ID

Panduan menjawab:
- SELALU gunakan data konteks yang diberikan. Jangan mengarang data.
- Jika sensor tidak ditemukan di konteks, sampaikan dengan jelas bahwa sensor tersebut tidak ada atau tidak terdeteksi di sistem.
- Untuk peringatan: jelaskan nilai yang terdeteksi, batas aman, risiko ekologis, dan langkah penanganan.
- Batas aman parameter: pH (7.5–8.5), Suhu (26–30°C), Salinitas (30–35 ppt), DO (≥5 mg/L), Kekeruhan (0–10 NTU).
- JANGAN gunakan tanda ** (bold markdown) dalam jawaban. Tulis teks biasa saja.
- Gunakan emoji secukupnya agar mudah dibaca.
- Jawab singkat, padat, dan profesional dalam Bahasa Indonesia.
- Hanya tolak pertanyaan yang benar-benar tidak berhubungan dengan kelautan, sensor, atau platform ini."""


def clean_reply(text: str) -> str:
    """Remove markdown bold markers from reply."""
    return text.replace("**", "")


def build_sensor_context(message: str, sensors: list, active_alerts: list, db) -> str:
    """Builds a rich, relevant context string based on what the user is asking."""
    import re
    msg_up = message.upper()

    # --- 1. Detect specific sensor ID mention (e.g. OS-SENSOR-002) ---
    sensor_id_pattern = re.findall(r'OS[-\s]?SENSOR[-\s]?\d+', msg_up)
    # Normalize: remove spaces
    sensor_id_pattern = [re.sub(r'\s', '', s) for s in sensor_id_pattern]

    focused_sensors = []
    if sensor_id_pattern:
        for sid in sensor_id_pattern:
            match = next((s for s in sensors if s.sensor_id.upper().replace(' ', '') == sid), None)
            if match:
                focused_sensors.append(match)

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
    context = build_sensor_context(message, sensors, active_alerts, db)

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
    sensor_id_match = re.findall(r'os[-\s]?sensor[-\s]?(\d+)', msg_lower)
    if sensor_id_match:
        num = sensor_id_match[0].zfill(3)
        sid = f"OS-SENSOR-{num}"
        sensor = next((s for s in sensors if s.sensor_id == sid), None)
        if not sensor:
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

    if any(w in msg_lower for w in ["biota", "ikan", "hewan", "spesies", "terumbu", "karang"]):
        biota_count = db.query(Biota).count()
        return {"reply": f"🐠 Database OceanSmart mencatat **{biota_count} spesies** biota laut dari berbagai zona kedalaman.\n\nGunakan menu **Biota Laut** untuk melihat model 3D interaktif dan informasi lengkap tiap spesies!", "context_used": True}

    if any(w in msg_lower for w in ["health", "index", "kesehatan laut", "ocean health"]):
        return {"reply": "💙 **Ocean Health Index (OHI)** adalah nilai 0–100 yang menggambarkan kesehatan ekosistem perairan.\n\n**Rumus:** rata-rata skor dari pH, Suhu, Salinitas, DO, dan Kekeruhan.\n\n🟢 85–100: Sangat Baik\n🟡 70–84: Baik\n🟠 50–69: Sedang\n🔴 <50: Perlu Perhatian", "context_used": False}

    if any(w in msg_lower for w in ["halo", "hai", "hello", "hi", "pagi", "siang", "malam", "selamat"]):
        jumlah_aktif = len(active_alerts)
        status_msg = f"⚠️ Ada **{jumlah_aktif} peringatan aktif** yang perlu ditangani." if jumlah_aktif else "✅ Semua sensor dalam kondisi aman."
        return {"reply": f"🌊 Halo! Saya **OceanBot**, asisten AI OceanSmart.\n\n{status_msg}\n\nSaya bisa membantu:\n• Cek kondisi sensor (contoh: *'status OS-SENSOR-002'*)\n• Analisis peringatan aktif\n• Informasi biota & kualitas air\n\nAda yang ingin ditanyakan?", "context_used": True}

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
    if "password" in body and body["password"]:
        user.password_hash = body["password"]
    
    db.commit()
    db.refresh(user)
    return {
        "message": "Profil berhasil diperbarui", 
        "user": {
            "id": user.id,
            "name": user.nama,
            "email": user.email,
            "role": user.role,
            "provinsi": user.provinsi,
            "wilayah": user.wilayah,
            "no_hp": user.no_hp
        }
    }


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

@app.get("/api/operators")
def get_operators(db: Session = Depends(get_db)):
    # Returns all users with role 'operator'
    operators = db.query(User).filter(User.role == "operator").all()
    return operators

@app.post("/api/operators")
def create_operator(body: dict, db: Session = Depends(get_db)):
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
        wilayah=body.get("wilayah")
    )
    db.add(new_operator)
    db.commit()
    db.refresh(new_operator)
    return {"message": "Akun operator berhasil dibuat", "operator": new_operator}

@app.delete("/api/operators/{user_id}")
def delete_operator(user_id: int, db: Session = Depends(get_db)):
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
        "name": user.nama,
        "email": user.email,
        "role": user.role,
        "provinsi": user.provinsi,
        "wilayah": user.wilayah
    }



# -------------------- CHATBOT --------------------

class ChatRequest(BaseModel):
    message: str
    model: str = "gemini"
    role: Optional[str] = "pengguna"
    wilayah: Optional[str] = None
    provinsi: Optional[str] = None

@app.post("/api/chatbot")
async def chat_with_bot(req: ChatRequest, db: Session = Depends(get_db)):
    """Chatbot Endpoint using Gemini/Mistral and Realtime Sensor Context"""
    # 1. Fetch relevant sensors
    sensor_q = db.query(Sensor)
    if req.role == "operator" and req.wilayah:
        sensor_q = sensor_q.filter(Sensor.wilayah == req.wilayah)
    sensors = sensor_q.all()
    
    # 2. Format sensor context
    context = "Tidak ada data sensor."
    if sensors:
        lines = []
        for s in sensors:
            status = "Online" if s.status_koneksi == "online" else "Offline"
            lines.append(f"- Sensor {s.nama_lokasi} (Zona {s.zona}): Status {status}, Baterai {s.status_baterai}%")
            # Get latest reading
            latest = db.query(SensorReading).filter(SensorReading.sensor_id == s.sensor_id).order_by(desc(SensorReading.timestamp)).first()
            if latest and status == "Online":
                lines.append(f"  Suhu: {latest.suhu_air_c}C, pH: {latest.ph_air}, Salinitas: {latest.salinitas_ppt}ppt, Oksigen: {latest.oksigen_terlarut_mgl}mg/L, Kekeruhan: {latest.kekeruhan_ntu}NTU")
        context = "\n".join(lines)
        
    system_prompt = (
        "Kamu adalah OceanBot, asisten virtual Customer Service untuk sistem monitoring kelautan OceanSmart. "
        "Gunakan bahasa Indonesia yang formal, sopan, namun ramah. "
        f"Berikut adalah data sensor real-time saat ini:\n{context}\n\n"
        "Jawab pertanyaan pengguna berdasarkan data sensor di atas jika relevan. Jika pengguna bertanya hal di luar data ini, jawab sebisa kamu sebagai asisten kelautan."
    )
    
    try:
        if req.model == "gemini":
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                return {"reply": "Maaf, GEMINI_API_KEY belum dikonfigurasi pada server."}
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"
            payload = {
                "system_instruction": {
                    "parts": [{"text": system_prompt}]
                },
                "contents": [
                    {"parts": [{"text": req.message}]}
                ]
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, timeout=30.0)
                data = res.json()
                if res.status_code != 200:
                    return {"reply": f"Error dari Gemini API: {data.get('error', {}).get('message', str(data))}"}
                reply = data["candidates"][0]["content"]["parts"][0]["text"]
                return {"reply": reply}
                
        elif req.model == "mistral":
            api_key = os.getenv("MISTRAL_API_KEY")
            if not api_key:
                return {"reply": "Maaf, MISTRAL_API_KEY belum dikonfigurasi pada server."}
                
            url = "https://api.mistral.ai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "mistral-large-latest",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": req.message}
                ]
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, headers=headers, timeout=30.0)
                data = res.json()
                if res.status_code != 200:
                    return {"reply": f"Error dari Mistral API: {data.get('message', str(data))}"}
                reply = data["choices"][0]["message"]["content"]
                return {"reply": reply}
                
        else:
            return {"reply": "Model tidak didukung. Pilih 'gemini' atau 'mistral'."}
            
    except Exception as e:
        return {"reply": f"Terjadi kesalahan saat memproses permintaan: {str(e)}"}


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
