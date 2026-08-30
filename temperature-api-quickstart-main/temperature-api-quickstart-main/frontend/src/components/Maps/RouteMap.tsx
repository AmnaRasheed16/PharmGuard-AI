import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix missing Leaflet marker icons with clean SVGs or Base64 so they work flawlessly in all bundlers
const createStopIcon = (num: number, color: string) => {
  return new L.DivIcon({
    html: `<div style="
      background-color: ${color};
      color: #060d1a;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    ">${num}</div>`,
    className: 'custom-stop-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createTerminalIcon = (label: string, color: string) => {
  return new L.DivIcon({
    html: `<div style="
      background-color: ${color};
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #ffffff;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      white-space: nowrap;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    ">${label}</div>`,
    className: 'custom-terminal-marker',
    iconAnchor: [30, 20],
  });
};

// Fit bounds helper component to focus the map dynamically on selected geometry
const MapBoundsSetter: React.FC<{ coords: [number, number][] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [coords, map]);
  return null;
};

interface RouteMapProps {
  activeRoute: any;
  allRoutes: any[];
  selectedRouteId: string;
  onSelectRoute?: (id: string) => void;
}

export const RouteMap: React.FC<RouteMapProps> = ({ 
  activeRoute, 
  allRoutes, 
  selectedRouteId,
  onSelectRoute 
}) => {
  if (!activeRoute || !activeRoute.geometry) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-darkPanel text-slate-400">
        No active route geometry loaded.
      </div>
    );
  }

  // Parse OSRM geometry coordinates: OSRM is [lon, lat], Leaflet is [lat, lon]
  const getPolyCoords = (route: any): [number, number][] => {
    if (!route?.geometry?.coordinates) return [];
    return route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
  };

  const activePolyCoords = getPolyCoords(activeRoute);

  // Determine marker color based on WBGT risk
  const getWbgtColor = (wbgt: number) => {
    if (wbgt >= 30) return '#ef4444'; // Very High - Critical
    if (wbgt >= 28) return '#f97316'; // High - Orange
    if (wbgt >= 26) return '#facc15'; // Moderate - Warning
    return '#22c55e'; // Low - Safe
  };

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden" style={{ minHeight: '340px' }}>
      <MapContainer 
        center={[33.4483, -112.0740]} 
        zoom={11} 
        style={{ height: '100%', width: '100%', background: '#0f1f3a' }}
        zoomControl={false}
      >
        {/* OpenStreetMap tiles styled with CSS filter to match dark dashboard theme */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark-mode-map"
        />

        {/* Render inactive routes as dim lines behind the active route */}
        {allRoutes.map((r) => {
          if (r.route_id === selectedRouteId) return null;
          const coords = getPolyCoords(r);
          return (
            <Polyline
              key={r.route_id}
              positions={coords}
              pathOptions={{ color: '#1e3056', weight: 4, opacity: 0.6 }}
              eventHandlers={{
                click: () => onSelectRoute && onSelectRoute(r.route_id)
              }}
            />
          );
        })}

        {/* Render the active route polyline */}
        <Polyline
          positions={activePolyCoords}
          pathOptions={{ color: '#60a5fa', weight: 6, opacity: 0.95 }}
        />

        {/* Origin Marker */}
        {activePolyCoords.length > 0 && (
          <Marker 
            position={activePolyCoords[0]} 
            icon={createTerminalIcon('Origin', '#22c55e')}
          >
            <Popup>
              <div className="text-xs font-semibold text-slate-800">
                <strong>Origin:</strong> {activeRoute.stops[0]?.name || 'Start Point'}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Stop Waypoints */}
        {activeRoute.stops.map((stop: any, idx: number) => {
          // Skip origin and destination in waypoint rendering if they map directly to terminal nodes
          const isOrigin = stop.stop_number === 0;
          const isDest = stop.stop_number === activeRoute.stops.length - 1;
          
          const coords: [number, number] = [stop.latitude, stop.longitude];
          const color = getWbgtColor(stop.wet_bulb_temperature_celsius);

          if (isOrigin || isDest) return null;

          return (
            <Marker 
              key={idx} 
              position={coords} 
              icon={createStopIcon(stop.stop_number, color)}
            >
              <Popup>
                <div className="p-2 space-y-1.5 font-sans">
                  <h4 className="font-bold text-slate-900 text-xs">{stop.name}</h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                    <span>Avg Temp:</span> <strong className="text-slate-800">{stop.average_temperature.toFixed(1)}°C</strong>
                    <span>Wet Bulb:</span> <strong className="text-slate-800">{stop.wet_bulb_temperature_celsius.toFixed(1)}°C</strong>
                    <span>Heat Index:</span> <strong className="text-slate-800">{stop.heat_index_celsius.toFixed(1)}°C</strong>
                    <span>AQI:</span> <strong className="text-slate-800">{stop.aqi.toFixed(0)}</strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Destination Marker */}
        {activePolyCoords.length > 0 && (
          <Marker 
            position={activePolyCoords[activePolyCoords.length - 1]} 
            icon={createTerminalIcon('Dest', '#ef4444')}
          >
            <Popup>
              <div className="text-xs font-semibold text-slate-800">
                <strong>Destination:</strong> {activeRoute.stops[activeRoute.stops.length - 1]?.name || 'End Point'}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dynamically adjust map bounds */}
        <MapBoundsSetter coords={activePolyCoords} />
      </MapContainer>

      {/* Embedded Map Overlay Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-darkBg/90 border border-[#1e3056] p-3 rounded-lg text-[10px] space-y-1.5 shadow-xl backdrop-blur-md">
        <span className="font-extrabold uppercase text-slate-400 tracking-wider">WBGT Severity</span>
        <div className="space-y-1 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brandGreen border border-white/20" />
            <span>Low (&lt; 26 °C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brandWarning border border-white/20" />
            <span>Moderate (26 - 28 °C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brandOrange border border-white/20" />
            <span>High (28 - 30 °C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brandCritical border border-white/20" />
            <span>Very High (&gt; 30 °C)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
