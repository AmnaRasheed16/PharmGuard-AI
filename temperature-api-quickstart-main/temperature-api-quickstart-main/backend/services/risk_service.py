"""Pharmaceutical risk score engine based on real FortyGuard environmental data."""
from typing import List


def calculate_pharma_risk_score(
    stops_data: List[dict],
    eta_durations: List[float],
    temp_min_required: float,
    temp_max_required: float,
    refrigeration_type: str,
    carbon_emissions_co2e: float,
    total_distance_km: float,
    weights: dict,
) -> dict:
    """
    Calculate multi-dimensional pharmaceutical risk score for a route.

    Returns
    -------
    dict with:
        overall_risk_score   (0-100, higher = more risk)
        compliance_percentage (0-100, higher = safer)
        worst_wet_bulb
        worst_heat_index
        exposure_score
        cargo_temperatures  (simulated cargo temperature at each stop)
        component_scores    (breakdown by dimension)
    """
    if not stops_data:
        return {
            "overall_risk_score": 0.0,
            "compliance_percentage": 100.0,
            "worst_wet_bulb": 20.0,
            "worst_heat_index": 20.0,
            "exposure_score": 0.0,
            "cargo_temperatures": [],
            "component_scores": {},
        }

    # Active refrigeration significantly reduces cargo temp excursion
    has_active_cooling = "Active" in refrigeration_type
    cooling_factor = 0.15 if has_active_cooling else 0.65

    cargo_temps = []
    compliant_stops = 0
    worst_wb = -999.0
    worst_hi = -999.0
    total_exposure = 0.0
    heat_scores = []
    temp_scores = []
    worker_scores = []

    ambient_temps = [s.get("average_temperature", 25.0) for s in stops_data]
    cargo_t = (temp_min_required + temp_max_required) / 2.0

    for i, stop in enumerate(stops_data):
        amb = stop.get("average_temperature", 25.0)
        wb = stop.get("wet_bulb_temperature_celsius", 20.0)
        hi = stop.get("heat_index_celsius", amb)
        hum = stop.get("relative_humidity_percent", 50.0)

        # Simulate cargo temperature drift toward ambient
        segment_hours = eta_durations[i] / 60.0 if i < len(eta_durations) else 0.5
        cargo_t += (amb - cargo_t) * cooling_factor * min(segment_hours, 2.0)
        cargo_t = round(cargo_t, 2)
        cargo_temps.append(cargo_t)

        # Compliance: is cargo temp within required range?
        if temp_min_required <= cargo_t <= temp_max_required:
            compliant_stops += 1

        # Temperature excursion score (0-100)
        excess = max(0.0, cargo_t - temp_max_required, temp_min_required - cargo_t)
        temp_score = min(100.0, excess * 15.0)
        temp_scores.append(temp_score)

        # Heat stress score (wet bulb + heat index based)
        heat_score = max(0.0, (wb - 25.0) * 5.0 + (hi - 30.0) * 3.0)
        heat_score = min(100.0, heat_score)
        heat_scores.append(heat_score)

        # Worker safety (WBGT proxy)
        worker_score = min(100.0, max(0.0, (wb - 22.0) * 6.0 + (hum - 60.0) * 0.8))
        worker_scores.append(worker_score)

        # Exposure = heat * time
        total_exposure += heat_score * segment_hours

        worst_wb = max(worst_wb, wb)
        worst_hi = max(worst_hi, hi)

    compliance_pct = (compliant_stops / len(stops_data)) * 100.0

    # Compliance score (inverse — high compliance = low risk contribution)
    compliance_score = 100.0 - compliance_pct

    # Route length risk (longer = more exposure time)
    route_score = min(100.0, total_distance_km / 10.0)

    # Carbon score
    carbon_score = min(100.0, carbon_emissions_co2e / 2.0)

    avg_temp = sum(temp_scores) / len(temp_scores)
    avg_heat = sum(heat_scores) / len(heat_scores)
    avg_worker = sum(worker_scores) / len(worker_scores)

    w = weights
    overall = (
        avg_temp * w.get("temperature", 0.30) +
        avg_heat * w.get("heat", 0.20) +
        compliance_score * w.get("compliance", 0.20) +
        route_score * w.get("route", 0.10) +
        avg_worker * w.get("worker", 0.10) +
        carbon_score * w.get("carbon", 0.10)
    )

    return {
        "overall_risk_score": round(min(100.0, max(0.0, overall)), 1),
        "compliance_percentage": round(compliance_pct, 1),
        "worst_wet_bulb": round(worst_wb if worst_wb > -999.0 else 20.0, 2),
        "worst_heat_index": round(worst_hi if worst_hi > -999.0 else 20.0, 2),
        "exposure_score": round(total_exposure, 2),
        "cargo_temperatures": cargo_temps,
        "component_scores": {
            "temperature": round(avg_temp, 1),
            "heat": round(avg_heat, 1),
            "compliance": round(compliance_score, 1),
            "route": round(route_score, 1),
            "worker": round(avg_worker, 1),
            "carbon": round(carbon_score, 1),
        },
    }
