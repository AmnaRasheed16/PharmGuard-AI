import React from 'react';

const NAV = [
  { id: 'route-planning',     label: 'Route Planning',      icon: '🗺️' },
  { id: 'dashboard',          label: 'Dashboard',           icon: '📊' },
  { id: 'ai-recommendations', label: 'AI Climate Agent',    icon: '🤖' },
  { id: 'alerts',             label: 'Alerts',              icon: '🔔' },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  fortyguardStatus: 'LIVE' | 'ERROR' | 'LOADING' | 'NO_KEY';
}

export function Sidebar({ activeTab, setActiveTab, fortyguardStatus }: SidebarProps) {
  const statusColor =
    fortyguardStatus === 'LIVE'    ? '#22c55e' :
    fortyguardStatus === 'LOADING' ? '#facc15' : '#ef4444';

  const statusLabel =
    fortyguardStatus === 'LIVE'    ? 'FortyGuard LIVE' :
    fortyguardStatus === 'NO_KEY'  ? 'No API Key' :
    fortyguardStatus === 'LOADING' ? 'Connecting…' : 'API Error';

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: '#0a1628',
      borderRight: '1px solid rgba(96,165,250,0.18)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
      padding: '1.5rem 1rem',
      boxShadow: '4px 0 24px rgba(0,0,0,0.35)',
    }}>

      {/* ── Logo ─────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          fontSize: '1.1rem', fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '-0.02em',
        }}>
          💊 PharmaGuard AI
        </div>
        <div style={{ fontSize: '0.65rem', color: '#FFFFFF', marginTop: 2 }}>
          Cold-Chain Intelligence Platform
        </div>
      </div>

      {/* ── FortyGuard status ─────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(11,29,58,0.7)',
        border: '1px solid rgba(96,165,250,0.18)',
        borderRadius: 8, padding: '0.4rem 0.75rem',
        marginBottom: '1.5rem',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: statusColor, flexShrink: 0,
          boxShadow: `0 0 6px ${statusColor}`,
        }} />
        <span style={{ fontSize: '0.7rem', color: '#a8c5c9', fontWeight: 600 }}>{statusLabel}</span>
      </div>

      {/* ── Nav items ─────────────────────────────────── */}
      <nav style={{ flex: 1 }}>
        {NAV.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', textAlign: 'left',
                padding: '0.6rem 0.75rem', marginBottom: 2,
                borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: '0.825rem',
                fontWeight: isActive ? 700 : 400,
                 background: isActive ? 'rgba(96,165,250,0.15)' : 'transparent',
                 color: isActive ? '#FFFFFF' : '#FFFFFF',
                 transition: 'all 0.15s',
                 boxShadow: isActive ? 'inset 2px 0 0 #60a5fa' : 'none',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Footer ───────────────────────────────────── */}
      <div style={{ fontSize: '0.65rem', color: '#FFFFFF', marginTop: '1rem' }}>
        v1.0 · Real-data only
      </div>
    </aside>
  );
}
