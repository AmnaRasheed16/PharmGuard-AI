from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import uuid
import datetime

from backend.database import get_db
from backend.models import Shipment, Stop
from backend.schemas.shipment import ShipmentCreate, ShipmentResponse

router = APIRouter(prefix="/shipments", tags=["Shipment Management"])

@router.get("", response_model=List[ShipmentResponse])
def get_all_shipments(db: Session = Depends(get_db)):
    """Fetch all saved shipments from the database."""
    shipments = db.query(Shipment).order_by(Shipment.created_at.desc()).all()
    return shipments

@router.post("", response_model=ShipmentResponse)
def create_shipment(payload: ShipmentCreate, db: Session = Depends(get_db)):
    """Save a planned shipment route along with all calculated metrics and environmental readings."""
    # Generate unique shipment ID if not provided
    shipment_uuid = f"PG-{uuid.uuid4().hex[:6].upper()}"
    
    # Calculate some summary stats from the stops payload
    stops_payload = payload.stops
    if not stops_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shipment must have at least one stop."
        )
    
    # We expect the payload to have pre-calculated/supplied metrics (or we recalculate/mock them).
    # Wait, the frontend can plan first (via /routes/plan) and then POST the selected route detail here.
    # To support this, let's allow creating a shipment from a pre-calculated route.
    # Let's adjust ShipmentCreate to accept calculated fields if provided, or calculate them dynamically.
    # Actually, we can make ShipmentCreate accept additional computed fields or we can pass a schema.
    # Let's write the DB inserts.
    
    # We will read fields or calculate defaults. Let's make sure it handles both.
    db_shipment = Shipment(
        shipment_id=shipment_uuid,
        medicine_name=payload.medicine_name,
        cargo_type=payload.cargo_type,
        temp_min_required=payload.temp_min_required,
        temp_max_required=payload.temp_max_required,
        start_time=payload.start_time,
        delivery_date=payload.delivery_date,
        vehicle_type=payload.vehicle_type,
        refrigeration_type=payload.refrigeration_type,
        cargo_load_kg=payload.cargo_load_kg,
        origin_name=payload.origin_name,
        origin_lat=payload.origin_lat,
        origin_lon=payload.origin_lon,
        destination_name=payload.destination_name,
        destination_lat=payload.destination_lat,
        destination_lon=payload.destination_lon,
        
        # Default placeholder values that will be populated by frontend request body or calculated
        distance_km=0.0,
        duration_minutes=0.0,
        carbon_emissions_co2e=0.0,
        risk_score=0.0,
        compliance_percentage=100.0,
        worst_wet_bulb=20.0,
        worst_heat_index=20.0,
        exposure_score=0.0,
        status="SAFE"
    )
    
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)

    # Add stops
    for idx, stop_in in enumerate(payload.stops):
        db_stop = Stop(
            shipment_id=db_shipment.id,
            stop_number=stop_in.stop_number,
            name=stop_in.name,
            latitude=stop_in.latitude,
            longitude=stop_in.longitude,
            eta_minutes=stop_in.eta_minutes,
            
            # Init empty environmental parameters (to be updated)
            average_temperature=25.0,
            min_temperature=23.0,
            max_temperature=27.0,
            heat_index_celsius=25.0,
            apparent_temperature_celsius=25.0,
            wet_bulb_temperature_celsius=20.0,
            relative_humidity_percent=50.0,
            precipitation_mm=0.0,
            cloud_cover_octas=0.0,
            aqi=50.0,
            no2=10.0,
            o3=30.0,
            pm25=12.0,
            pm10=20.0,
            so2=2.0,
            solar_irradiance=800.0,
            methane_ppb=1800.0,
            co2_ppm=415.0,
            elevation=340.0,
            risk_score=0.0,
            status="SAFE"
        )
        db.add(db_stop)
    
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

# /save-planned accepts raw JSON dict directly — no separate Pydantic schema needed.

@router.post("/save-planned", response_model=ShipmentResponse)
def save_planned_shipment(payload: dict, db: Session = Depends(get_db)):
    """
    Save a planned route from the frontend.
    Accepts the exact JSON structure of a RouteDetail returned from /routes/plan,
    along with shipment metadata, and saves it.
    """
    # Generate unique shipment ID
    shipment_uuid = f"PG-{uuid.uuid4().hex[:6].upper()}"
    
    meta = payload.get("metadata", {})
    route = payload.get("route", {})
    
    # Parse delivery date
    del_date = meta.get("delivery_date")
    if isinstance(del_date, str):
        del_date = datetime.datetime.strptime(del_date, "%Y-%m-%d").date()
    else:
        del_date = datetime.date.today()
        
    start_t = meta.get("start_time")
    if isinstance(start_t, str):
        # handle ISO string or HH:MM
        if "T" in start_t:
            start_t = datetime.datetime.fromisoformat(start_t.replace("Z", ""))
        else:
            dt_now = datetime.datetime.now()
            start_t = datetime.datetime.strptime(f"{dt_now.strftime('%Y-%m-%d')} {start_t}", "%Y-%m-%d %H:%M")
    else:
        start_t = datetime.datetime.utcnow()

    db_shipment = Shipment(
        shipment_id=shipment_uuid,
        medicine_name=meta.get("medicine_name", "Vaccines"),
        cargo_type=meta.get("cargo_type", "Vaccines (2-8°C)"),
        temp_min_required=float(meta.get("temp_min_required", 2.0)),
        temp_max_required=float(meta.get("temp_max_required", 8.0)),
        start_time=start_t,
        delivery_date=del_date,
        vehicle_type=meta.get("vehicle_type", "Diesel Light Van"),
        refrigeration_type=meta.get("refrigeration_type", "Active Refrigeration (Diesel)"),
        cargo_load_kg=float(meta.get("cargo_load_kg", 100.0)),
        
        origin_name=meta.get("origin_name", "Phoenix Sky Harbor Airport"),
        origin_lat=float(meta.get("origin_lat", 33.4348)),
        origin_lon=float(meta.get("origin_lon", -112.0080)),
        destination_name=meta.get("destination_name", "Mayo Clinic, Scottsdale"),
        destination_lat=float(meta.get("destination_lat", 33.6429)),
        destination_lon=float(meta.get("destination_lon", -111.8906)),
        
        # Calculations from route
        distance_km=float(route.get("distance_km", 0.0)),
        duration_minutes=float(route.get("duration_minutes", 0.0)),
        carbon_emissions_co2e=float(route.get("carbon_emissions_co2e", 0.0)),
        risk_score=float(route.get("risk_score", 0.0)),
        compliance_percentage=float(route.get("compliance_percentage", 100.0)),
        worst_wet_bulb=float(route.get("worst_wet_bulb", 20.0)),
        worst_heat_index=float(route.get("worst_heat_index", 20.0)),
        exposure_score=float(route.get("exposure_score", 0.0)),
        status=route.get("status", "SAFE")
    )
    
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)

    # Save stops with all FortyGuard values
    for stop_in in route.get("stops", []):
        db_stop = Stop(
            shipment_id=db_shipment.id,
            stop_number=int(stop_in.get("stop_number", 0)),
            name=stop_in.get("name", ""),
            latitude=float(stop_in.get("latitude", 0.0)),
            longitude=float(stop_in.get("longitude", 0.0)),
            eta_minutes=float(stop_in.get("eta_minutes", 0.0)),
            
            # FortyGuard fields
            average_temperature=float(stop_in.get("average_temperature", 25.0)),
            min_temperature=float(stop_in.get("min_temperature", 23.0)),
            max_temperature=float(stop_in.get("max_temperature", 27.0)),
            heat_index_celsius=float(stop_in.get("heat_index_celsius", 25.0)),
            apparent_temperature_celsius=float(stop_in.get("apparent_temperature_celsius", 25.0)),
            wet_bulb_temperature_celsius=float(stop_in.get("wet_bulb_temperature_celsius", 20.0)),
            relative_humidity_percent=float(stop_in.get("relative_humidity_percent", 50.0)),
            precipitation_mm=float(stop_in.get("precipitation_mm", 0.0)),
            cloud_cover_octas=float(stop_in.get("cloud_cover_octas", 0.0)),
            aqi=float(stop_in.get("aqi", 50.0)),
            no2=float(stop_in.get("no2", 10.0)),
            o3=float(stop_in.get("o3", 30.0)),
            pm25=float(stop_in.get("pm25", 12.0)),
            pm10=float(stop_in.get("pm10", 20.0)),
            so2=float(stop_in.get("so2", 2.0)),
            solar_irradiance=float(stop_in.get("solar_irradiance", 800.0)),
            methane_ppb=float(stop_in.get("methane_ppb", 1800.0)),
            co2_ppm=float(stop_in.get("co2_ppm", 415.0)),
            elevation=float(stop_in.get("elevation", 340.0)),
            
            risk_score=float(stop_in.get("risk_score", 0.0)),
            status=stop_in.get("status", "SAFE")
        )
        db.add(db_stop)
        
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment_by_id(shipment_id: str, db: Session = Depends(get_db)):
    """Fetch details of a single shipment by its business shipment_id (e.g. PG-A2B3D4)."""
    shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment {shipment_id} not found."
        )
    return shipment

@router.delete("/{shipment_id}")
def delete_shipment(shipment_id: str, db: Session = Depends(get_db)):
    """Delete a shipment from the database."""
    shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment {shipment_id} not found."
        )
    db.delete(shipment)
    db.commit()
    return {"status": "success", "message": f"Shipment {shipment_id} deleted."}

@router.post("/{shipment_id}/status")
def update_shipment_status(shipment_id: str, payload: dict, db: Session = Depends(get_db)):
    """Update shipment status (e.g., DELIVERED, CRITICAL, SAFE)."""
    shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shipment {shipment_id} not found."
        )
    new_status = payload.get("status")
    if new_status not in ["SAFE", "WARNING", "AT RISK", "CRITICAL", "DELIVERED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status value."
        )
    shipment.status = new_status
    db.commit()
    return {"status": "success", "message": f"Shipment status updated to {new_status}."}
