// Shared TypeScript types for PharmaGuard AI frontend
import type { ReactNode } from 'react';
export interface StopAnalysis {
  stop_number: number;
  name: string;
  latitude: number;
  longitude: number;
  eta_minutes: number;
  risk_score: number;
  status: string;
  average_temperature: number;
  min_temperature: number;
  max_temperature: number;
  heat_index_celsius: number;
  apparent_temperature_celsius: number;
  wet_bulb_temperature_celsius: number;
  relative_humidity_percent: number;
  precipitation_mm: number;
  cloud_cover_octas: number;
  aqi: number;
  no2: number;
  o3: number;
  pm25: number;
  pm10: number;
  so2: number;
  solar_irradiance: number;
  methane_ppb: number;
  co2_ppm: number;
  elevation: number;
}

export interface RouteDetail {
  route_id: string;
  route_name: string;
  geometry: any;
  distance_km: number;
  duration_minutes: number;
  carbon_emissions_co2e: number;
  risk_score: number;
  compliance_percentage: number;
  worst_wet_bulb: number;
  worst_heat_index: number;
  exposure_score: number;
  stops: StopAnalysis[];
  temp_timeline: any[];
}

export interface RecommendedAction {
  action_type: string;
  title: string;
  priority: string;
  description: string;
  expected_benefit: string;
}

export interface AIRecommendation {
  expected_impact: ReactNode;
  reasoning: any;
  risk_explanation: ReactNode;
  recommended_actions: RecommendedAction[];
  recommended_route_id: string;
  recommended_route_name: string;
  confidence: number;
  risk_level: string;
  risk_score: number;
  compliance_percentage: number;
  summary: string;
  rationale: string[];
  warnings: string[];
  actions: string[];
}

export interface RoutePlanResponse {
  routes: RouteDetail[];
  ai_recommendation: AIRecommendation;
  fortyguard_status: string;
}

export interface ShipmentRecord {
  id: number;
  shipment_id: string;
  medicine_name: string;
  cargo_type: string;
  origin_name: string;
  destination_name: string;
  distance_km: number;
  duration_minutes: number;
  carbon_emissions_co2e: number;
  risk_score: number;
  compliance_percentage: number;
  status: string;
  created_at: string;
  stops: any[];
  origin_lat?: number;
  origin_lon?: number;
  destination_lat?: number;
  destination_lon?: number;
  worst_wet_bulb?: number;
  worst_heat_index?: number;
  exposure_score?: number;
  temp_min_required?: number;
  temp_max_required?: number;
  vehicle_type?: string;
  refrigeration_type?: string;
  cargo_load_kg?: number;
}

export interface Settings {
  fortyguard_api_key_configured: boolean;
  weight_temperature: number;
  weight_heat: number;
  weight_compliance: number;
  weight_route: number;
  weight_worker: number;
  weight_carbon: number;
}
