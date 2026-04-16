# PART 1
def calculate_fuel_prediction(distance_km: float, base_consumption_per_100km: float, cargo_weight_kg: float) -> float:
    cargo_factor = (cargo_weight_kg / 10000) * 2
    predicted_fuel = (distance_km / 100) * base_consumption_per_100km + cargo_factor
    return round(predicted_fuel, 2)