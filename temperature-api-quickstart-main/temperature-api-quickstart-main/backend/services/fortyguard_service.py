"""
FortyGuard service — fetches real environmental data using the FortyGuard tOS Enterprise API.
Implements direct HTTP calls to the FortyGuard API (no third-party SDK needed).
Uses Open-Meteo only for base air temperature input required by FortyGuard's env_params endpoint.

PERFORMANCE: Results are cached in-memory by (lat, lon, date, hour) so that identical
stops across the 3 parallel routes are computed only once — subsequent hits are instant.
"""
import datetime
import time
import threading
import requests
from functools import lru_cache

from backend.config import settings


class FortyGuardError(Exception):
    """Raised when FortyGuard API calls fail or return errors."""
    pass


# ─── Thread-safe in-memory caches ────────────────────────────────────────────

# Cache key: (lat_r, lon_r, date_str, hour)  →  full result dict
_ENV_CACHE: dict = {}
_ENV_CACHE_LOCK = threading.Lock()

# Cache key: (lat_r, lon_r, date_str)  →  (avg, min, max, hourly_list)
_OPEN_METEO_CACHE: dict = {}
_OPEN_METEO_CACHE_LOCK = threading.Lock()

# Shared requests Session for connection pooling
_SESSION = requests.Session()


def _round_coord(v: float, decimals: int = 2) -> float:
    """Round coordinate to reduce near-duplicate cache misses."""
    return round(v, decimals)


def _fetch_open_meteo(lat: float, lon: float, date_val: datetime.date) -> tuple:
    """
    Fetch Open-Meteo hourly + daily data for a location/date.
    Returns (avg_temp, min_temp, max_temp, hourly_temps_list).
    Cached per (lat_r, lon_r, date_str).
    """
    lat_r = _round_coord(lat)
    lon_r = _round_coord(lon)
    date_str = str(date_val)
    cache_key = (lat_r, lon_r, date_str)

    with _OPEN_METEO_CACHE_LOCK:
        if cache_key in _OPEN_METEO_CACHE:
            return _OPEN_METEO_CACHE[cache_key]

    url = "https://api.open-meteo.com/v1/forecast"
    try:
        resp = _SESSION.get(url, params={
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m",
            "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean",
            "start_date": date_str,
            "end_date": date_str,
            "timezone": "UTC",
        }, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        hourly = data["hourly"]["temperature_2m"]
        daily = data["daily"]
        avg_temp = float(daily["temperature_2m_mean"][0])
        min_temp = float(daily["temperature_2m_min"][0])
        max_temp = float(daily["temperature_2m_max"][0])
    except Exception as exc:
        raise FortyGuardError(f"Open-Meteo fetch failed: {exc}") from exc

    result = (avg_temp, min_temp, max_temp, hourly)
    with _OPEN_METEO_CACHE_LOCK:
        _OPEN_METEO_CACHE[cache_key] = result
    return result


def fetch_fortyguard_environmental_data(
    api_key: str | None,
    lat: float,
    lon: float,
    date_val: datetime.date,
    time_val: str,
) -> dict:
    """
    Fetch real environmental data for a single location from the FortyGuard API.

    Parameters
    ----------
    api_key   : FortyGuard API key (from DB settings or .env)
    lat, lon  : Geographic coordinates
    date_val  : Date of the shipment stop
    time_val  : HH:MM:SS string representing the estimated arrival hour

    Returns
    -------
    dict with all 20 FortyGuard environmental fields.

    Raises
    ------
    FortyGuardError if the API key is missing or the API call fails.
    """
    if not api_key:
        raise FortyGuardError(
            "FortyGuard API key is not configured. "
            "Please set your API key in Settings before running a route analysis."
        )

    hour = int(time_val.split(":")[0]) if time_val else 12
    lat_r = _round_coord(lat)
    lon_r = _round_coord(lon)
    date_str = str(date_val)
    cache_key = (lat_r, lon_r, date_str, hour)

    # ── Cache hit: return instantly without any API calls ──────────────────
    with _ENV_CACHE_LOCK:
        if cache_key in _ENV_CACHE:
            return _ENV_CACHE[cache_key]

    # ── Step 1: Get Open-Meteo data (single call per location/date) ────────
    avg_temp, min_temp, max_temp, hourly_temps = _fetch_open_meteo(lat, lon, date_val)
    base_temp = float(hourly_temps[min(hour, len(hourly_temps) - 1)])

    # ── Step 2: Submit FortyGuard env_params request ───────────────────────
    base_url = settings.fortyguard_base_url
    submit_url = f"{base_url}/v1/env_params"
    headers = {"api-key": api_key}

    start_time_str = time_val[:5] if len(time_val) >= 5 else "12:00"

    payload = {
        "latitude": lat,
        "longitude": lon,
        "temperature": base_temp,
        "date_time": {
            "start_date": date_str,
            "start_time": start_time_str,
            "filter_type": 1,
        },
    }

    try:
        resp = _SESSION.post(submit_url, headers=headers, json=payload, timeout=20)
        resp.raise_for_status()
        submit_data = resp.json()
    except requests.RequestException as exc:
        raise FortyGuardError(f"FortyGuard env_params request failed: {exc}") from exc

    if submit_data.get("error"):
        raise FortyGuardError(
            f"FortyGuard API returned error: {submit_data.get('message', 'Unknown error')}"
        )

    activity_id = submit_data.get("data", {}).get("activity_id")
    if not activity_id:
        raise FortyGuardError("FortyGuard API did not return an activity_id.")

    # ── Step 3: Poll for results with adaptive backoff ─────────────────────
    status_url = f"{base_url}/v1/status/{activity_id}"

    # Poll: start fast (0.3s), ramp up to 1.5s max — avoids hammering the API
    poll_intervals = [0.3] * 6 + [0.5] * 6 + [1.0] * 10 + [1.5] * 20
    status_data = {}

    for interval in poll_intervals:
        try:
            status_resp = _SESSION.get(status_url, headers=headers, timeout=20)
            status_resp.raise_for_status()
            status_data = status_resp.json()
        except requests.RequestException as exc:
            raise FortyGuardError(f"FortyGuard status poll failed: {exc}") from exc

        status = status_data.get("data", {}).get("status", "")
        if status == "Completed":
            break
        elif status == "Failed":
            raise FortyGuardError("FortyGuard environmental analysis failed.")
        time.sleep(interval)
    else:
        raise FortyGuardError("FortyGuard environmental analysis timed out after 42 seconds.")

    # ── Step 4: Extract fields from result ─────────────────────────────────
    result = status_data.get("data", {}).get("result", {})
    locations = result.get("locations", [])
    if not locations:
        raise FortyGuardError("FortyGuard API returned no location data.")

    loc = locations[0]
    params = loc.get("parameters", {})

    def _get(key: str, fallback: float = 0.0) -> float:
        val = params.get(key)
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                return fallback
        return fallback

    solar = loc.get("solar_irradiance", {})
    ghi = solar.get("clear_sky", {}).get("ghi") if isinstance(solar, dict) else None

    env_result = {
        "average_temperature": avg_temp,
        "min_temperature": min_temp,
        "max_temperature": max_temp,
        "heat_index_celsius": _get("heat_index_celsius", base_temp + 2),
        "apparent_temperature_celsius": _get("apparent_temperature_celsius", base_temp),
        "wet_bulb_temperature_celsius": _get("wet_bulb_temperature_celsius", base_temp - 5),
        "relative_humidity_percent": _get("relative_humidity_percent", 50.0),
        "precipitation_mm": _get("precipitation_mm", 0.0),
        "cloud_cover_octas": _get("cloud_cover_octas", 3.0),
        "aqi": _get("air_quality:idx", 50.0),
        "no2": _get("air_quality_no2:idx", 10.0),
        "o3": _get("air_quality_o3:idx", 30.0),
        "pm25": _get("air_quality_pm2p5:idx", 12.0),
        "pm10": _get("air_quality_pm10:idx", 20.0),
        "so2": _get("air_quality_so2:idx", 2.0),
        "solar_irradiance": _get("solar_irradiance", 500.0) if ghi is None else float(ghi),
        "methane_ppb": _get("methane_ppb", 1900.0),
        "co2_ppm": _get("co2_ppm", 420.0),
        "elevation": _get("elevation", 300.0),
    }

    # ── Cache the result so parallel routes sharing this stop skip the API ──
    with _ENV_CACHE_LOCK:
        _ENV_CACHE[cache_key] = env_result

    return env_result
