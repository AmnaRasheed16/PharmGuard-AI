from fastapi import APIRouter
from backend.services.carbon_service import calculate_carbon_emissions

router = APIRouter(prefix="/carbon", tags=["Carbon Lens"])


@router.get("/factors")
def get_emission_factors():
    """Return vehicle and refrigeration emission factors for the frontend Carbon Lens page."""
    from backend.services.carbon_service import VEHICLE_EMISSION_FACTORS, REFRIGERATION_EMISSION_FACTORS
    return {
        "vehicle_factors": VEHICLE_EMISSION_FACTORS,
        "refrigeration_factors": REFRIGERATION_EMISSION_FACTORS,
    }
