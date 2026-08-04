"""
OceanSmart Backend -- FastAPI Application
Marine Conservation Monitoring Platform
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.database import engine, get_db, Base
from app.models import Sensor, SensorReading, Alert, Biota, ConservationZone, CitizenReport, User
from app.seeder import seed_database, THRESHOLDS, calculate_health_index

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
    finally:
        db.close()
        
    # Start Realtime Data Generator
    from apscheduler.schedulers.background import BackgroundScheduler
    from app.seeder import SENSORS_DATA, generate_reading, check_thresholds_and_create_alert, update_realtime_ocean_cache
    
    def generate_realtime_data():
        db = next(get_db())
        try:
            # Sinkronisasi parameter laut real-time Jawa Barat (Pangandaran)
            update_realtime_ocean_cache()
            
            now = datetime.utcnow()
            for sensor_data in SENSORS_DATA:
                reading = generate_reading(now, sensor_data, 0)
                db.add(SensorReading(**reading))
                
                alert_data = check_thresholds_and_create_alert(reading)
                if alert_data:
                    alert_data["created_at"] = now
                    alert_data["is_resolved"] = False
                    db.add(Alert(**alert_data))
            db.commit()
            print(f"[Realtime] Data baru ditambahkan pada {now}")
        except Exception as e:
            print("Error generating realtime data:", e)
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
    x_user_wilayah: Optional[str] = Header(None)
):
    """Get overview statistics for the main dashboard."""
    sensor_q = db.query(Sensor)
    if x_user_role == "operator" and x_user_wilayah:
        sensor_q = sensor_q.filter(Sensor.wilayah == x_user_wilayah)

    sensor_count = sensor_q.count()
    online_count = sensor_q.filter(Sensor.status_koneksi == "online").count()
    biota_count = db.query(Biota).count()

    alert_q = db.query(Alert).filter(Alert.is_resolved == False)
    if x_user_role == "operator" and x_user_wilayah:
        alert_q = alert_q.join(Sensor, Alert.sensor_id == Sensor.sensor_id).filter(Sensor.wilayah == x_user_wilayah)
    active_alerts = alert_q.count()

    # Average health index from latest readings
    sensor_ids = [s.sensor_id for s in sensor_q.all()] if (x_user_role == "operator" and x_user_wilayah) else None

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
    }



# -------------------- SENSORS --------------------

@app.get("/api/sensors")
def get_sensors(
    db: Session = Depends(get_db),
    x_user_role: Optional[str] = Header(None),
    x_user_wilayah: Optional[str] = Header(None)
):
    """Get all sensors with their latest readings."""
    query = db.query(Sensor)
    if x_user_role == "operator" and x_user_wilayah:
        query = query.filter(Sensor.wilayah == x_user_wilayah)
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
    for field in ["nama_lokasi", "lat", "lng", "kedalaman_m", "zona", "status_koneksi", "status_baterai"]:
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
    x_user_wilayah: Optional[str] = Header(None)
):
    """Get recent alerts."""
    query = db.query(Alert)
    if x_user_role == "operator" and x_user_wilayah:
        query = query.join(Sensor, Alert.sensor_id == Sensor.sensor_id).filter(Sensor.wilayah == x_user_wilayah)
        
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

@app.post("/api/chatbot")
async def chatbot_message(
    body: dict,
    db: Session = Depends(get_db),
):
    """Simple chatbot endpoint that returns contextual info.
    For full Gemini integration, configure GEMINI_API_KEY in .env.
    """
    message = body.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    # Build context from latest data
    sensors = db.query(Sensor).all()
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).all()

    context_parts = ["Kondisi terkini kawasan konservasi OceanSmart:"]
    for s in sensors[:5]:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.sensor_id == s.sensor_id)
            .order_by(desc(SensorReading.timestamp))
            .first()
        )
        if latest:
            context_parts.append(
                f"- {s.nama_lokasi}: pH={latest.ph}, Suhu={latest.suhu_celsius}°C, "
                f"DO={latest.do_mg_l}mg/L, Kesehatan={latest.health_index}/100"
            )

    if active_alerts:
        context_parts.append(f"\n⚠️ Ada {len(active_alerts)} peringatan aktif:")
        for a in active_alerts[:3]:
            context_parts.append(f"- {a.sensor_id}: {a.message}")

    context = "\n".join(context_parts)

    # Try Gemini API if key is available
    from app.config import GEMINI_API_KEY, MISTRAL_API_KEY
    import httpx
    
    if GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                    json={
                        "system_instruction": {
                            "parts": [{"text": "Kamu adalah OceanBot, asisten AI cerdas untuk platform OceanSmart. Tugasmu HANYA menjawab seputar laut, konservasi, kualitas air, biota laut, dan data sensor. Jika pengguna bertanya di luar topik kelautan atau platform ini, tolak dengan sangat sopan. Jawablah secara singkat, ramah, dan profesional."}]
                        },
                        "contents": [{"parts": [{"text": f"Konteks Data Sensor Saat Ini:\n{context}\n\nPertanyaan Pengguna: {message}"}]}],
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if text:
                        return {"reply": text, "context_used": True}
        except Exception:
            pass

    # Fallback to Mistral API if Gemini fails (e.g. limit reached, error)
    if MISTRAL_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {MISTRAL_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "mistral-small-latest",
                        "messages": [
                            {"role": "system", "content": "Kamu adalah OceanBot, asisten AI cerdas untuk platform OceanSmart. Tugasmu HANYA menjawab seputar laut, konservasi, kualitas air, biota laut, dan data sensor. Jika pengguna bertanya di luar topik kelautan atau platform ini, tolak dengan sangat sopan. Jawablah secara singkat, ramah, dan profesional."},
                            {"role": "user", "content": f"Konteks Data Sensor Saat Ini:\n{context}\n\nPertanyaan Pengguna: {message}"}
                        ]
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        return {"reply": text, "context_used": True}
        except Exception:
            pass

    # Fallback: simple keyword-based response
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["ph", "kualitas", "air", "parameter", "suhu", "salinitas", "do"]):
        reply = f"📊 Berikut kondisi kualitas air terkini:\n{context}\n\nSemua parameter dipantau setiap 15 menit melalui sensor IoT."
    elif any(w in msg_lower for w in ["peringatan", "alert", "bahaya", "warning", "bahaya"]):
        reply = f"⚠️ Status peringatan: {len(active_alerts)} peringatan aktif saat ini.\n{context}"
    elif any(w in msg_lower for w in ["biota", "ikan", "hewan", "spesies", "terumbu"]):
        biota_count = db.query(Biota).count()
        reply = f"🐠 Database OceanSmart mencatat {biota_count} spesies biota laut dari berbagai zona kedalaman. Gunakan menu 'Biota Laut' untuk melihat model 3D dan detail lengkapnya!"
    elif any(w in msg_lower for w in ["halo", "hai", "hello", "hi", "pagi", "siang", "malam"]):
        reply = "🌊 Halo! Saya OceanBot. Saat ini AI saya sedang mengalami gangguan koneksi, namun saya masih bisa memberikan laporan singkat tentang:\n• Kualitas Air\n• Status Peringatan\n• Informasi Biota\n\nApa yang ingin Anda ketahui?"
    elif any(w in msg_lower for w in ["ocean health index", "kesehatan", "index"]):
        reply = "💙 Ocean Health Index (Indeks Kesehatan Laut) adalah nilai dari 0-100 yang mengukur seberapa sehat kondisi perairan kita berdasarkan gabungan data Suhu, pH, DO, Salinitas, dan Kekeruhan."
    else:
        reply = "Maaf, koneksi ke AI utama sedang sibuk atau pertanyaan Anda di luar kemampuan mode offline saya. Silakan tanyakan hal-hal seperti 'Bagaimana kualitas air?' atau 'Ada peringatan?'."

    return {"reply": reply, "context_used": False}


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
    email = body.get("email")
    password = body.get("password")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email dan password wajib diisi")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email tidak terdaftar. Silakan daftar terlebih dahulu.")
        
    if user.password_hash != password:
        raise HTTPException(status_code=401, detail="Kata sandi salah")
        
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


# -------------------- ROOT --------------------


@app.get("/")
def root():
    return {"message": "🌊 OceanSmart API is running", "docs": "/docs"}
