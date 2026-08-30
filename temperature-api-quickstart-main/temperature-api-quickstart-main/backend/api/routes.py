from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from concurrent.futures import ThreadPoolExecutor, as_completed

from backend.database import get_db
from backend.models import BackendSettings
from backend.schemas.route import RoutePlanRequest, RoutePlanResponse, RouteDetail, StopAnalysisResponse
from backend.services.fortyguard_service import fetch_fortyguard_environmental_data, FortyGuardError
from backend.services.route_service import generate_routes_with_alternatives
from backend.services.carbon_service import calculate_carbon_emissions
from backend.services.risk_service import calculate_pharma_risk_score
from backend.services.ai_agent_service import analyze_routes_and_recommend

router = APIRouter(prefix="/routes", tags=["Route Planning"])

@router.post("/plan", response_model=RoutePlanResponse)
def plan_route(payload: RoutePlanRequest, db: Session = Depends(get_db)):
    """
    Generate 3 alternative routes and analyze their pharmaceutical safety
    using real environmental data from the FortyGuard API.
    """
    # 1. Fetch custom settings (API keys & weights)
    db_settings = db.query(BackendSettings).first()
    from backend.config import settings
    api_key = (db_settings.fortyguard_api_key if db_settings else None) or settings.fortyguard_api_key
    
    weights = {
        "temperature": db_settings.weight_temperature if db_settings else 0.3,
        "heat": db_settings.weight_heat if db_settings else 0.2,
        "compliance": db_settings.weight_compliance if db_settings else 0.2,
        "route": db_settings.weight_route if db_settings else 0.1,
        "worker": db_settings.weight_worker if db_settings else 0.1,
        "carbon": db_settings.weight_carbon if db_settings else 0.1
    }

    origin_coords = (payload.origin_lat, payload.origin_lon)
    dest_coords = (payload.destination_lat, payload.destination_lon)
    stop_coords = [(s.latitude, s.longitude) for s in payload.stops]

    # 2. Generate 3 routes with OSRM (Direct, Bypass, Outer)
    try:
        raw_routes = generate_routes_with_alternatives(origin_coords, stop_coords, dest_coords)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate road routes using OSRM: {str(e)}"
        )

    if not raw_routes:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OSRM routing service returned no routes for the given coordinates."
        )

    analyzed_routes = []
    fortyguard_success = True
    fortyguard_err_msg = ""

    def analyze_single_route(raw_route):
        """Analyze one route: FortyGuard calls + risk calc. Returns (RouteDetail, success, err_msg)."""
        stops_analysis = []
        route_duration = raw_route["duration_minutes"]
        route_dist = raw_route["distance_km"]

        num_stops = len(payload.stops)
        total_segments = num_stops + 1
        segment_duration = route_duration / total_segments

        all_stops_input = [
            {"name": payload.origin_name, "lat": payload.origin_lat, "lon": payload.origin_lon, "num": 0, "eta": 0.0}
        ]
        for idx, stop in enumerate(payload.stops):
            all_stops_input.append({
                "name": stop.name,
                "lat": stop.latitude,
                "lon": stop.longitude,
                "num": idx + 1,
                "eta": (idx + 1) * segment_duration
            })
        all_stops_input.append({
            "name": payload.destination_name,
            "lat": payload.destination_lat,
            "lon": payload.destination_lon,
            "num": num_stops + 1,
            "eta": route_duration
        })

        stop_call_args = []
        for s_input in all_stops_input:
            stop_hour = (payload.start_time.hour + int(s_input["eta"] / 60)) % 24
            stop_time_str = f"{stop_hour:02d}:00:00"
            stop_call_args.append({
                "s_input": s_input,
                "stop_time_str": stop_time_str,
                "api_key": api_key,
                "delivery_date": payload.delivery_date,
                "temp_max_required": payload.temp_max_required,
                "temp_min_required": payload.temp_min_required,
            })

        with ThreadPoolExecutor(max_workers=len(stop_call_args)) as executor:
            futures = {
                executor.submit(
                    fetch_fortyguard_environmental_data,
                    api_key=arg["api_key"],
                    lat=arg["s_input"]["lat"],
                    lon=arg["s_input"]["lon"],
                    date_val=arg["delivery_date"],
                    time_val=arg["stop_time_str"],
                ): arg
                for arg in stop_call_args
            }

            for future in as_completed(futures):
                arg = futures[future]
                s_input = arg["s_input"]
                try:
                    fg_data = future.result()
                    ambient_avg = fg_data["average_temperature"]
                    stop_dev = max(0.0, ambient_avg - arg["temp_max_required"], arg["temp_min_required"] - ambient_avg)
                    stop_risk = min(100.0, stop_dev * 10.0 + (fg_data["wet_bulb_temperature_celsius"] - 20.0) * 5.0)
                    stop_risk = max(0.0, stop_risk)

                    if stop_risk < 25.0:
                        stop_status = "SAFE"
                    elif stop_risk < 50.0:
                        stop_status = "WARNING"
                    elif stop_risk < 75.0:
                        stop_status = "AT RISK"
                    else:
                        stop_status = "CRITICAL"

                    stops_analysis.append(StopAnalysisResponse(
                        stop_number=s_input["num"],
                        name=s_input["name"],
                        latitude=s_input["lat"],
                        longitude=s_input["lon"],
                        eta_minutes=round(s_input["eta"], 1),
                        risk_score=round(stop_risk, 1),
                        status=stop_status,
                        **fg_data
                    ))
                except FortyGuardError as fg_exc:
                    return None, False, str(fg_exc)
                except Exception as e:
                    return None, False, f"Unexpected error during FortyGuard API retrieval: {str(e)}"

        stops_analysis.sort(key=lambda s: s.stop_number)

        co2_data = calculate_carbon_emissions(
            distance_km=route_dist,
            duration_minutes=route_duration,
            vehicle_type=payload.vehicle_type,
            refrigeration_type=payload.refrigeration_type,
            cargo_load_kg=payload.cargo_load_kg
        )

        eta_durations = [0.0] + [segment_duration] * total_segments
        stops_data_dicts = [s.model_dump() for s in stops_analysis]

        risk_metrics = calculate_pharma_risk_score(
            stops_data=stops_data_dicts,
            eta_durations=eta_durations,
            temp_min_required=payload.temp_min_required,
            temp_max_required=payload.temp_max_required,
            refrigeration_type=payload.refrigeration_type,
            carbon_emissions_co2e=co2_data["total_co2e"],
            total_distance_km=route_dist,
            weights=weights
        )

        temp_timeline = []
        for i, cargo_t in enumerate(risk_metrics["cargo_temperatures"]):
            stop_name = all_stops_input[i]["name"]
            eta_m = all_stops_input[i]["eta"]
            amb_t = stops_data_dicts[i]["average_temperature"]
            temp_timeline.append({
                "time": f"{int(eta_m)}m ({stop_name})",
                "CargoTemp": cargo_t,
                "EnvTemp": amb_t
            })

        route_detail = RouteDetail(
            route_id=raw_route["route_id"],
            route_name=raw_route["route_name"],
            geometry=raw_route["geometry"],
            distance_km=route_dist,
            duration_minutes=route_duration,
            carbon_emissions_co2e=co2_data["total_co2e"],
            risk_score=risk_metrics["overall_risk_score"],
            compliance_percentage=risk_metrics["compliance_percentage"],
            worst_wet_bulb=risk_metrics["worst_wet_bulb"],
            worst_heat_index=risk_metrics["worst_heat_index"],
            exposure_score=risk_metrics["exposure_score"],
            stops=stops_analysis,
            temp_timeline=temp_timeline
        )
        return route_detail, True, ""

    # Run all 3 route analyses in parallel (each already parallelizes FortyGuard calls internally)
    with ThreadPoolExecutor(max_workers=len(raw_routes)) as outer_executor:
        route_futures = [outer_executor.submit(analyze_single_route, raw_route) for raw_route in raw_routes]
        route_results = [f.result() for f in route_futures]

    for route_detail, success, err_msg in route_results:
        if not success:
            fortyguard_success = False
            fortyguard_err_msg = err_msg
            break
        analyzed_routes.append(route_detail)

    # Preserve original route order
    route_id_order = [r["route_id"] for r in raw_routes]
    analyzed_routes.sort(key=lambda r: route_id_order.index(r.route_id))



    # If FortyGuard failed, raise detailed exception
    if not fortyguard_success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_type": "FORTYGUARD_UNAVAILABLE",
                "message": "FortyGuard environmental data unavailable.",
                "reason": fortyguard_err_msg,
                "action": "Check FortyGuard API key in settings or verify FortyGuard API service availability."
            }
        )

    # 3. Analyze routes with AI Climate Agent
    # Convert RouteDetail schemas to dict for ai_agent_service
    routes_for_agent = []
    for r in analyzed_routes:
        r_dict = r.model_dump()
        # Ensure model_dump matches requirements
        routes_for_agent.append(r_dict)
        
    ai_recommendation = analyze_routes_and_recommend(routes_for_agent)

    return RoutePlanResponse(
        routes=analyzed_routes,
        ai_recommendation=ai_recommendation,
        fortyguard_status="LIVE"
    )
