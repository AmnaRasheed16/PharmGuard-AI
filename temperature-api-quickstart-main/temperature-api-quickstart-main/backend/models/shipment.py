from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
import datetime
from backend.database import Base

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(String, unique=True, index=True)
    medicine_name = Column(String)
    cargo_type = Column(String)
    temp_min_required = Column(Float)
    temp_max_required = Column(Float)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    delivery_date = Column(Date)
    vehicle_type = Column(String)
    refrigeration_type = Column(String)
    cargo_load_kg = Column(Float, default=100.0)
    
    # Locations
    origin_name = Column(String)
    origin_lat = Column(Float)
    origin_lon = Column(Float)
    destination_name = Column(String)
    destination_lat = Column(Float)
    destination_lon = Column(Float)
    
    # Calculated route details
    distance_km = Column(Float)
    duration_minutes = Column(Float)
    carbon_emissions_co2e = Column(Float)
    risk_score = Column(Float)
    compliance_percentage = Column(Float)
    worst_wet_bulb = Column(Float)
    worst_heat_index = Column(Float)
    exposure_score = Column(Float)
    
    status = Column(String)  # SAFE, WARNING, AT_RISK, CRITICAL, DELIVERED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    stops = relationship("Stop", back_populates="shipment", cascade="all, delete-orphan")

class Stop(Base):
    __tablename__ = "stops"

    id = Column(Integer, primary_key=True, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id"))
    stop_number = Column(Integer)
    name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    eta_minutes = Column(Float)

    # FortyGuard Environmental Parameters
    average_temperature = Column(Float)
    min_temperature = Column(Float)
    max_temperature = Column(Float)
    heat_index_celsius = Column(Float)
    apparent_temperature_celsius = Column(Float)
    wet_bulb_temperature_celsius = Column(Float)
    relative_humidity_percent = Column(Float)
    precipitation_mm = Column(Float)
    cloud_cover_octas = Column(Float)
    aqi = Column(Float)
    no2 = Column(Float)
    o3 = Column(Float)
    pm25 = Column(Float)
    pm10 = Column(Float)
    so2 = Column(Float)
    solar_irradiance = Column(Float)
    methane_ppb = Column(Float)
    co2_ppm = Column(Float)
    elevation = Column(Float)

    # Risk and analysis
    risk_score = Column(Float)
    status = Column(String)  # SAFE, WARNING, AT_RISK, CRITICAL

    shipment = relationship("Shipment", back_populates="stops")
