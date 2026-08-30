import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, ShieldCheck, ShieldAlert, Key, Sliders, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Settings as SettingsType } from '../types';

interface SettingsProps {
  onSettingsUpdated: () => void;
  fortyguardStatus: 'LIVE' | 'ERROR' | 'LOADING';
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsUpdated, fortyguardStatus }) => {
  const [apiKey, setApiKey] = useState('');
  
  // Weights State
  const [wTemp, setWTemp] = useState(30);
  const [wHeat, setWHeat] = useState(20);
  const [wComp, setWComp] = useState(20);
  const [wRoute, setWRoute] = useState(10);
  const [wWorker, setWWorker] = useState(10);
  const [wCarbon, setWCarbon] = useState(10);

  const [dbSettings, setDbSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setDbSettings(data);
      
      // Convert 0.3 -> 30 for UI sliders
      setWTemp(Math.round(data.weight_temperature * 100));
      setWHeat(Math.round(data.weight_heat * 100));
      setWComp(Math.round(data.weight_compliance * 100));
      setWRoute(Math.round(data.weight_route * 100));
      setWWorker(Math.round(data.weight_worker * 100));
      setWCarbon(Math.round(data.weight_carbon * 100));
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload: any = {
        weight_temperature: wTemp / 100,
        weight_heat: wHeat / 100,
        weight_compliance: wComp / 100,
        weight_route: wRoute / 100,
        weight_worker: wWorker / 100,
        weight_carbon: wCarbon / 100
      };

      // Only send key if the user entered a value (prevents blanking it out)
      if (apiKey.trim() !== '') {
        payload.fortyguard_api_key = apiKey;
      }

      const updated = await api.updateSettings(payload);
      setDbSettings(updated);
      setApiKey(''); // clear key input
      setSaveSuccess(true);
      onSettingsUpdated();
      
      // Normalize values in local UI in case backend normalized them
      setWTemp(Math.round(updated.weight_temperature * 100));
      setWHeat(Math.round(updated.weight_heat * 100));
      setWComp(Math.round(updated.weight_compliance * 100));
      setWRoute(Math.round(updated.weight_route * 100));
      setWWorker(Math.round(updated.weight_worker * 100));
      setWCarbon(Math.round(updated.weight_carbon * 100));

      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalWeight = wTemp + wHeat + wComp + wRoute + wWorker + wCarbon;

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 border-b border-[#1e3056] pb-6">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center">
          <SettingsIcon className="h-8 w-8 text-brandCyan mr-3" />
          <span>System Settings</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure API credentials and customize risk scoring weights on the backend.
        </p>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-brandCyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Section 1: FortyGuard Key Configuration */}
          <div className="glass-card p-6 rounded-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1e3056] pb-2">
              <Key className="h-5 w-5 text-brandCyan" />
              <h3 className="text-base font-bold text-white">FortyGuard API Credentials</h3>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-[#0d162b] rounded-lg border border-[#1e3056]">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Credential Status</span>
                {dbSettings?.fortyguard_api_key_configured ? (
                  <p className="text-sm font-bold text-brandGreen flex items-center">
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    FortyGuard API Key Configured (Stored Securely)
                  </p>
                ) : (
                  <p className="text-sm font-bold text-brandWarning flex items-center">
                    <ShieldAlert className="h-4 w-4 mr-1.5" />
                    No API Key Registered
                  </p>
                )}
              </div>
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  fortyguardStatus === 'LIVE' 
                    ? 'bg-brandGreen/10 text-brandGreen border-brandGreen/20' 
                    : 'bg-brandCritical/10 text-brandCritical border-brandCritical/20'
                }`}>
                  {fortyguardStatus === 'LIVE' ? 'CONNECTION OK' : 'CONNECTION ERROR'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Update FortyGuard API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={dbSettings?.fortyguard_api_key_configured ? '••••••••••••••••••••••••••••••••' : 'Enter FortyGuard API Key'}
                className="w-full bg-[#091124] border border-[#1e3056] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brandCyan"
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                Leave empty to retain previously stored key. Keys are saved in the database on the backend and are never returned to the browser.
              </p>
            </div>
          </div>

          {/* Section 2: Weight Configuration */}
          <div className="glass-card p-6 rounded-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#1e3056] pb-2">
              <Sliders className="h-5 w-5 text-brandCyan" />
              <h3 className="text-base font-bold text-white">Risk Score Optimization Weights</h3>
            </div>
            <p className="text-xs text-slate-400">
              Customize the weights for the 0-100 Pharma Risk Score. Weights will automatically normalize to sum to 100% on the backend.
            </p>

            <div className="space-y-4 pt-2">
              {/* Weight 1: Temperature */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Temperature Deviation (safe range limit excursions)</span>
                  <span className="font-mono text-brandCyan font-bold">{wTemp}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wTemp}
                  onChange={(e) => setWTemp(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#091124] rounded-lg appearance-none cursor-pointer accent-brandCyan"
                />
              </div>

              {/* Weight 2: Heat */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Ambient Heat Exposure (max stop apparent index)</span>
                  <span className="font-mono text-brandCyan font-bold">{wHeat}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wHeat}
                  onChange={(e) => setWHeat(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#091124] rounded-lg appearance-none cursor-pointer accent-brandCyan"
                />
              </div>

              {/* Weight 3: Compliance */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Cold-Chain Compliance Loss</span>
                  <span className="font-mono text-brandCyan font-bold">{wComp}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wComp}
                  onChange={(e) => setWComp(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#091124] rounded-lg appearance-none cursor-pointer accent-brandCyan"
                />
              </div>

              {/* Weight 4: Route */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Transit Duration Risk</span>
                  <span className="font-mono text-brandCyan font-bold">{wRoute}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wRoute}
                  onChange={(e) => setWRoute(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#091124] rounded-lg appearance-none cursor-pointer accent-brandCyan"
                />
              </div>

              {/* Weight 5: Worker */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Worker Heat Stress (Wet-Bulb WBGT values)</span>
                  <span className="font-mono text-brandCyan font-bold">{wWorker}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wWorker}
                  onChange={(e) => setWWorker(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#091124] rounded-lg appearance-none cursor-pointer accent-brandCyan"
                />
              </div>

              {/* Weight 6: Carbon */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Carbon Footprint Impact</span>
                  <span className="font-mono text-brandCyan font-bold">{wCarbon}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wCarbon}
                  onChange={(e) => setWCarbon(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#091124] rounded-lg appearance-none cursor-pointer accent-brandCyan"
                />
              </div>

              {/* Normalization Indicator */}
              <div className="flex justify-between items-center text-xs text-slate-400 border-t border-[#1e3056]/30 pt-3">
                <span>Sum of Slider Weights: <span className="font-mono text-white">{totalWeight}%</span></span>
                <span className="text-[10px] text-slate-500 italic">
                  {totalWeight !== 100 ? 'Backend will normalize weights automatically.' : 'Weights sum exactly to 100%.'}
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving || saveSuccess}
            className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all text-sm tracking-wider uppercase flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 ${
              saveSuccess 
                ? 'bg-brandGreen text-darkBg shadow-brandGreen/20' 
                : 'bg-brandCyan text-darkBg shadow-brandCyan/20 hover:shadow-brandCyan/30'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="animate-spin h-4.5 w-4.5" />
                <span>Saving Credentials &amp; Weights...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>Settings Saved and Applied</span>
              </>
            ) : (
              <span>Save System Settings</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
