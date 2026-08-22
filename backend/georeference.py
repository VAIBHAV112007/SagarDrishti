import math

def calculate_anomaly_gps(boat_lat: float, boat_lon: float, heading_deg: float, 
                          slant_range_m: float, channel: str) -> tuple[float, float]:
    """Computes target Lat/Lon based on vessel position, heading, and sonar channel."""
    R_EARTH = 6378137.0  # Earth radius in meters
    offset_angle = -90.0 if channel.lower() == 'port' else 90.0
    target_bearing = (heading_deg + offset_angle) % 360.0
    bearing_rad = math.radians(target_bearing)

    lat_rad = math.radians(boat_lat)
    lon_rad = math.radians(boat_lon)

    target_lat_rad = math.asin(
        math.sin(lat_rad) * math.cos(slant_range_m / R_EARTH) +
        math.cos(lat_rad) * math.sin(slant_range_m / R_EARTH) * math.cos(bearing_rad)
    )

    target_lon_rad = lon_rad + math.atan2(
        math.sin(bearing_rad) * math.sin(slant_range_m / R_EARTH) * math.cos(lat_rad),
        math.cos(slant_range_m / R_EARTH) - math.sin(lat_rad) * math.sin(target_lat_rad)
    )

    return math.degrees(target_lat_rad), math.degrees(target_lon_rad)