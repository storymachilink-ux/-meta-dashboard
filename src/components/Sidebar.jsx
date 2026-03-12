import React from 'react';
import { useApp } from '../App.jsx';

const NAV_ITEMS = [
  { id: 'overview', icon: '⊞', iconActive: '⊞' },
  { id: 'campaigns', icon: '📋', iconActive: '📋' },
  { id: 'charts', icon: '📈', iconActive: '📈' },
  { id: 'conversions', icon: '🎯', iconActive: '🎯' },
  { id: 'audience', icon: '👥', iconActive: '👥' },
  { id: 'devices', icon: '📱', iconActive: '📱' },
  { id: 'reports', icon: '✉️', iconActive: '✉️' },
];

export default function Sidebar({ tab, setTab, collapsed, toggleCollapse, setSelectedCampaign }) {
  const { t, pinnedIds, allCampaigns, togglePin } = useApp();

  const pinnedCampaigns = allCampaigns.filter(c => pinnedIds.has(c.id));

  const handleNav = (id) => {
    setTab(id);
    setSelectedCampaign(null);
  };

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
      width: collapsed ? 72 : 240,
      background: '#0f172a',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease',
      boxShadow: '2px 0 12px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 16px' : '20px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #1e293b', minHeight: 72 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #1877F2, #42a5f5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 900, color: 'white', letterSpacing: '-1px',
        }}>M</div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>{t.appName}</div>
            <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>{t.appSub}</div>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px', padding: '4px', flexShrink: 0, display: collapsed ? 'none' : 'block' }}
          title="Recolher"
        >⟨</button>
      </div>
      {collapsed && (
        <button onClick={toggleCollapse} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px', padding: '8px', textAlign: 'center' }}>⟩</button>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map(item => {
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => handleNav(item.id)}
              title={collapsed ? t.nav[item.id] : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: collapsed ? '12px 18px' : '11px 20px',
                background: active ? 'rgba(99,102,241,0.15)' : 'none',
                border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none'; }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <span style={{ fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? '#818cf8' : '#94a3b8', whiteSpace: 'nowrap' }}>
                  {t.nav[item.id]}
                </span>
              )}
            </button>
          );
        })}

        {/* Pinned campaigns section */}
        {!collapsed && pinnedCampaigns.length > 0 && (
          <div style={{ marginTop: '16px', padding: '0 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', padding: '0 4px' }}>
              ★ {t.pinned} ({pinnedCampaigns.length})
            </div>
            {pinnedCampaigns.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 4px', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</span>
                <button onClick={() => togglePin(c.id)} style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '12px', padding: '1px', flexShrink: 0 }}>★</button>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom user */}
      <div style={{ padding: collapsed ? '16px' : '16px 20px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: 'white',
        }}>AM</div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>Andreia Muller</div>
            <div style={{ fontSize: '10px', color: '#475569', whiteSpace: 'nowrap' }}>Admin</div>
          </div>
        )}
      </div>
    </aside>
  );
}
