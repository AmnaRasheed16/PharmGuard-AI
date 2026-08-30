import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { RoutePlanResponse } from '../types';
import { Play, MapPin, Plus, Trash2, Calendar, Clock, Shield, Search, CheckCircle, Loader } from 'lucide-react';

interface RoutePlanningProps {
  onRoutePlanned: (data: RoutePlanResponse, metadata: any) => void;
  setActiveTab: (tab: string) => void;
}

interface StopInput {
  name: string;
  latitude: string;
  longitude: string;
}

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

// ─── Reusable place-search input with Nominatim autocomplete ────────────────
interface PlaceSearchInputProps {
  label: string;
  labelColor?: string;
  value: string;
  lat: string;
  lon: string;
  onSelect: (name: string, lat: string, lon: string) => void;
  required?: boolean;
  placeholder?: string;
}

const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  label, labelColor = 'text-brandCyan', value, lat, lon,
  onSelect, required = false, placeholder = 'Search for a place...'
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(!!lat);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep query in sync when parent resets
  useEffect(() => { setQuery(value); setConfirmed(!!lat); }, [value, lat]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: GeoResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setConfirmed(false);
    onSelect(v, '', '');           // clear coords until user picks from list
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  const handlePick = (r: GeoResult) => {
    const shortName = r.display_name.split(',').slice(0, 3).join(',').trim();
    setQuery(shortName);
    setConfirmed(true);
    setOpen(false);
    setResults([]);
    onSelect(shortName, parseFloat(r.lat).toFixed(4), parseFloat(r.lon).toFixed(4));
  };

  return (
    <div ref={wrapperRef} className="space-y-1.5 relative">
      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${labelColor}`}>{label}</span>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          className="w-full pl-8 pr-8 text-xs"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          required={required && !lat}
          autoComplete="off"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {searching && <Loader className="h-3.5 w-3.5 text-slate-400 animate-spin" />}
          {!searching && confirmed && lat && (
            <CheckCircle className="h-3.5 w-3.5 text-brandGreen" />
          )}
        </div>
      </div>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#0d1a2e] border border-[#1e3056] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handlePick(r)}
              className="w-full text-left px-3 py-2.5 text-[11px] text-slate-300 hover:bg-brandCyan/10 hover:text-white flex items-start gap-2 border-b border-[#1e3056]/50 last:border-0 transition"
            >
              <MapPin className="h-3 w-3 text-brandCyan mt-0.5 shrink-0" />
              <span className="leading-tight">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Confirmed coords badge */}
      {confirmed && lat && lon && (
        <div className="flex gap-2">
          <span className="text-[10px] font-mono text-slate-500 bg-darkBg/60 border border-[#1e3056] rounded px-2 py-0.5">
            {lat}
          </span>
          <span className="text-[10px] font-mono text-slate-500 bg-darkBg/60 border border-[#1e3056] rounded px-2 py-0.5">
            {lon}
          </span>
        </div>
      )}
      {!confirmed && lat === '' && query.length > 1 && !searching && (
        <p className="text-[10px] text-brandWarning">⚠ Select a result from the list to confirm location</p>
      )}
    </div>
  );
};

// ─── Stop search row ─────────────────────────────────────────────────────────
interface StopSearchRowProps {
  idx: number;
  stop: StopInput;
  onUpdate: (idx: number, name: string, lat: string, lon: string) => void;
  onRemove: (idx: number) => void;
}

const StopSearchRow: React.FC<StopSearchRowProps> = ({ idx, stop, onUpdate, onRemove }) => {
  const [query, setQuery] = useState(stop.name);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(!!stop.latitude);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(stop.name); setConfirmed(!!stop.latitude); }, [stop.name, stop.latitude]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: GeoResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setConfirmed(false);
    onUpdate(idx, v, '', '');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 350);
  };

  const handlePick = (r: GeoResult) => {
    const shortName = r.display_name.split(',').slice(0, 3).join(',').trim();
    setQuery(shortName);
    setConfirmed(true);
    setOpen(false);
    setResults([]);
    onUpdate(idx, shortName, parseFloat(r.lat).toFixed(4), parseFloat(r.lon).toFixed(4));
  };

  return (
    <div ref={wrapperRef} className="relative bg-[#091124]/40 p-2.5 border border-[#1e3056] rounded-lg space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold bg-[#0d1a2e] border border-[#1e3056] px-2 py-1 rounded text-slate-400 font-mono shrink-0">
          {idx + 1}
        </span>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          <input
            placeholder="Search stop location..."
            className="text-xs w-full pl-6 pr-6"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            autoComplete="off"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {searching && <Loader className="h-3 w-3 text-slate-400 animate-spin" />}
            {!searching && confirmed && <CheckCircle className="h-3 w-3 text-brandGreen" />}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="p-1.5 text-brandCritical hover:bg-brandCritical/10 rounded transition shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Coords badge */}
      {confirmed && stop.latitude && stop.longitude && (
        <div className="flex gap-2 pl-8">
          <span className="text-[10px] font-mono text-slate-500 bg-darkBg/60 border border-[#1e3056] rounded px-2 py-0.5">{stop.latitude}</span>
          <span className="text-[10px] font-mono text-slate-500 bg-darkBg/60 border border-[#1e3056] rounded px-2 py-0.5">{stop.longitude}</span>
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#0d1a2e] border border-[#1e3056] rounded-xl shadow-2xl shadow-black/60 overflow-hidden" style={{ top: '100%' }}>
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handlePick(r)}
              className="w-full text-left px-3 py-2.5 text-[11px] text-slate-300 hover:bg-brandCyan/10 hover:text-white flex items-start gap-2 border-b border-[#1e3056]/50 last:border-0 transition"
            >
              <MapPin className="h-3 w-3 text-brandCyan mt-0.5 shrink-0" />
              <span className="leading-tight">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main RoutePlanning page ──────────────────────────────────────────────────
export const RoutePlanning: React.FC<RoutePlanningProps> = ({ onRoutePlanned, setActiveTab }) => {
  const [medicineName, setMedicineName] = useState('');
  const [cargoType, setCargoType] = useState('Refrigerated (2-8°C)');
  const [tempMin, setTempMin] = useState('2.0');
  const [tempMax, setTempMax] = useState('8.0');
  const [cargoLoad, setCargoLoad] = useState('150');
  const [vehicleType, setVehicleType] = useState('Diesel Light Van');
  const [refrigerationType, setRefrigerationType] = useState('Active Refrigeration (Diesel)');

  const [originName, setOriginName] = useState('');
  const [originLat, setOriginLat] = useState('');
  const [originLon, setOriginLon] = useState('');

  const [destName, setDestName] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLon, setDestLon] = useState('');

  const [stops, setStops] = useState<StopInput[]>([]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const LOADING_STEPS = [
    '🛰️ Fetching live weather data...',
    '🌡️ Querying FortyGuard environmental API...',
    '📍 Analysing stops for heat & risk...',
    '🧭 Comparing 3 route alternatives...',
    '🤖 AI Climate Agent scoring routes...',
  ];

  const addStop = () => setStops([...stops, { name: '', latitude: '', longitude: '' }]);

  const removeStop = (idx: number) => setStops(stops.filter((_, i) => i !== idx));

  const updateStop = (idx: number, name: string, lat: string, lon: string) => {
    const updated = [...stops];
    updated[idx] = { name, latitude: lat, longitude: lon };
    setStops(updated);
  };

  const canSubmit = originLat && originLon && destLat && destLon &&
    stops.every(s => s.latitude && s.longitude);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError('Please select all locations from the search results to confirm their coordinates.');
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    setError(null);

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 3500);

    const startDateTime = `${date}T${time}:00`;
    const payload = {
      origin_name: originName,
      origin_lat: parseFloat(originLat),
      origin_lon: parseFloat(originLon),
      destination_name: destName,
      destination_lat: parseFloat(destLat),
      destination_lon: parseFloat(destLon),
      stops: stops
        .filter(s => s.name && s.latitude && s.longitude)
        .map(s => ({
          name: s.name,
          latitude: parseFloat(s.latitude),
          longitude: parseFloat(s.longitude),
        })),
      delivery_date: date,
      start_time: startDateTime,
      temp_min_required: parseFloat(tempMin),
      temp_max_required: parseFloat(tempMax),
      vehicle_type: vehicleType,
      refrigeration_type: refrigerationType,
      cargo_load_kg: parseFloat(cargoLoad),
      medicine_name: medicineName,
      cargo_type: cargoType,
    };

    try {
      const data = await api.planRoute(payload);
      clearInterval(stepInterval);
      onRoutePlanned(data, payload);
      setActiveTab('dashboard');
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'An error occurred during route planning.');
    } finally {
      setLoading(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="border-b border-[#1e3056] pb-6">
        <h2 className="text-3xl font-extrabold text-white flex items-center">
          <MapPin className="h-8 w-8 text-brandCyan mr-3" />
          <span>Pharma Cold-Chain Routing</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
           Search for any location in US only - coordinates are filled automatically.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-brandCritical/15 border border-brandCritical/30 rounded-xl text-brandCritical text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cargo & Vehicle */}
        <div className="glass-card p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-[#1e3056] pb-2 uppercase tracking-wide flex items-center gap-2">
            <Shield className="h-4 w-4 text-brandCyan" /> Cargo &amp; Vehicle
          </h3>
          <div className="space-y-3">
            <div>
              <label>Medicine Name</label>
              <input
                className="w-full mt-1"
                placeholder="e.g. Insulin, Vaccines..."
                value={medicineName}
                onChange={e => setMedicineName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Cargo Type Category</label>
              <input
                className="w-full mt-1"
                value={cargoType}
                onChange={e => setCargoType(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label>Min Temp (°C)</label>
                <input type="number" step="0.1" className="w-full mt-1" value={tempMin} onChange={e => setTempMin(e.target.value)} required />
              </div>
              <div>
                <label>Max Temp (°C)</label>
                <input type="number" step="0.1" className="w-full mt-1" value={tempMax} onChange={e => setTempMax(e.target.value)} required />
              </div>
            </div>
            <div>
              <label>Cargo Load (kg)</label>
              <input type="number" className="w-full mt-1" value={cargoLoad} onChange={e => setCargoLoad(e.target.value)} required />
            </div>
            <div>
              <label>Vehicle Type</label>
              <select className="w-full mt-1" value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
                <option>Diesel Light Van</option>
                <option>Electric Light Van</option>
                <option>Diesel Heavy Truck</option>
              </select>
            </div>
            <div>
              <label>Refrigeration System</label>
              <select className="w-full mt-1" value={refrigerationType} onChange={e => setRefrigerationType(e.target.value)}>
                <option>Active Refrigeration (Diesel)</option>
                <option>Active Refrigeration (Electric)</option>
                <option>Passive PCM Container</option>
              </select>
            </div>
          </div>
        </div>

        {/* Route Locations */}
        <div className="glass-card p-6 rounded-xl space-y-5 md:col-span-2">
          <h3 className="text-sm font-bold text-white border-b border-[#1e3056] pb-2 uppercase tracking-wide flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brandCyan" /> Route Locations
          </h3>

          <div className="space-y-4">
            {/* Origin & Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-darkBg/30 rounded-lg border border-[#1e3056]">
                <PlaceSearchInput
                  label="Origin (Start)"
                  labelColor="text-brandCyan"
                  value={originName}
                  lat={originLat}
                  lon={originLon}
                  placeholder="Search origin location..."
                  required
                  onSelect={(name, lat, lon) => {
                    setOriginName(name);
                    setOriginLat(lat);
                    setOriginLon(lon);
                  }}
                />
              </div>
              <div className="p-3 bg-darkBg/30 rounded-lg border border-[#1e3056]">
                <PlaceSearchInput
                  label="Destination (End)"
                  labelColor="text-brandCritical"
                  value={destName}
                  lat={destLat}
                  lon={destLon}
                  placeholder="Search destination location..."
                  required
                  onSelect={(name, lat, lon) => {
                    setDestName(name);
                    setDestLat(lat);
                    setDestLon(lon);
                  }}
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Delivery Date</label>
                <input type="date" className="w-full mt-1" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div>
                <label className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Start Time</label>
                <input type="time" className="w-full mt-1" value={time} onChange={e => setTime(e.target.value)} required />
              </div>
            </div>

            {/* Transit Stops */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  Transit Stops ({stops.length})
                </span>
                <button
                  type="button"
                  onClick={addStop}
                  className="px-2 py-1 bg-brandCyan/10 hover:bg-brandCyan/20 text-brandCyan text-[10px] font-extrabold uppercase rounded border border-brandCyan/30 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Stop
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {stops.length === 0 && (
                  <p className="text-[11px] text-slate-500 text-center py-3 border border-dashed border-[#1e3056] rounded-lg">
                    No transit stops added. Click "+ Add Stop" to add one.
                  </p>
                )}
                {stops.map((stop, idx) => (
                  <StopSearchRow
                    key={idx}
                    idx={idx}
                    stop={stop}
                    onUpdate={updateStop}
                    onRemove={removeStop}
                  />
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 border-t border-[#1e3056]/50">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-brandCyan to-brandCyan/80 hover:from-brandCyan hover:to-brandCyan text-darkBg font-extrabold uppercase rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-brandCyan/10 transition disabled:opacity-90"
              >
                {loading ? (
                  <span className="flex flex-col items-center gap-1 py-0.5">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      <span className="text-xs font-bold">{LOADING_STEPS[loadingStep]}</span>
                    </span>
                    <span className="flex gap-1 mt-0.5">
                      {LOADING_STEPS.map((_, i) => (
                        <span key={i} className={`h-1 w-5 rounded-full transition-all duration-500 ${
                          i <= loadingStep ? 'bg-darkBg' : 'bg-darkBg/30'
                        }`} />
                      ))}
                    </span>
                  </span>
                ) : (
                  <>
                    <Play className="h-5 w-5 fill-current" /> Plan Cold-Chain Route
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};