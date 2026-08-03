from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Enum, Boolean, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


# ──────────────────── ENUMS ────────────────────

class AlertLevel(str, enum.Enum):
    NORMAL = "normal"
    WASPADA = "waspada"
    BAHAYA = "bahaya"


class ConnectionStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"


class ConservationStatus(str, enum.Enum):
    LEAST_CONCERN = "Least Concern"
    NEAR_THREATENED = "Near Threatened"
    VULNERABLE = "Vulnerable"
    ENDANGERED = "Endangered"
    CRITICALLY_ENDANGERED = "Critically Endangered"
    DATA_DEFICIENT = "Data Deficient"


class ReportCategory(str, enum.Enum):
    IKAN_MATI_MASSAL = "ikan_mati_massal"
    PENCEMARAN = "pencemaran"
    BIOTA_LANGKA = "biota_langka"
    KERUSAKAN_KARANG = "kerusakan_karang"
    LAINNYA = "lainnya"


class VerificationStatus(str, enum.Enum):
    MENUNGGU_REVIEW = "menunggu_review"
    TERVERIFIKASI = "terverifikasi"
    DITOLAK = "ditolak"


class ZoneType(str, enum.Enum):
    INTI = "inti"
    PEMANFAATAN_TERBATAS = "pemanfaatan_terbatas"
    REHABILITASI = "rehabilitasi"
    PEMANFAATAN_UMUM = "pemanfaatan_umum"


# ──────────────────── MODELS ────────────────────

class Sensor(Base):
    """Sensor stations placed in the conservation area."""
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String(50), unique=True, nullable=False, index=True)
    nama_lokasi = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    kedalaman_m = Column(Float, default=0)
    zona = Column(String(50), default="pemanfaatan_umum")
    status_koneksi = Column(String(20), default="online")
    status_baterai = Column(Integer, default=100)
    created_at = Column(DateTime, server_default=func.now())

    readings = relationship("SensorReading", back_populates="sensor", lazy="dynamic")


class SensorReading(Base):
    """Individual sensor reading at a point in time."""
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String(50), ForeignKey("sensors.sensor_id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    ph = Column(Float)
    suhu_celsius = Column(Float)
    salinitas_ppt = Column(Float)
    do_mg_l = Column(Float)
    kekeruhan_ntu = Column(Float)
    health_index = Column(Float, default=None)

    sensor = relationship("Sensor", back_populates="readings")


class Alert(Base):
    """Early warning alerts generated when thresholds are breached."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String(50), ForeignKey("sensors.sensor_id"), nullable=False, index=True)
    parameter = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)
    threshold_min = Column(Float)
    threshold_max = Column(Float)
    level = Column(String(20), default="waspada")
    message = Column(Text)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, default=None)


class Biota(Base):
    """Marine species information."""
    __tablename__ = "biota"

    id = Column(Integer, primary_key=True, index=True)
    biota_id = Column(String(50), unique=True, nullable=False, index=True)
    nama_umum = Column(String(200), nullable=False)
    nama_ilmiah = Column(String(200))
    zona_kedalaman = Column(String(50))
    status_konservasi = Column(String(50))
    deskripsi = Column(Text)
    foto_url = Column(String(500))
    habitat = Column(String(200))
    created_at = Column(DateTime, server_default=func.now())


class ConservationZone(Base):
    """Conservation area zones with GeoJSON boundaries."""
    __tablename__ = "conservation_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    zone_type = Column(String(50), nullable=False)
    description = Column(Text)
    geojson = Column(JSON)
    color = Column(String(20), default="#023e8a")
    created_at = Column(DateTime, server_default=func.now())


class CitizenReport(Base):
    """Reports submitted by citizens/fishermen."""
    __tablename__ = "citizen_reports"

    id = Column(Integer, primary_key=True, index=True)
    laporan_id = Column(String(50), unique=True, nullable=False, index=True)
    pelapor = Column(String(200), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    kategori = Column(String(50), nullable=False)
    deskripsi = Column(Text)
    foto_url = Column(String(500))
    status_verifikasi = Column(String(50), default="menunggu_review")
    created_at = Column(DateTime, server_default=func.now())
