"""Carbon emissions calculator for pharmaceutical cold-chain logistics."""

# kg CO2e per km for different vehicle types
VEHICLE_EMISSION_FACTORS = {
    "Diesel Light Van": 0.21,
    "Diesel Medium Truck": 0.29,
    "Electric Van": 0.05,
    "Hybrid Van": 0.12,
    "Refrigerated Diesel Truck": 0.34,
}

# Additional kg CO2e per hour of refrigeration
REFRIGERATION_EMISSION_FACTORS = {
    "Active Refrigeration (Diesel)": 1.8,
    "Active Refrigeration (Electric)": 0.4,
    "Passive (Dry Ice)": 0.5,
    "Passive (Phase Change Material)": 0.1,
    "None": 0.0,
}


def calculate_carbon_emissions(
    distance_km: float,
    duration_minutes: float,
    vehicle_type: str,
    refrigeration_type: str,
    cargo_load_kg: float,
) -> dict:
    """
    Calculate CO2 equivalent emissions for a pharmaceutical cold-chain route.

    Returns a dict with:
        total_co2e        - total CO2 equivalent in kg
        transport_co2e    - from vehicle movement
        refrigeration_co2e - from active cooling
        per_km_co2e       - emission intensity per km
        emission_grade    - A/B/C/D/F letter grade
    """
    vehicle_factor = VEHICLE_EMISSION_FACTORS.get(vehicle_type, 0.25)
    refrig_factor = REFRIGERATION_EMISSION_FACTORS.get(refrigeration_type, 1.0)

    # Load factor: heavier cargo = slightly more fuel
    load_factor = 1.0 + (cargo_load_kg / 5000.0)

    transport_co2e = distance_km * vehicle_factor * load_factor
    refrigeration_co2e = (duration_minutes / 60.0) * refrig_factor
    total_co2e = transport_co2e + refrigeration_co2e
    per_km_co2e = total_co2e / max(distance_km, 1.0)

    # Grade
    if per_km_co2e < 0.15:
        grade = "A"
    elif per_km_co2e < 0.25:
        grade = "B"
    elif per_km_co2e < 0.35:
        grade = "C"
    elif per_km_co2e < 0.50:
        grade = "D"
    else:
        grade = "F"

    return {
        "total_co2e": round(total_co2e, 2),
        "transport_co2e": round(transport_co2e, 2),
        "refrigeration_co2e": round(refrigeration_co2e, 2),
        "per_km_co2e": round(per_km_co2e, 4),
        "emission_grade": grade,
    }
