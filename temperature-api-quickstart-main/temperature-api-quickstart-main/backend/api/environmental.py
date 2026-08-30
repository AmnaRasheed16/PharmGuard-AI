from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional

from backend.database import get_db
from backend.models import BackendSettings
from backend.services.fortyguard_service import fetch_fortyguard_environmental_data, FortyGuardError

router = APIRouter(prefix="/environmental", tags=["Environmental Intelligence"])


class DirectEnvRequest(BaseModel):
    latitude: float
    longitude: float
    date: Optional[str] = None
    time: Optional[str] = "12:00:00"


@router.post("/query")
def query_environmental(payload: DirectEnvRequest, db: Session = Depends(get_db)):
    """
    Query real FortyGuard environmental data for any location.
    Used by the Environmental Intelligence page.
    """
    db_settings = db.query(BackendSettings).first()
    from backend.config import settings
    api_key = (db_settings.fortyguard_api_key if db_settings else None) or settings.fortyguard_api_key

    date_val = date.fromisoformat(payload.date) if payload.date else date.today()

    try:
        env_data = fetch_fortyguard_environmental_data(
            api_key=api_key,
            lat=payload.latitude,
            lon=payload.longitude,
            date_val=date_val,
            time_val=payload.time or "12:00:00",
        )
        return {"status": "ok", "data": env_data, "latitude": payload.latitude, "longitude": payload.longitude}
    except FortyGuardError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_type": "FORTYGUARD_UNAVAILABLE",
                "message": str(exc),
                "action": "Check your FortyGuard API key in Settings.",
            },
        )
