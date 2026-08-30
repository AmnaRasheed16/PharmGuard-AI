"""AI Climate Agent — analyzes routes and produces a structured recommendation."""
from typing import List


def analyze_routes_and_recommend(routes: List[dict]) -> dict:
    """
    Analyze multiple route options based on real FortyGuard data and recommend the safest.

    Returns a structured AI recommendation dict.
    """
    if not routes:
        return {
            "recommended_route_id": None,
            "confidence": 0,
            "summary": "No routes to analyze.",
            "rationale": [],
            "warnings": [],
            "actions": [],
        }

    # Score each route (lower risk = better)
    scored = sorted(routes, key=lambda r: r.get("risk_score", 100))
    best = scored[0]
    best_id = best.get("route_id", "route-1")
    best_risk = best.get("risk_score", 0)
    best_compliance = best.get("compliance_percentage", 100)
    best_co2 = best.get("carbon_emissions_co2e", 0)
    best_dist = best.get("distance_km", 0)
    best_dur = best.get("duration_minutes", 0)
    best_wb = best.get("worst_wet_bulb", 20)
    best_hi = best.get("worst_heat_index", 20)

    # Confidence based on compliance
    confidence = int(min(99, best_compliance))

    # Build rationale bullets
    rationale = [
        f"Lowest overall pharma risk score: {best_risk:.1f}/100",
        f"Cold-chain compliance rate: {best_compliance:.1f}%",
        f"Route distance: {best_dist:.1f} km in {best_dur:.0f} minutes",
        f"Carbon footprint: {best_co2:.1f} kg CO₂e",
        f"Peak wet-bulb temperature: {best_wb:.1f}°C (FortyGuard live data)",
        f"Peak heat index: {best_hi:.1f}°C",
    ]

    # Warnings
    warnings = []
    if best_risk > 60:
        warnings.append("HIGH RISK: Cargo temperature excursions likely. Consider rescheduling.")
    if best_compliance < 80:
        warnings.append(f"Low compliance ({best_compliance:.0f}%). Active monitoring required.")
    if best_wb > 28:
        warnings.append(f"Extreme wet-bulb temperature ({best_wb:.1f}°C). Worker heat stress risk.")
    if best_hi > 38:
        warnings.append(f"Dangerous heat index ({best_hi:.1f}°C). Mandatory cooling breaks.")
    if best_co2 > 50:
        warnings.append("High carbon emissions. Consider an electric or hybrid vehicle.")

    # Actions
    actions = [
        "Verify refrigeration unit is pre-cooled to target range before departure.",
        "Use insulated packaging for all biological cargo.",
        "Monitor cargo temperature with real-time data loggers at every stop.",
        "Brief driver on hot-spot stops and required dwell-time limits.",
    ]
    if best_wb > 26:
        actions.append("Schedule outdoor stop activities during cooler morning hours.")
    if best_compliance < 90:
        actions.append("Add a backup insulated container as a secondary thermal barrier.")

    # Risk label
    if best_risk < 25:
        risk_label = "LOW"
    elif best_risk < 50:
        risk_label = "MODERATE"
    elif best_risk < 75:
        risk_label = "HIGH"
    else:
        risk_label = "CRITICAL"

    summary = (
        f"AI Climate Agent recommends {best.get('route_name', best_id)} "
        f"with {risk_label} risk ({best_risk:.1f}/100) and "
        f"{best_compliance:.0f}% cold-chain compliance based on live FortyGuard environmental data."
    )

    expected_impact = (
        f"Selecting {best.get('route_name', best_id)} minimizes temperature excursions, "
        f"reduces worker heat stress exposure, and maintains the highest possible cold-chain "
        f"compliance while keeping carbon emissions within target thresholds."
    )

    risk_explanation = (
        f"The recommended route achieves a pharma risk score of {best_risk:.1f}/100. "
        f"Key risk factors include peak wet-bulb temperature ({best_wb:.1f}°C) and heat index ({best_hi:.1f}°C). "
        f"Compliance is maintained at {best_compliance:.1f}% with projected CO₂e emissions of {best_co2:.1f} kg."
    )

    recommended_actions = [
        {
            "action_type": "RE-TIME",
            "title": "Pre-cool Refrigeration Unit",
            "priority": "HIGH",
            "description": "Verify refrigeration unit is pre-cooled to target range before departure.",
            "expected_benefit": "Maintains cold-chain integrity from origin to first stop."
        },
        {
            "action_type": "CARGO_PROTECTION",
            "title": "Insulated Packaging",
            "priority": "MEDIUM",
            "description": "Use insulated packaging for all biological cargo.",
            "expected_benefit": "Reduces thermal deviation during transit and stop dwell times."
        },
        {
            "action_type": "ROUTE_CHANGE",
            "title": "Real-Time Monitoring",
            "priority": "MEDIUM",
            "description": "Monitor cargo temperature with real-time data loggers at every stop.",
            "expected_benefit": "Enables immediate corrective action if excursion thresholds are breached."
        },
        {
            "action_type": "WORKER_SAFETY",
            "title": "Driver Safety Briefing",
            "priority": "HIGH",
            "description": "Brief driver on hot-spot stops and required dwell-time limits.",
            "expected_benefit": "Prevents heat stress incidents and ensures regulatory compliance."
        }
    ]

    if best_wb > 26:
        recommended_actions.append({
            "action_type": "WORKER_SAFETY",
            "title": "Schedule Cooler Stops",
            "priority": "MEDIUM",
            "description": "Schedule outdoor stop activities during cooler morning hours.",
            "expected_benefit": "Reduces worker exposure to peak heat conditions."
        })
    if best_compliance < 90:
        recommended_actions.append({
            "action_type": "CARGO_PROTECTION",
            "title": "Backup Thermal Barrier",
            "priority": "MEDIUM",
            "description": "Add a backup insulated container as a secondary thermal barrier.",
            "expected_benefit": "Improves compliance margin and reduces risk of temperature excursions."
        })

    return {
        "recommended_route_id": best_id,
        "recommended_route_name": best.get("route_name", best_id),
        "confidence": confidence,
        "risk_level": risk_label,
        "risk_score": best_risk,
        "compliance_percentage": best_compliance,
        "summary": summary,
        "rationale": rationale,
        "warnings": warnings,
        "actions": actions,
        "expected_impact": expected_impact,
        "risk_explanation": risk_explanation,
        "reasoning": rationale,
        "recommended_actions": recommended_actions,
    }
