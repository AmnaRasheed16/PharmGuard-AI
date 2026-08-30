import unittest
from backend.services.carbon_service import calculate_carbon_emissions
from backend.services.risk_service import simulate_cargo_temperatures, calculate_pharma_risk_score

class TestPharmaGuardCalculations(unittest.TestCase):
    
    def test_carbon_emissions_calculations(self):
        # Test Electric vs Diesel emissions
        diesel_emissions = calculate_carbon_emissions(
            distance_km=100.0,
            duration_minutes=120.0,
            vehicle_type="Diesel Light Van",
            refrigeration_type="Active Refrigeration (Diesel)",
            cargo_load_kg=150.0
        )
        
        electric_emissions = calculate_carbon_emissions(
            distance_km=100.0,
            duration_minutes=120.0,
            vehicle_type="Electric Light Van",
            refrigeration_type="Active Refrigeration (Electric)",
            cargo_load_kg=150.0
        )
        
        # Electric should have much lower carbon emissions than Diesel
        self.assertTrue(electric_emissions["total_co2e"] < diesel_emissions["total_co2e"])
        self.assertTrue(electric_emissions["breakdown"]["transportation"] < diesel_emissions["breakdown"]["transportation"])
        self.assertTrue(electric_emissions["breakdown"]["refrigeration"] < diesel_emissions["breakdown"]["refrigeration"])

    def test_cargo_temperature_simulation(self):
        # Ambient temperature is extremely hot: 40C
        ambient_temps = [40.0, 40.0, 40.0]
        durations = [0.0, 60.0, 60.0]
        
        # Active refrigeration (Diesel) should keep cargo within 2-8°C
        active_temps = simulate_cargo_temperatures(
            ambient_temps=ambient_temps,
            durations_minutes=durations,
            temp_min_required=2.0,
            temp_max_required=8.0,
            refrigeration_type="Active Refrigeration (Diesel)"
        )
        
        # No refrigeration should leak rapidly to ambient
        no_ref_temps = simulate_cargo_temperatures(
            ambient_temps=ambient_temps,
            durations_minutes=durations,
            temp_min_required=2.0,
            temp_max_required=8.0,
            refrigeration_type="None"
        )
        
        # Active cooling must maintain temperature within safe boundaries
        self.assertTrue(active_temps[-1] < 10.0)
        # No refrigeration must reach near ambient temperatures
        self.assertTrue(no_ref_temps[-1] > 30.0)

    def test_pharma_risk_scoring(self):
        stops_data = [
            {"average_temperature": 35.0, "wet_bulb_temperature_celsius": 26.0, "heat_index_celsius": 38.0},
            {"average_temperature": 37.0, "wet_bulb_temperature_celsius": 29.0, "heat_index_celsius": 42.0},
            {"average_temperature": 38.0, "wet_bulb_temperature_celsius": 30.0, "heat_index_celsius": 44.0}
        ]
        durations = [0.0, 60.0, 60.0]
        
        # Calculate risk score with active refrigeration (should be low/moderate risk)
        safe_risk = calculate_pharma_risk_score(
            stops_data=stops_data,
            eta_durations=durations,
            temp_min_required=2.0,
            temp_max_required=8.0,
            refrigeration_type="Active Refrigeration (Diesel)",
            carbon_emissions_co2e=50.0,
            total_distance_km=30.0
        )
        
        # Calculate risk score with no refrigeration (should be critical risk)
        critical_risk = calculate_pharma_risk_score(
            stops_data=stops_data,
            eta_durations=durations,
            temp_min_required=2.0,
            temp_max_required=8.0,
            refrigeration_type="None",
            carbon_emissions_co2e=50.0,
            total_distance_km=30.0
        )
        
        self.assertTrue(safe_risk["compliance_percentage"] > critical_risk["compliance_percentage"])
        self.assertTrue(safe_risk["overall_risk_score"] < critical_risk["overall_risk_score"])
        self.assertTrue(critical_risk["status"] in ["AT RISK", "CRITICAL"])

if __name__ == '__main__':
    unittest.main()
