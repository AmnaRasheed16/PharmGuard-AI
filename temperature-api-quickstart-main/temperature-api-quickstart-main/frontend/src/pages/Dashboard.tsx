import React, { useState, useEffect } from 'react';
import { RoutePlanResponse } from '../types';
import { RouteMap } from '../components/Maps/RouteMap';
import { api } from '../services/api';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, 
  BarChart, PieChart, Pie, Cell, CartesianGrid 
} from 'recharts';
import { 
  Thermometer, ShieldCheck, MapPin, Clock, Award, CheckCircle, 
  HelpCircle, ChevronRight, Send, Trash2, ExternalLink, Calendar
} from 'lucide-react';

interface DashboardProps {
  plannedData: RoutePlanResponse | null;
  plannedMetadata: any | null;
  setActiveTab: (tab: string) => void;
  onShipmentSaved: () => void;
  onLoadShipment: (route: any, metadata: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  plannedData, 
  plannedMetadata, 
  setActiveTab,
  onShipmentSaved,
  onLoadShipment
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    plannedData?.ai_recommendation?.recommended_route_id || plannedData?.routes[0]?.route_id || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [shipments, setShipments] = useState<any[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);

  const loadShipments = async () => {
    setLoadingShipments(true);
    try {
      const data = await api.getShipments();
      setShipments(data);
    } catch (err) {
      console.error('Failed to load shipments on dashboard:', err);
    } finally {
      setLoadingShipments(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  if (!plannedData || plannedData.routes.length === 0) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-6 mt-12">
        <div className="text-6xl animate-bounce">🗺️</div>
        <h2 className="text-2xl font-bold text-white">No active route planned</h2>
        <p className="text-slate-400 text-sm">
          Plan a route using environmental coordinates to run the cold-chain simulation.
        </p>
        <button 
          className="btn-primary flex items-center justify-center gap-2 mx-auto"
          onClick={() => setActiveTab('route-planning')}
        >
          <span>Get Started</span> <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const routes = plannedData.routes;
  const activeRoute = routes.find(r => r.route_id === selectedRouteId) || routes[0];
  const aiRec = plannedData.ai_recommendation;

  const recommendedRoute = routes.find(r => r.route_id === aiRec?.recommended_route_id) || routes[0];

  const totalStopsCount = activeRoute.stops.length;
  
  const minSafe = plannedMetadata?.temp_min_required ?? 2.0;
  const maxSafe = plannedMetadata?.temp_max_required ?? 8.0;
  const stopsAtRiskCount = activeRoute.stops.filter((s: any) => 
    s.average_temperature < minSafe || s.average_temperature > maxSafe
  ).length;

  const worstHeatStop = activeRoute.stops.reduce((worst: any, current: any) => {
    if (!worst || current.wet_bulb_temperature_celsius > worst.wet_bulb_temperature_celsius) {
      return current;
    }
    return worst;
  }, null);

  const overallScore = Math.round(100 - activeRoute.risk_score);

  const workerStressChartData = activeRoute.stops.map((stop: any) => ({
    name: stop.name.split(',')[0],
    "Air °C": Number(stop.average_temperature.toFixed(1)),
    "WBGT °C": Number(stop.wet_bulb_temperature_celsius.toFixed(1))
  }));

  const carbonImpactChartData = routes.map((r) => ({
    name: r.route_name === recommendedRoute.route_name ? `${r.route_name} (Rec)` : r.route_name,
    "CO2 kg": Number(r.carbon_emissions_co2e.toFixed(1)),
    isRec: r.route_id === recommendedRoute.route_id
  }));

  const donutData = [
    { name: 'Transportation', value: 62 },
    { name: 'Refrigeration', value: 23 },
    { name: 'Packaging', value: 9 },
    { name: 'Other', value: 6 }
  ];
  const donutColors = ['#60a5fa', '#22c55e', '#facc15', '#8b5cf6'];

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'RE-TIME': return <Clock className="h-5 w-5 text-brandWarning" />;
      case 'CARGO_PROTECTION': return <ShieldCheck className="h-5 w-5 text-brandCyan" />;
      case 'ROUTE_CHANGE': return <MapPin className="h-5 w-5 text-brandBlue" />;
      case 'WORKER_SAFETY': return <Thermometer className="h-5 w-5 text-brandCritical" />;
      default: return <HelpCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const handleSaveShipment = async () => {
    setIsSaving(true);
    setSaveStatus('IDLE');
    try {
      const payload = {
        metadata: plannedMetadata,
        route: activeRoute
      };
      await api.saveShipment(payload);
      setSaveStatus('SUCCESS');
      onShipmentSaved();
      loadShipments();
    } catch {
      setSaveStatus('ERROR');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadShipmentRecord = (s: any) => {
    const reconstructedRouteDetail = {
      route_id: "saved-route",
      route_name: "Saved Shipment Route",
      geometry: {
        type: "LineString",
        coordinates: [
          [s.origin_lon ?? -112.0080, s.origin_lat ?? 33.4348],
          ...(s.stops ?? []).map((stop: any) => [stop.longitude, stop.latitude]),
          [s.destination_lon ?? -111.8906, s.destination_lat ?? 33.6429]
        ]
      },
      distance_km: s.distance_km,
      duration_minutes: s.duration_minutes,
      carbon_emissions_co2e: s.carbon_emissions_co2e,
      risk_score: s.risk_score,
      compliance_percentage: s.compliance_percentage,
      worst_wet_bulb: s.worst_wet_bulb ?? 20,
      worst_heat_index: s.worst_heat_index ?? 20,
      exposure_score: s.exposure_score ?? 0,
      stops: s.stops ?? [],
      temp_timeline: []
    };

    const reconstructedResponse = {
      routes: [reconstructedRouteDetail],
      ai_recommendation: {
        recommended_route_id: "saved-route",
        recommended_route_name: "Saved Route",
        confidence: s.compliance_percentage,
        risk_level: s.status,
        risk_score: s.risk_score,
        compliance_percentage: s.compliance_percentage,
        summary: `Displaying logged shipment ${s.shipment_id} for ${s.medicine_name}.`,
        rationale: [],
        warnings: [],
        actions: [],
        expected_impact: "",
        risk_explanation: "",
        reasoning: [],
        recommended_actions: [
          {
            action_type: "RE-TIME",
            title: "Archived Delivery Log",
            priority: "MEDIUM",
            description: `This shipment record was logged on ${new Date(s.created_at).toLocaleDateString()}.`,
            expected_benefit: "Audit trail compliance."
          }
        ]
      },
      fortyguard_status: "LIVE"
    };

    const metadata = {
      medicine_name: s.medicine_name,
      cargo_type: s.cargo_type,
      temp_min_required: s.temp_min_required,
      temp_max_required: s.temp_max_required,
      vehicle_type: s.vehicle_type,
      refrigeration_type: s.refrigeration_type,
      cargo_load_kg: s.cargo_load_kg,
      origin_name: s.origin_name,
      destination_name: s.destination_name
    };

    onLoadShipment(reconstructedResponse, metadata);
    setSelectedRouteId("saved-route");
  };

  const handleDeleteShipment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete shipment record ${id}?`)) return;
    try {
      await api.deleteShipment(id);
      setShipments(prev => prev.filter(s => s.shipment_id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-[#1e3056] pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span className="text-brandCyan">🏥</span> CoolRoute Control Panel
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active Shipment: <strong className="text-slate-200">{plannedMetadata?.medicine_name}</strong> ({plannedMetadata?.cargo_type})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'SUCCESS' ? (
            <span className="text-xs font-bold text-brandGreen flex items-center gap-1 bg-brandGreen/10 border border-brandGreen/20 px-3 py-1.5 rounded-lg">
              <CheckCircle className="h-4 w-4" /> Shipment Logged & Dispatched
            </span>
          ) : (
            <button 
              onClick={handleSaveShipment}
              disabled={isSaving}
              className="px-4 py-1.5 bg-brandCyan hover:bg-brandCyan/90 text-darkBg font-extrabold text-xs uppercase tracking-wide rounded-lg flex items-center gap-1.5 transition"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 fill-current" /> Save & Dispatch Shipment
                </>
              )}
            </button>
          )}
          {saveStatus === 'ERROR' && (
            <span className="text-[10px] text-brandCritical font-semibold">Failed to save shipment.</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 rounded-xl border border-[#1e3056] relative overflow-hidden">
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Exposure Score</span>
          <div className="text-2xl font-extrabold text-brandCritical mt-1.5">
            {activeRoute.exposure_score.toFixed(0)} <span className="text-xs text-slate-400">/100</span>
          </div>
          <span className="text-[10px] text-brandCritical/80 font-bold block mt-1">BREACH LIKELY</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-[#1e3056]">
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Route Distance</span>
          <div className="text-2xl font-extrabold text-white mt-1.5">
            {activeRoute.distance_km.toFixed(1)} <span className="text-xs text-slate-400">km</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">
            {Math.round(activeRoute.duration_minutes)} min · {totalStopsCount} stops
          </span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-[#1e3056]">
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Cargo At Risk</span>
          <div className="text-2xl font-extrabold text-brandWarning mt-1.5">
            {stopsAtRiskCount} <span className="text-xs text-slate-400">/ {totalStopsCount}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">Stops above safe band</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-[#1e3056]">
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Worst Heat (WBGT)</span>
          <div className="text-2xl font-extrabold text-brandOrange mt-1.5">
            {worstHeatStop ? worstHeatStop.wet_bulb_temperature_celsius.toFixed(1) : '—'} <span className="text-xs text-slate-400">°C</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block truncate mt-1" title={worstHeatStop?.name}>
            Caution - {worstHeatStop ? worstHeatStop.name.split(',')[0] : 'None'}
          </span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-[#1e3056]">
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Compliance</span>
          <div className="text-2xl font-extrabold text-brandGreen mt-1.5">
            {activeRoute.compliance_percentage.toFixed(1)} <span className="text-xs text-slate-400">%</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">Cold-chain compliance</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-5 rounded-xl border border-[#1e3056] space-y-3">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Route & Heat Exposure</h3>
                <p className="text-[10px] text-slate-400">Real-road cold-chain route — markers colored by worker severity (WBGT), polyline is the driven path.</p>
              </div>
              
              <div className="flex bg-darkBg/60 border border-[#1e3056] rounded-lg p-0.5">
                {routes.map(r => (
                  <button
                    key={r.route_id}
                    onClick={() => setSelectedRouteId(r.route_id)}
                    className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition ${selectedRouteId === r.route_id 
                      ? 'bg-brandCyan text-darkBg' 
                      : 'text-slate-400 hover:text-white'}`}
                  >
                    {r.route_name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[340px]">
              <RouteMap 
                activeRoute={activeRoute} 
                allRoutes={routes} 
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-5 rounded-xl border border-[#1e3056] space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Carbon Impact (CO₂e)</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Estimated emissions for each route option.</p>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={carbonImpactChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3056/30" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={9} />
                    <Tooltip 
                       contentStyle={{ background: '#0a1628', border: '1px solid #1e3056', borderRadius: 8 }}
                      labelStyle={{ color: '#ffffff', fontSize: 11 }}
                    />
                     <Bar dataKey="CO2 kg" fill="#60a5fa" radius={[4, 4, 0, 0]}>
                       {carbonImpactChartData.map((entry, index) => (
                         <Cell 
                           key={`cell-${index}`} 
                           fill={entry.isRec ? '#22c55e' : '#60a5fa'} 
                         />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-5 rounded-xl border border-[#1e3056] space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Emission Breakdown ({activeRoute.route_name})</h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Breakdown of CO₂ footprint by process.</p>
              </div>
              <div className="flex items-center justify-between gap-4 h-44">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-1/2 space-y-2">
                  {donutData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: donutColors[idx] }} />
                        <span className="text-slate-300">{item.name}</span>
                      </div>
                      <span className="font-bold text-white font-mono">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          <div className="glass-card p-5 rounded-xl border border-[#1e3056] space-y-4 md:col-span-2">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wide">Heat & Worker Stress by Stop</h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Street-level air temperature (bars) vs WBGT worker heat index (line) at each stop.</p>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={workerStressChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3056" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                   <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #1e3056', borderRadius: 8 }} labelStyle={{ color: '#ffffff', fontSize: 11 }} />
                  <Legend verticalAlign="top" height={24} iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                   <Bar dataKey="Air °C" fill="#60a5fa" radius={[2, 2, 0, 0]} />
                   <Line type="monotone" dataKey="WBGT °C" stroke="#facc15" strokeWidth={2.5} dot={{ fill: '#facc15', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        <div className="space-y-6">
          <div className="glass-card p-5 rounded-xl border border-[#1e3056] space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide border-b border-[#1e3056] pb-2">Recommended Actions</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {aiRec?.recommended_actions?.map((act: any, idx: number) => (
                <div key={idx} className="p-3 bg-darkBg/60 border border-[#1e3056] rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(act.action_type)}
                      <span className="font-extrabold text-[10px] text-white uppercase tracking-wide">{act.title}</span>
                    </div>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border ${
                      act.priority === 'HIGH'
                        ? 'text-brandCritical bg-brandCritical/10 border-brandCritical/25'
                        : 'text-brandWarning bg-brandWarning/10 border-brandWarning/25'
                    }`}>{act.priority}</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-normal">{act.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 rounded-xl border border-[#1e3056] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide border-b border-[#1e3056] pb-2 flex items-center gap-2">
              <Thermometer className="h-3.5 w-3.5 text-brandCyan" /> Stop Snapshot
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activeRoute.stops.map((stop: any, idx: number) => {
                const isAtRisk = stop.average_temperature < minSafe || stop.average_temperature > maxSafe;
                return (
                  <div key={idx} className={`p-2.5 rounded-lg border text-[10px] ${
                    isAtRisk ? 'bg-brandCritical/5 border-brandCritical/20' : 'bg-darkBg/40 border-[#1e3056]'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white truncate max-w-[60%]">{stop.name.split(',')[0]}</span>
                      <span className={`font-extrabold text-[9px] px-1.5 py-0.5 rounded ${
                        isAtRisk ? 'text-brandCritical bg-brandCritical/10' : 'text-brandGreen bg-brandGreen/10'
                      }`}>{isAtRisk ? '⚠ RISK' : '✓ SAFE'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-slate-400 text-[9px]">
                      <span>Air: <strong className="text-slate-200">{stop.average_temperature?.toFixed(1)}°C</strong></span>
                      <span>WBGT: <strong className="text-brandWarning">{stop.wet_bulb_temperature_celsius?.toFixed(1)}°C</strong></span>
                      <span>AQI: <strong className="text-slate-200">{stop.aqi?.toFixed(0)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-5 rounded-xl border border-[#22c55e]/30 bg-gradient-to-b from-[#22c55e]/5 to-transparent space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">AI Climate Agent Summary</h3>
            <div className="flex items-center gap-3 p-3 bg-brandGreen/10 border border-brandGreen/20 rounded-xl">
              <div className="p-2 bg-brandGreen/20 rounded-lg"><Award className="h-6 w-6 text-brandGreen" /></div>
              <div>
                <span className="text-[9px] font-extrabold text-brandGreen uppercase">Best Route Option</span>
                <h4 className="font-extrabold text-white text-base leading-tight uppercase">🏆 {recommendedRoute.route_name}</h4>
              </div>
            </div>
            <div className="space-y-1.5 text-[10px] text-slate-300 font-medium">
              <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Why {recommendedRoute.route_name}?</span>
              {['Lower heat exposure & worker stress','Optimized carbon emissions profile','Stops within safe thermal thresholds'].map((txt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-brandGreen font-bold mt-0.5">✓</span>
                  <span>{txt}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#1e3056] pt-4">
              <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-3">Overall Score</span>
              <div className="flex items-center justify-between">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="#1e3056" strokeWidth="6" />
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="#22c55e" strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 28}
                      strokeDashoffset={2 * Math.PI * 28 * (1 - overallScore / 100)}
                    />
                  </svg>
                  <span className="absolute text-xs font-extrabold text-white">{overallScore}</span>
                </div>
                <div className="text-right">
                  <span className="text-brandGreen font-bold text-xs">{overallScore >= 75 ? 'EXCELLENT' : overallScore >= 50 ? 'GOOD' : 'AT RISK'}</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Based on weights & compliance</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedRouteId(recommendedRoute.route_id)}
              className="w-full py-2.5 bg-brandGreen hover:bg-brandGreen/90 text-darkBg font-extrabold text-xs uppercase tracking-wider rounded-lg transition"
            >
              Choose {recommendedRoute.route_name}
            </button>
          </div>

        </div>

      </div>

      <div className="glass-card p-5 rounded-xl border border-[#1e3056] space-y-4">
        <div className="flex justify-between items-center border-b border-[#1e3056]/50 pb-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <span>📦</span> Saved Shipment Records
            </h3>
            <p className="text-[10px] text-slate-400">Past cold-chain simulation runs and active dispatches.</p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-darkBg/60 border border-[#1e3056] px-2 py-0.5 rounded font-mono">
            Total: {shipments.length}
          </span>
        </div>

        {loadingShipments ? (
          <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-2">
            <span className="animate-spin text-brandCyan">⏳</span> Loading shipment logs...
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-[#1e3056]/50 rounded-lg">
            No logged dispatches found. Save and dispatch a route to create a record.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
            {shipments.map(s => (
              <div 
                key={s.id} 
                onClick={() => handleLoadShipmentRecord(s)}
                className="bg-[#0a1628]/40 p-4 border border-[#1e3056] hover:border-brandCyan/40 rounded-xl cursor-pointer flex justify-between items-center gap-4 transition-all duration-200 hover:scale-[1.005]"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[10px] text-brandCyan bg-brandCyan/10 border border-brandCyan/25 px-1.5 py-0.2 rounded font-mono shrink-0">
                      {s.shipment_id}
                    </span>
                    <h4 className="font-bold text-white text-xs truncate">{s.medicine_name}</h4>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                    <span className="truncate">{s.origin_name.split(',')[0]}</span>
                    <span className="text-slate-500 font-bold shrink-0">→</span>
                    <span className="truncate">{s.destination_name.split(',')[0]}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[9px] text-slate-400 font-mono">
                    <span>{s.distance_km.toFixed(1)} km</span>
                    <span>{s.carbon_emissions_co2e.toFixed(1)} kg CO₂e</span>
                    <span className="flex items-center gap-1 shrink-0"><Calendar className="h-2.5 w-2.5" /> {new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="block text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Risk</span>
                    <span className={`font-bold text-xs ${s.risk_score < 40 ? 'text-brandGreen' : s.risk_score < 65 ? 'text-brandWarning' : 'text-brandCritical'}`}>
                      {s.risk_score.toFixed(0)}/100
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="block text-[8px] font-extrabold text-slate-500 uppercase tracking-wider">Comp</span>
                    <span className="font-bold text-xs text-brandGreen">
                      {s.compliance_percentage.toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleLoadShipmentRecord(s); }}
                      className="p-1.5 bg-brandCyan/10 hover:bg-brandCyan/20 text-brandCyan rounded-lg border border-brandCyan/20 transition"
                      title="Load into Dashboard"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteShipment(s.shipment_id, e)}
                      className="p-1.5 bg-brandCritical/10 hover:bg-brandCritical/25 text-brandCritical rounded-lg border border-brandCritical/20 transition"
                      title="Delete Record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
