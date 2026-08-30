import React, { useState } from 'react';
import { Bell, ShieldAlert, AlertTriangle, Info, CheckCircle2, Filter } from 'lucide-react';
import { RoutePlanResponse } from '../types';

interface AlertsProps {
  plannedData: RoutePlanResponse | null;
  plannedMetadata: any | null;
}

export interface AlertItem {
  id: string;
  time: string;
  shipment: string;
  location: string;
  severity: 'CRITICAL' | 'WARNING' | 'ATTENTION' | 'RESOLVED' | 'AI';
  message: string;
  recommendedAction: string;
}

export const Alerts: React.FC<AlertsProps> = ({ plannedData, plannedMetadata }) => {
  const [filter, setFilter] = useState<string>('ALL');

  // Use AI-recommended route if available, otherwise fallback to first route
  const aiRec = plannedData?.ai_recommendation || null;
  const recommendedRouteId = aiRec?.recommended_route_id;
  const activeRoute = plannedData
    ? (plannedData.routes.find(r => r.route_id === recommendedRouteId) || plannedData.routes[0])
    : null;

  const medicineName = plannedMetadata?.medicine_name || 'Vaccine Shipment';
  const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── Generate alerts from route data + AI warnings ──────────────────────────
  const generateAlerts = (): AlertItem[] => {
    if (!activeRoute) return [];
    const alerts: AlertItem[] = [];

    // ── 1. Cold-chain compliance (CRITICAL / RESOLVED) ─────────────────────
    if (activeRoute.compliance_percentage < 100.0) {
      alerts.push({
        id: 'compliance-excursion',
        time: currentTimeStr,
        shipment: medicineName,
        location: activeRoute.route_name,
        severity: 'CRITICAL',
        message: `Cold-chain compliance fell to ${activeRoute.compliance_percentage.toFixed(0)}%. Simulated cargo temperature exceeded threshold limits.`,
        recommendedAction:
          'Replace standard packaging with Phase Change Materials (PCM) or active diesel cooling.',
      });
    } else {
      alerts.push({
        id: 'compliance-ok',
        time: currentTimeStr,
        shipment: medicineName,
        location: 'Route Transit',
        severity: 'RESOLVED',
        message:
          'Cold-chain compliance fully restored. Simulated cargo temperature maintained stable within 2.0°C – 8.0°C.',
        recommendedAction:
          'Proceed with planned container parameters. Perform pre-cooling check.',
      });
    }

    // ── 2. AI agent warnings ────────────────────────────────────────────────
    if (aiRec?.warnings && aiRec.warnings.length > 0) {
      aiRec.warnings.forEach((warn: string, i: number) => {
        alerts.push({
          id: `ai-warning-${i}`,
          time: currentTimeStr,
          shipment: medicineName,
          location: activeRoute.route_name,
          severity: 'AI',
          message: warn,
          recommendedAction:
            'Follow agent directives — see the AI Climate Agent Log for detailed action items.',
        });
      });
    }

    // ── 3. Stop-level wet-bulb warnings ────────────────────────────────────
    activeRoute.stops.forEach((stop) => {
      if (stop.wet_bulb_temperature_celsius >= 28.0) {
        alerts.push({
          id: `wbgt-${stop.stop_number}`,
          time: `+${Math.round(stop.eta_minutes)} mins`,
          shipment: medicineName,
          location: stop.name,
          severity: 'WARNING',
          message: `High environmental heat detected. Wet-bulb Globe Temp reached ${stop.wet_bulb_temperature_celsius.toFixed(1)}°C (safety limit >28°C).`,
          recommendedAction:
            'Enforce crew work-rest cycle: 45 min work / 15 min rest. Deploy hydration shades.',
        });
      }

      // ── 4. Heat-index attention ──────────────────────────────────────────
      if (stop.heat_index_celsius >= 35.0) {
        alerts.push({
          id: `heatidx-${stop.stop_number}`,
          time: `+${Math.round(stop.eta_minutes)} mins`,
          shipment: medicineName,
          location: stop.name,
          severity: 'ATTENTION',
          message: `Midday delivery window scheduled during high-risk heat index hour (${stop.heat_index_celsius.toFixed(1)}°C).`,
          recommendedAction:
            'Limit manual loading/unloading to under 10 continuous minutes to protect cargo safety.',
        });
      }

      // ── 5. Critical stop risk ────────────────────────────────────────────
      if (stop.risk_score >= 75) {
        alerts.push({
          id: `stoprisk-${stop.stop_number}`,
          time: `+${Math.round(stop.eta_minutes)} mins`,
          shipment: medicineName,
          location: stop.name,
          severity: 'CRITICAL',
          message: `Stop ${stop.stop_number} (${stop.name.split(',')[0]}) has a critical risk score of ${stop.risk_score.toFixed(0)}/100. Immediate intervention required.`,
          recommendedAction:
            'Reduce stop dwell time to under 5 minutes. Pre-cool cargo hold before arrival.',
        });
      }
    });

    // ── 6. High carbon footprint ────────────────────────────────────────────
    if (activeRoute.carbon_emissions_co2e > 50) {
      alerts.push({
        id: 'carbon-high',
        time: currentTimeStr,
        shipment: medicineName,
        location: activeRoute.route_name,
        severity: 'ATTENTION',
        message: `Carbon footprint is ${activeRoute.carbon_emissions_co2e.toFixed(1)} kg CO₂e — above the 50 kg threshold.`,
        recommendedAction:
          'Consider switching to a hybrid or electric refrigerated vehicle for this route.',
      });
    }

    // Sort: CRITICAL first, then WARNING, then AI, then ATTENTION, then RESOLVED
    const order: Record<string, number> = {
      CRITICAL: 0,
      WARNING: 1,
      AI: 2,
      ATTENTION: 3,
      RESOLVED: 4,
    };
    alerts.sort((a, b) => (order[a.severity] ?? 5) - (order[b.severity] ?? 5));

    return alerts;
  };

  const allAlerts = generateAlerts();

  // ── Filtering ──────────────────────────────────────────────────────────────
  const displayAlerts =
    filter === 'ALL' ? allAlerts : allAlerts.filter(a => a.severity === filter);

  // ── Counts ─────────────────────────────────────────────────────────────────
  const counts = {
    CRITICAL: allAlerts.filter(a => a.severity === 'CRITICAL').length,
    WARNING: allAlerts.filter(a => a.severity === 'WARNING').length,
    AI: allAlerts.filter(a => a.severity === 'AI').length,
    ATTENTION: allAlerts.filter(a => a.severity === 'ATTENTION').length,
    RESOLVED: allAlerts.filter(a => a.severity === 'RESOLVED').length,
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return <ShieldAlert className="h-5 w-5 text-red-400" />;
      case 'WARNING':  return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'AI':       return <span className="text-lg">🤖</span>;
      case 'ATTENTION':return <Info className="h-5 w-5 text-cyan-400" />;
      case 'RESOLVED': return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      default:         return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  const getCardStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':  return 'border-red-500/30 bg-red-500/5';
      case 'WARNING':   return 'border-amber-500/30 bg-amber-500/5';
      case 'AI':        return 'border-purple-500/30 bg-purple-500/5';
      case 'ATTENTION': return 'border-cyan-500/30 bg-cyan-500/5';
      case 'RESOLVED':  return 'border-emerald-500/30 bg-emerald-500/5';
      default:          return 'border-slate-700/40 bg-slate-800/40';
    }
  };

  const getBadgeStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':  return 'text-red-400 bg-red-500/15 border border-red-500/30';
      case 'WARNING':   return 'text-amber-400 bg-amber-500/15 border border-amber-500/30';
      case 'AI':        return 'text-purple-300 bg-purple-500/15 border border-purple-500/30';
      case 'ATTENTION': return 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/30';
      case 'RESOLVED':  return 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30';
      default:          return 'text-slate-400 bg-slate-800';
    }
  };

  const getBadgeLabel = (sev: string) => sev === 'AI' ? 'AI AGENT' : sev;

  // ── Filter pills ───────────────────────────────────────────────────────────
  const filterOptions = [
    { key: 'ALL',       label: 'All',       count: allAlerts.length,   color: 'text-slate-300' },
    { key: 'CRITICAL',  label: 'Critical',  count: counts.CRITICAL,    color: 'text-red-400' },
    { key: 'WARNING',   label: 'Warning',   count: counts.WARNING,     color: 'text-amber-400' },
    { key: 'AI',        label: 'AI Agent',  count: counts.AI,          color: 'text-purple-300' },
    { key: 'ATTENTION', label: 'Attention', count: counts.ATTENTION,   color: 'text-cyan-400' },
    { key: 'RESOLVED',  label: 'Resolved',  count: counts.RESOLVED,    color: 'text-emerald-400' },
  ];

  return (
    <div className="p-8 max-w-4xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 border-b border-[#1e3056] pb-6">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center">
          <Bell className="h-8 w-8 text-cyan-400 mr-3" />
          <span>Alert Center</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Real-time cold-chain compliance alarms, heat excursions, and safety hazard notifications.
        </p>
      </div>

      {activeRoute ? (
        <>
          {/* ── Summary bar ───────────────────────────────────────────── */}
          <div
            className="rounded-xl border p-4 mb-6 flex items-center gap-6 flex-wrap"
            style={{ background: 'rgba(15,23,42,0.85)', borderColor: 'rgba(30,48,86,0.8)' }}
          >
            <div className="flex items-center gap-2 mr-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Filter</span>
            </div>
            {filterOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  filter === opt.key
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                    : 'border-[#1e3056] text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className={opt.color}>{opt.label}</span>
                {opt.count > 0 && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      opt.key === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      opt.key === 'WARNING'  ? 'bg-amber-500/20 text-amber-400' :
                      opt.key === 'AI'       ? 'bg-purple-500/20 text-purple-300' :
                      opt.key === 'ATTENTION'? 'bg-cyan-500/20 text-cyan-400' :
                      opt.key === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Alert cards ───────────────────────────────────────────── */}
          {displayAlerts.length === 0 ? (
            <div
              className="p-10 rounded-xl border border-dashed text-center"
              style={{ borderColor: 'rgba(30,48,86,0.8)' }}
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No alerts for this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-5 rounded-xl border flex items-start gap-4 transition-all duration-200 hover:scale-[1.005] ${getCardStyle(alert.severity)}`}
                >
                  {/* Icon box */}
                  <div
                    className="mt-0.5 p-2 rounded-lg border flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'rgba(6,12,30,0.7)', borderColor: 'rgba(30,48,86,0.7)' }}
                  >
                    {getIcon(alert.severity)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2 min-w-0">
                    {/* Badge + Time */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wider uppercase ${getBadgeStyle(alert.severity)}`}
                      >
                        {getBadgeLabel(alert.severity)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold flex-shrink-0">
                        {alert.time}
                      </span>
                    </div>

                    {/* Message */}
                    <h4 className="font-bold text-white text-sm leading-snug">{alert.message}</h4>

                    {/* Shipment + Location */}
                    <p className="text-xs text-slate-400">
                      Shipment: <span className="text-slate-200 font-semibold">{alert.shipment}</span>
                      {' '}|{' '}
                      Location: <span className="text-slate-200 font-semibold">{alert.location.split(',')[0]}</span>
                    </p>

                    {/* Recommended Action */}
                    <div
                      className="p-3 rounded-lg border text-xs leading-relaxed"
                      style={{ background: 'rgba(6,12,30,0.6)', borderColor: 'rgba(30,48,86,0.7)' }}
                    >
                      <span className="font-semibold text-cyan-400">Recommended Action: </span>
                      <span className="text-slate-300">{alert.recommendedAction}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Empty state ──────────────────────────────────────────────── */
        <div
          className="p-12 rounded-xl border border-dashed text-center"
          style={{ borderColor: 'rgba(30,48,86,0.8)' }}
        >
          <Bell className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h4 className="font-bold text-white text-lg">Alert Log Empty.</h4>
          <p className="text-sm text-slate-400 mt-2">
            No compliance alerts are currently registered. Plan a new shipment to monitor active cold-chain violations.
          </p>
        </div>
      )}
    </div>
  );
};
