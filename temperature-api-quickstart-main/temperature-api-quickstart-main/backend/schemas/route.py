from pydantic import BaseModel
from typing import Optional, List, Any
import datetime


class StopInput(BaseModel):
    name: str
    latitude: float
    longitude: float


class RoutePlanRequest(BaseModel):
    origin_name: str
    origin_lat: float
    origin_lon: float
    destination_name: str
    destination_lat: float
    destination_lon: float
    stops: List[StopInput] = []
    delivery_date: datetime.date
    start_time: datetime.datetime
    temp_min_required: float = 2.0
    temp_max_required: float = 8.0
    vehicle_type: str = "Diesel Light Van"
    refrigeration_type: str = "Active Refrigeration (Diesel)"
    cargo_load_kg: float = 100.0
    medicine_name: str = "Vaccines"
    cargo_type: str = "Vaccines (2-8°C)"


class StopAnalysisResponse(BaseModel):
    stop_number: int
    name: str
    latitude: float
    longitude: float
    eta_minutes: float
    risk_score: float
    status: str
    # FortyGuard fields
    average_temperature: float
    min_temperature: float
    max_temperature: float
    heat_index_celsius: float
    apparent_temperature_celsius: float
    wet_bulb_temperature_celsius: float
    relative_humidity_percent: float
    precipitation_mm: float
    cloud_cover_octas: float
    aqi: float
    no2: float
    o3: float
    pm25: float
    pm10: float
    so2: float
    solar_irradiance: float
    methane_ppb: float
    co2_ppm: float
    elevation: float


class RouteDetail(BaseModel):
    route_id: str
    route_name: str
    geometry: Any  # GeoJSON LineString dict
    distance_km: float
    duration_minutes: float
    carbon_emissions_co2e: float
    risk_score: float
    compliance_percentage: float
    worst_wet_bulb: float
    worst_heat_index: float
    exposure_score: float
    stops: List[StopAnalysisResponse]
    temp_timeline: List[Any] = []


class RoutePlanResponse(BaseModel):
    routes: List[RouteDetail]
    ai_recommendation: Any
    fortyguard_status: str = "LIVE"
