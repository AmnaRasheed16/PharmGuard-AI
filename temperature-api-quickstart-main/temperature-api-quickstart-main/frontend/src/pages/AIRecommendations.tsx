import React from 'react';
import { RoutePlanResponse, AIRecommendation, RouteDetail } from '../types';
import { ShieldCheck, AlertTriangle, CheckCircle, Clock, Thermometer, MapPin, Zap } from 'lucide-react';

interface AIRecommendationsProps {
  plannedData: RoutePlanResponse | null;
  plannedMetadata: any | null;
}

// ─── Priority badge ───────────────────────────────────────────────────────────
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const isHigh = priority === 'HIGH';
  return (
    <span
      className={`text-[9px] font-extrabold px-2 py-0.5 rounded border tracking-wider ${
        isHigh
          ? 'text-red-400 bg-red-500/10 border-red-500/30'
          : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      }`}
    >
      {priority}
    </span>
  );
};

// ─── Action type icon ─────────────────────────────────────────────────────────
const ActionIcon: React.FC<{ type: string }> = ({ type }) => {
  const cls = 'w-4 h-4 flex-shrink-0';
  if (type === 'WORKER_SAFETY') return <Thermometer className={cls + ' text-red-400'} />;
  if (type === 'CARGO_PROTECTION') return <ShieldCheck className={cls + ' text-cyan-400'} />;
  if (type === 'RE-TIME') return <Clock className={cls + ' text-amber-400'} />;
  return <MapPin className={cls + ' text-purple-400'} />;
};

// ─── Main component ───────────────────────────────────────────────────────────
export const AIRecommendations: React.FC<AIRecommendationsProps> = ({ plannedData }) => {
  if (!plannedData) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto space-y-6 mt-16">
        <div className="text-7xl animate-bounce">🤖</div>
        <h2 className="text-2xl font-bold text-white">No Route Data Yet</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Plan a route first to see the AI Climate Agent's full analysis log — optimal route
          selection, thermal justification, and agent directives.
        </p>
      </div>
    );
  }

  const aiRec: AIRecommendation = plannedData.ai_recommendation;
  const routes: RouteDetail[] = plannedData.routes;
  const bestRoute = routes.find(r => r.route_id === aiRec.recommended_route_id) || routes[0];

  const riskColor =
    aiRec.risk_level === 'LOW'
      ? 'text-emerald-400'
      : aiRec.risk_level === 'MODERATE'
      ? 'text-amber-400'
      : 'text-red-400';

  const decisionBasisText =
    'The Climate Agent assigns a 30% weight to safe temperature deviation, 20% to ambient heat indexes, ' +
    '20% to compliance limits, 10% to routing times, 10% to worker safety indexes, and 10% to carbon footprint. ' +
    'Calculations are autorun on real-time inputs.';

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
          <span className="text-cyan-400 text-3xl">🤖</span> AI Climate Agent Log
        </h1>
        <p className="text-slate-400 text-sm">
          Review automated decisions, safety rationale, and carbon-minimizing route configurations.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* Optimal Cold-Chain Solution card */}
          <div
            className="rounded-2xl border p-6 space-y-5"
            style={{ background: 'rgba(15,23,42,0.85)', borderColor: 'rgba(30,48,86,0.8)' }}
          >
            {/* Header row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-[10px] font-extrabold tracking-widest px-3 py-1 rounded-full border"
                style={{
                  color: '#22c55e',
                  background: 'rgba(34,197,94,0.12)',
                  borderColor: 'rgba(34,197,94,0.3)',
                }}
              >
                OPTIMAL COLD-CHAIN SOLUTION
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ID: {aiRec.recommended_route_id?.toUpperCase()}
              </span>
            </div>

            {/* Route name */}
            <div>
              <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                🏆 {aiRec.recommended_route_name}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed mt-2 max-w-2xl">
                {aiRec.expected_impact}
              </p>
            </div>

            {/* Optimization Log Details */}
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">
                Optimization Log Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {aiRec.rationale.map((item: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Thermal & Risk Justification */}
          <div
            className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'rgba(15,23,42,0.85)', borderColor: 'rgba(30,48,86,0.8)' }}
          >
            <h3 className="text-base font-extrabold text-white">Thermal &amp; Risk Justification</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {aiRec.risk_explanation}
            </p>

            {/* Decision Basis */}
            <div
              className="rounded-xl p-4 border"
              style={{ background: 'rgba(6,182,212,0.07)', borderColor: 'rgba(6,182,212,0.2)' }}
            >
              <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider">
                Decision Basis:{' '}
              </span>
              <span className="text-xs text-slate-300">{decisionBasisText}</span>
            </div>

            {/* Warnings (if any) */}
            {aiRec.warnings && aiRec.warnings.length > 0 && (
              <div className="space-y-2">
                {aiRec.warnings.map((w: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-lg border"
                    style={{ background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.2)' }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-red-300">{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comparative Route Evaluations */}
          <div
            className="rounded-2xl border p-6 space-y-4"
            style={{ background: 'rgba(15,23,42,0.85)', borderColor: 'rgba(30,48,86,0.8)' }}
          >
            <h3 className="text-base font-extrabold text-white">Comparative Route Evaluations</h3>

            <div className="space-y-3">
              {routes.map((route: RouteDetail) => {
                const isRecommended = route.route_id === aiRec.recommended_route_id;
                const riskNum = route.risk_score;
                const riskCol =
                  riskNum < 25
                    ? 'text-emerald-400'
                    : riskNum < 50
                    ? 'text-amber-400'
                    : 'text-red-400';

                return (
                  <div
                    key={route.route_id}
                    className={`rounded-xl p-4 border flex items-center justify-between gap-4 transition-all ${
                      isRecommended
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-[#1e3056]/60 bg-[rgba(15,23,42,0.5)]'
                    }`}
                  >
                    {/* Left: name + badge + distance */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-white">{route.route_name}</span>
                        {isRecommended && (
                          <span
                            className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border tracking-wider"
                            style={{
                               color: '#22c55e',
                               background: 'rgba(34,197,94,0.12)',
                               borderColor: 'rgba(34,197,94,0.3)',
                            }}
                          >
                            RECOMMENDED OPTION
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {route.distance_km.toFixed(2)} km | {Math.round(route.duration_minutes)} mins duration
                      </div>
                    </div>

                    {/* Right: stats */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">
                          Compliance
                        </div>
                        <div className="text-sm font-extrabold text-white">
                          {route.compliance_percentage.toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">
                          CO₂
                        </div>
                        <div className="text-sm font-extrabold text-white">
                          {route.carbon_emissions_co2e.toFixed(2)} kg
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">
                          Pharma Risk
                        </div>
                        <div className={`text-sm font-extrabold ${riskCol}`}>
                          {riskNum.toFixed(1)}/100
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confidence & Summary */}
          <div
            className="rounded-2xl border p-6 space-y-3"
            style={{ background: 'rgba(15,23,42,0.85)', borderColor: 'rgba(30,48,86,0.8)' }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> Agent Confidence
              </h3>
              <span className={`text-xl font-extrabold ${riskColor}`}>
                {aiRec.confidence}% — {aiRec.risk_level} Risk
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{aiRec.summary}</p>
          </div>
        </div>

        {/* ── Right panel: Agent Directives ────────────────────────────── */}
        <div
          className="w-72 flex-shrink-0 rounded-2xl border p-5 space-y-4 sticky top-6"
          style={{ background: 'rgba(15,23,42,0.85)', borderColor: 'rgba(30,48,86,0.8)' }}
        >
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> Agent Directives
          </h3>

          <div className="space-y-3">
            {aiRec.recommended_actions?.map((act, idx) => (
              <div
                key={idx}
                className="rounded-xl border p-3 space-y-2"
                style={{ background: 'rgba(6,18,40,0.7)', borderColor: 'rgba(30,48,86,0.6)' }}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ActionIcon type={act.action_type} />
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-wide leading-tight">
                      {act.title}
                    </span>
                  </div>
                  <PriorityBadge priority={act.priority} />
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-300 leading-relaxed">{act.description}</p>

                {/* Benefit */}
                {act.expected_benefit && (
                  <p className="text-[10px] text-slate-500">
                    <span className="text-cyan-500 font-bold">Benefit:</span> {act.expected_benefit}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
