from pydantic import BaseModel
from typing import Optional, List
import datetime


# ── Stop schemas ──────────────────────────────────────────────
class StopCreate(BaseModel):
    stop_number: int
    name: str
    latitude: float
    longitude: float
    eta_minutes: float = 0.0


class StopResponse(BaseModel):
    id: int
    stop_number: int
    name: str
    latitude: float
    longitude: float
    eta_minutes: float
    average_temperature: Optional[float] = None
    min_temperature: Optional[float] = None
    max_temperature: Optional[float] = None
    heat_index_celsius: Optional[float] = None
    apparent_temperature_celsius: Optional[float] = None
    wet_bulb_temperature_celsius: Optional[float] = None
    relative_humidity_percent: Optional[float] = None
    precipitation_mm: Optional[float] = None
    cloud_cover_octas: Optional[float] = None
    aqi: Optional[float] = None
    no2: Optional[float] = None
    o3: Optional[float] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    so2: Optional[float] = None
    solar_irradiance: Optional[float] = None
    methane_ppb: Optional[float] = None
    co2_ppm: Optional[float] = None
    elevation: Optional[float] = None
    risk_score: Optional[float] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


# ── Shipment schemas ──────────────────────────────────────────
class ShipmentCreate(BaseModel):
    medicine_name: str
    cargo_type: str
    temp_min_required: float
    temp_max_required: float
    start_time: datetime.datetime
    delivery_date: datetime.date
    vehicle_type: str
    refrigeration_type: str
    cargo_load_kg: float
    origin_name: str
    origin_lat: float
    origin_lon: float
    destination_name: str
    destination_lat: float
    destination_lon: float
    stops: List[StopCreate] = []


class ShipmentResponse(BaseModel):
    id: int
    shipment_id: str
    medicine_name: str
    cargo_type: str
    temp_min_required: float
    temp_max_required: float
    start_time: datetime.datetime
    delivery_date: datetime.date
    vehicle_type: str
    refrigeration_type: str
    cargo_load_kg: float
    origin_name: str
    origin_lat: float
    origin_lon: float
    destination_name: str
    destination_lat: float
    destination_lon: float
    distance_km: float
    duration_minutes: float
    carbon_emissions_co2e: float
    risk_score: float
    compliance_percentage: float
    worst_wet_bulb: float
    worst_heat_index: float
    exposure_score: float
    status: str
    created_at: datetime.datetime
    stops: List[StopResponse] = []

    class Config:
        from_attributes = True


# ── Settings schemas ──────────────────────────────────────────
class SettingsUpdate(BaseModel):
    fortyguard_api_key: Optional[str] = None
    weight_temperature: Optional[float] = None
    weight_heat: Optional[float] = None
    weight_compliance: Optional[float] = None
    weight_route: Optional[float] = None
    weight_worker: Optional[float] = None
    weight_carbon: Optional[float] = None


class SettingsResponse(BaseModel):
    fortyguard_api_key_configured: bool
    weight_temperature: float
    weight_heat: float
    weight_compliance: float
    weight_route: float
    weight_worker: float
    weight_carbon: float
