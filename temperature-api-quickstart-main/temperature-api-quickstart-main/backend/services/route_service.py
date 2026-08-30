"""
Route service — generates 3 alternative route options using the OSRM public API.
Direct, Waypoint-Shifted (bypass), and Outer routes give the planner meaningful alternatives.
All 3 OSRM calls are made in parallel for maximum speed.

If OSRM is unavailable for the given coordinates, a synthetic direct route is generated
so the rest of the pipeline can still run.
"""
import math
import requests
from typing import List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from backend.services.fortyguard_service import FortyGuardError

OSRM_BASE = "https://router.project-osrm.org/route/v1/driving"

# Shared session for connection pooling
_SESSION = requests.Session()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _estimate_duration_minutes(distance_km: float) -> float:
    """Rough road duration estimate assuming 50 km/h average on mixed roads."""
    return round((distance_km / 50.0) * 60.0, 1)


def _build_synthetic_direct_route(
    origin: Tuple[float, float],
    stops: List[Tuple[float, float]],
    destination: Tuple[float, float],
) -> dict:
    """Build a fallback direct route when OSRM is unavailable."""
    waypoints = [origin] + stops + [destination]
    total_dist = 0.0
    coords: List[List[float]] = []
    for i in range(len(waypoints) - 1):
        lat1, lon1 = waypoints[i]
        lat2, lon2 = waypoints[i + 1]
        total_dist += _haversine_km(lat1, lon1, lat2, lon2)
        # Sample a few intermediate points for a smoother straight-line geometry
        steps = 20
        for s in range(steps):
            frac = s / steps
            lat = lat1 + (lat2 - lat1) * frac
            lon = lon1 + (lon2 - lon1) * frac
            coords.append([lon, lat])
    coords.append([waypoints[-1][1], waypoints[-1][0]])

    distance_km = round(total_dist * 1.15, 2)  # road detour factor
    duration_minutes = _estimate_duration_minutes(distance_km)

    return {
        "route_id": "route-1",
        "route_name": "Direct Route",
        "geometry": {"type": "LineString", "coordinates": coords},
        "distance_km": distance_km,
        "duration_minutes": duration_minutes,
    }


def _osrm_route(coords: List[Tuple[float, float]]) -> dict:
    """Call OSRM and return the first route result."""
    coord_str = ";".join(f"{lon},{lat}" for lat, lon in coords)
    url = f"{OSRM_BASE}/{coord_str}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
    }
    try:
        resp = _SESSION.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            raise FortyGuardError(f"OSRM returned no routes: {data.get('code')}")
        return data["routes"][0]
    except requests.RequestException as exc:
        raise FortyGuardError(f"OSRM request failed: {exc}") from exc


def _shift_coord(lat: float, lon: float, delta_lat: float, delta_lon: float) -> Tuple[float, float]:
    return (lat + delta_lat, lon + delta_lon)


def generate_routes_with_alternatives(
    origin: Tuple[float, float],
    stops: List[Tuple[float, float]],
    destination: Tuple[float, float],
) -> List[dict]:
    """
    Generate 3 alternative route variants using OSRM — all fetched in parallel.

    Returns a list of dicts with keys:
        route_id, route_name, geometry (GeoJSON), distance_km, duration_minutes

    If OSRM is unavailable, a synthetic direct route is returned so downstream
    analysis can still proceed.
    """
    all_waypoints = [origin] + stops + [destination]

    mid_lat = (origin[0] + destination[0]) / 2
    mid_lon = (origin[1] + destination[1]) / 2
    bypass_wp = _shift_coord(mid_lat, mid_lon, 0.04, 0.04)
    outer_wp  = _shift_coord(mid_lat, mid_lon, -0.06, -0.06)

    bypass_waypoints = [origin] + stops + [bypass_wp, destination]
    outer_waypoints  = [origin] + stops + [outer_wp,  destination]

    route_configs = [
        ("route-1", "Direct Route",  all_waypoints),
        ("route-2", "Bypass Route",  bypass_waypoints),
        ("route-3", "Outer Route",   outer_waypoints),
    ]

    # Fetch all 3 routes in parallel
    results: dict = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_cfg = {
            executor.submit(_osrm_route, wp): cfg
            for cfg in route_configs
            for wp in [cfg[2]]
        }
        for future in as_completed(future_to_cfg):
            route_id, route_name, _ = future_to_cfg[future]
            try:
                r = future.result()
                results[route_id] = {
                    "route_id": route_id,
                    "route_name": route_name,
                    "geometry": r["geometry"],
                    "distance_km": round(r["distance"] / 1000, 2),
                    "duration_minutes": round(r["duration"] / 60, 1),
                }
            except Exception:
                # Fall back to direct route geometry with a distance multiplier
                multiplier = 1.07 if route_id == "route-2" else 1.15
                direct = results.get("route-1")
                if direct:
                    results[route_id] = {
                        "route_id": route_id,
                        "route_name": route_name,
                        "geometry": direct["geometry"],
                        "distance_km": round(direct["distance_km"] * multiplier, 2),
                        "duration_minutes": round(direct["duration_minutes"] * multiplier, 1),
                    }

    ordered = [results[rid] for rid in ["route-1", "route-2", "route-3"] if rid in results]

    # Final fallback: if OSRM failed for everything, synthesize a direct route
    if not ordered:
        synthetic = _build_synthetic_direct_route(origin, stops, destination)
        ordered.append(synthetic)

    return ordered
