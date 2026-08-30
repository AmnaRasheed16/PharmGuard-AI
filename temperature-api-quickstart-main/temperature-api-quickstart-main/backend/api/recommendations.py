from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import BackendSettings
from backend.schemas.shipment import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Application Settings"])

@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Fetch backend weights and check if FortyGuard API key is configured."""
    db_settings = db.query(BackendSettings).first()
    if not db_settings:
        from backend.config import settings
        # Create default settings row populated from .env config
        db_settings = BackendSettings(
            id=1,
            fortyguard_api_key=settings.fortyguard_api_key
        )
        db.add(db_settings)
        db.commit()
        db.refresh(db_settings)
        
    has_key = db_settings.fortyguard_api_key is not None and db_settings.fortyguard_api_key != ""
    return SettingsResponse(
        fortyguard_api_key_configured=has_key,
        weight_temperature=db_settings.weight_temperature,
        weight_heat=db_settings.weight_heat,
        weight_compliance=db_settings.weight_compliance,
        weight_route=db_settings.weight_route,
        weight_worker=db_settings.weight_worker,
        weight_carbon=db_settings.weight_carbon
    )

@router.post("", response_model=SettingsResponse)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    """Update settings on the backend (e.g. weights or API keys)."""
    db_settings = db.query(BackendSettings).first()
    if not db_settings:
        db_settings = BackendSettings(id=1)
        db.add(db_settings)
        
    # Update fields if provided
    if payload.fortyguard_api_key is not None:
        db_settings.fortyguard_api_key = payload.fortyguard_api_key
        
    if payload.weight_temperature is not None:
        db_settings.weight_temperature = payload.weight_temperature
    if payload.weight_heat is not None:
        db_settings.weight_heat = payload.weight_heat
    if payload.weight_compliance is not None:
        db_settings.weight_compliance = payload.weight_compliance
    if payload.weight_route is not None:
        db_settings.weight_route = payload.weight_route
    if payload.weight_worker is not None:
        db_settings.weight_worker = payload.weight_worker
    if payload.weight_carbon is not None:
        db_settings.weight_carbon = payload.weight_carbon
        
    # Normalize weights so they sum to 1.0 (recommended to maintain score range 0-100)
    total_w = (
        db_settings.weight_temperature +
        db_settings.weight_heat +
        db_settings.weight_compliance +
        db_settings.weight_route +
        db_settings.weight_worker +
        db_settings.weight_carbon
    )
    if total_w > 0.0:
        db_settings.weight_temperature /= total_w
        db_settings.weight_heat /= total_w
        db_settings.weight_compliance /= total_w
        db_settings.weight_route /= total_w
        db_settings.weight_worker /= total_w
        db_settings.weight_carbon /= total_w
        
    db.commit()
    db.refresh(db_settings)
    
    has_key = db_settings.fortyguard_api_key is not None and db_settings.fortyguard_api_key != ""
    return SettingsResponse(
        fortyguard_api_key_configured=has_key,
        weight_temperature=db_settings.weight_temperature,
        weight_heat=db_settings.weight_heat,
        weight_compliance=db_settings.weight_compliance,
        weight_route=db_settings.weight_route,
        weight_worker=db_settings.weight_worker,
        weight_carbon=db_settings.weight_carbon
    )
