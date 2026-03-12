import React from 'react';
import { useApp } from '../App.jsx';

/* ── SVG Icon Components ── */
const IconGrid = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconList = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <circle cx="3.5" cy="6" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="3.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="3.5" cy="18" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconBarChart = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/>
    <rect x="17" y="3" width="4" height="18" rx="1"/>
  </svg>
);
const IconTarget = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconBell = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconUsers = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconMonitor = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconFileText = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconPin = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l2.4 6H21l-5.4 4 2.1 6.5L12 15l-5.7 3.5L8.4 12 3 8h6.6L12 2z"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const NAV_ITEMS = [
  { id: 'overview',     label_pt: 'Visão Geral',    label_en: 'Overview',     Icon: IconGrid },
  { id: 'campaigns',    label_pt: 'Campanhas',       label_en: 'Campaigns',    Icon: IconList },
  { id: 'charts',       label_pt: 'Gráficos',        label_en: 'Charts',       Icon: IconBarChart },
  { id: 'conversions',  label_pt: 'Conversões',      label_en: 'Conversions',  Icon: IconTarget },
  { id: 'alerts',       label_pt: 'Alertas',         label_en: 'Alerts',       Icon: IconBell, badge: true },
  { id: 'audience',     label_pt: 'Público',         label_en: 'Audience',     Icon: IconUsers },
  { id: 'devices',      label_pt: 'Dispositivos',    label_en: 'Devices',      Icon: IconMonitor },
  { id: 'reports',      label_pt: 'Relatórios',      label_en: 'Reports',      Icon: IconFileText },
];

export default function Sidebar({ tab, setTab, collapsed, toggleCollapse, setSelectedCampaign, alertCount }) {
  const { t, lang, pinnedIds, allCampaigns, togglePin } = useApp();
  const pinnedCampaigns = allCampaigns.filter(c => pinnedIds.has(c.id));

  const handleNav = (id) => {
    setTab(id);
    setSelectedCampaign(null);
  };

  const W = collapsed ? 68 : 240;

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
      width: W,
      background: 'var(--bg-sidebar)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden',
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: collapsed ? '18px 16px' : '18px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        minHeight: 68, flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px',
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>M</div>

        {!collapsed && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>Meta Analyst</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', marginTop: 1 }}>Tráfego Automatizado</div>
          </div>
        )}

        <button
          onClick={toggleCollapse}
          style={{
            marginLeft: collapsed ? 'auto' : 0, background: 'rgba(255,255,255,0.07)',
            border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            width: 26, height: 26, borderRadius: 7, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'background var(--t-fast), color var(--t-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map(item => {
          const active = tab === item.id;
          const label = lang === 'en' ? item.label_en : item.label_pt;
          return (
            <button key={item.id} onClick={() => handleNav(item.id)}
              title={collapsed ? label : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: collapsed ? '10px 15px' : '10px 12px',
                background: active ? 'var(--bg-sidebar-active)' : 'transparent',
                border: 'none', cursor: 'pointer',
                borderRadius: 10,
                transition: 'background var(--t-fast)',
                textAlign: 'left', marginBottom: 2,
                color: active ? '#818cf8' : 'rgba(255,255,255,0.42)',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Active left bar */}
              {active && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: 3, borderRadius: '0 3px 3px 0',
                  background: 'var(--accent)',
                }} />
              )}

              <span style={{ flexShrink: 0, position: 'relative', display: 'flex', color: active ? '#818cf8' : 'rgba(255,255,255,0.38)' }}>
                <item.Icon />
                {item.badge && alertCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -7,
                    background: '#ef4444', color: 'white',
                    fontSize: '9px', fontWeight: 800, minWidth: 15, height: 15,
                    borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1, border: '1.5px solid var(--bg-sidebar)',
                  }}>{alertCount > 99 ? '99+' : alertCount}</span>
                )}
              </span>

              {!collapsed && (
                <span style={{
                  fontSize: '13px', fontWeight: active ? 600 : 400,
                  color: active ? '#c7d2fe' : 'rgba(255,255,255,0.45)',
                  whiteSpace: 'nowrap', flex: 1,
                  letterSpacing: active ? '-0.1px' : 0,
                }}>
                  {label}
                </span>
              )}

              {!collapsed && item.badge && alertCount > 0 && (
                <span style={{
                  background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 700,
                  minWidth: 18, height: 18, borderRadius: 99,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>
          );
        })}

        {/* ── Pinned campaigns ── */}
        {!collapsed && pinnedCampaigns.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 6, paddingLeft: 12, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <IconPin /> Fixadas ({pinnedCampaigns.length})
            </div>
            {pinnedCampaigns.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 8,
              }}>
                <span style={{
                  fontSize: '11px', color: 'rgba(255,255,255,0.35)', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                }} title={c.name}>{c.name}</span>
                <button onClick={() => togglePin(c.id)} style={{
                  background: 'none', border: 'none', color: '#fbbf24',
                  cursor: 'pointer', fontSize: '12px', padding: '1px', flexShrink: 0, opacity: 0.8,
                }}>★</button>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ── User footer ── */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: 'white',
          boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
        }}>AM</div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>Andreia Muller</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap' }}>Administrador</div>
          </div>
        )}
      </div>
    </aside>
  );
}
