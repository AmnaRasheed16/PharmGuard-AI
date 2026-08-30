import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { RoutePlanning } from './pages/RoutePlanning';
import { Shipments } from './pages/Shipments';
import { Environmental } from './pages/Environmental';
import { CarbonLens } from './pages/CarbonLens';
import { AIRecommendations } from './pages/AIRecommendations';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { api } from './services/api';
import { RoutePlanResponse } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<string>('route-planning');
  
  const [plannedData, setPlannedData] = useState<RoutePlanResponse | null>(null);
  const [plannedMetadata, setPlannedMetadata] = useState<any | null>(null);
  
  const [fortyguardStatus, setFortyguardStatus] = useState<'LIVE' | 'ERROR' | 'LOADING'>('LOADING');
  const [refreshShipments, setRefreshShipments] = useState(false);

  const checkApiHealth = async () => {
    try {
      const health = await api.getHealth();
      if (health.fortyguard_status === 'LIVE') {
        setFortyguardStatus('LIVE');
      } else {
        setFortyguardStatus('ERROR');
      }
    } catch {
      setFortyguardStatus('ERROR');
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  const handleRoutePlanned = (data: RoutePlanResponse, metadata: any) => {
    setPlannedData(data);
    setPlannedMetadata(metadata);
    if (data.fortyguard_status === 'LIVE') {
      setFortyguardStatus('LIVE');
    }
  };

  const handleLoadShipment = (routeData: RoutePlanResponse, metadata: any) => {
    setPlannedData(routeData);
    setPlannedMetadata(metadata);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            plannedData={plannedData} 
            plannedMetadata={plannedMetadata}
            setActiveTab={setActiveTab}
            onShipmentSaved={() => setRefreshShipments(!refreshShipments)}
            onLoadShipment={handleLoadShipment}
          />
        );
      case 'route-planning':
        return (
          <RoutePlanning 
            onRoutePlanned={handleRoutePlanned} 
            setActiveTab={setActiveTab}
          />
        );
      case 'shipments':
        return (
          <Shipments />
        );
      case 'environmental':
        return <Environmental />;
      case 'carbon-lens':
        return <CarbonLens />;
      case 'ai-recommendations':
        return <AIRecommendations plannedData={plannedData} plannedMetadata={plannedMetadata} />;
      case 'alerts':
        return <Alerts plannedData={plannedData} plannedMetadata={plannedMetadata} />;
      case 'reports':
        return <Reports />;
      case 'reports':
        return <Reports />;
      default:
        return <RoutePlanning onRoutePlanned={handleRoutePlanned} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-darkBg text-slate-100 selection:bg-brandCyan/30 selection:text-white">
      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        fortyguardStatus={fortyguardStatus} 
      />

      {/* Main Panel Content Area */}
      <main className="flex-1 min-h-screen flex flex-col" style={{ marginLeft: 240, width: 'calc(100vw - 240px)', overflowX: 'hidden' }}>

        {/* Dynamic Page Render */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
