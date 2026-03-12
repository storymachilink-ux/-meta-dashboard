import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext.jsx';

const TAB_TITLES = {
  overview:    { pt: 'Visão Geral',    en: 'Overview' },
  campaigns:   { pt: 'Campanhas',      en: 'Campaigns' },
  charts:      { pt: 'Gráficos',       en: 'Charts' },
  conversions: { pt: 'Conversões',     en: 'Conversions' },
  alerts:      { pt: 'Alertas',        en: 'Alerts' },
  audience:    { pt: 'Público',        en: 'Audience' },
  devices:     { pt: 'Dispositivos',   en: 'Devices' },
  reports:     { pt: 'Relatórios',     en: 'Reports' },
};
const TAB_SUBS = {
  overview:    { pt: 'Resumo de performance das campanhas',    en: 'Campaign performance summary' },
  campaigns:   { pt: 'Análise detalhada por campanha',         en: 'Detailed campaign analysis' },
  charts:      { pt: 'Tendências e evolução temporal',         en: 'Trends and time evolution' },
  conversions: { pt: 'Compras, ROAS e receita',                en: 'Purchases, ROAS and revenue' },
  alerts:      { pt: 'Monitoramento automático de campanhas',  en: 'Automated campaign monitoring' },
  audience:    { pt: 'Dados de público e alcance',             en: 'Audience and reach data' },
  devices:     { pt: 'Performance por dispositivo',            en: 'Performance by device' },
  reports:     { pt: 'Exportação e agendamento',               en: 'Export and scheduling' },
};

const ACCOUNTS_OPTS = [
  { value: 'all',            pt: 'Todas as contas',  en: 'All accounts' },
  { value: 'Arcanjo Miguel', pt: 'Arcanjo Miguel',   en: 'Arcanjo Miguel' },
  { value: 'Arcanjo Editr',  pt: 'Arcanjo Editr',    en: 'Arcanjo Editr' },
  { value: 'BM ADSLY01',     pt: 'BM ADSLY01',       en: 'BM ADSLY01' },
  { value: 'Andreia Muller', pt: 'Andreia Muller',   en: 'Andreia Muller' },
  { value: 'Conta Antiga',   pt: 'Conta Antiga',     en: 'Old Account' },
];

const PRESETS = [
  { label: 'Hoje',  days: 1, today: true },
  { label: 'Ontem', yesterday: true },
  { label: '3d',    days: 3 },
  { label: '7d',    days: 7 },
  { label: '15d',   days: 15 },
  { label: '30d',   days: 30 },
  { label: '60d',   days: 60 },
  { label: '90d',   days: 90 },
];

function fmt(dateStr, lang) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
}

/* ── Icon Components ── */
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconRefresh = ({ spinning }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none', display: 'block' }}>
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const IconSync = ({ spinning }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none', display: 'block' }}>
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconSun = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconChevronDown = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'none', display: 'block' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconSettings = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

/* ── Shared input style ── */
const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--text-primary)',
  padding: '7px 12px',
  fontSize: '13px',
  outline: 'none',
  boxShadow: 'var(--shadow-xs)',
  transition: 'border-color var(--t-fast)',
};

export default function TopBar({ lang, setLang, tab, selectedCampaign, setSelectedCampaign }) {
  const {
    t, days, setDays, selectedAccount, setSelectedAccount, pinnedIds, cutoffDate,
    dateMode, setDateMode, customDateStart, setCustomDateStart, customDateEnd, setCustomDateEnd,
    endDate, TODAY, loading, lastUpdated, refreshData, isLive, syncing, triggerSync,
    darkMode, setDarkMode,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(customDateStart || '');
  const [customEnd, setCustomEnd] = useState(customDateEnd || TODAY);
  const dropRef = useRef(null);

  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenStatus, setTokenStatus] = useState(null); // null | 'saving' | 'ok' | 'error'
  const settingsRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const saveToken = async () => {
    if (!tokenInput.trim()) return;
    setTokenStatus('saving');
    try {
      const res = await fetch('/api/admin/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      setTokenStatus('ok');
      setTokenInput('');
      setTimeout(() => setTokenStatus(null), 3000);
    } catch (err) {
      setTokenStatus('error');
      setTimeout(() => setTokenStatus(null), 3000);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyPreset = (d) => {
    setDays(d); setDateMode('relative');
    setCustomDateStart(''); setCustomDateEnd('');
    setOpen(false);
  };

  const applyYesterday = () => {
    const yd = new Date(TODAY); yd.setDate(yd.getDate() - 1);
    const yds = yd.toISOString().slice(0, 10);
    setDateMode('custom'); setCustomDateStart(yds); setCustomDateEnd(yds);
    setCustomStart(yds); setCustomEnd(yds); setDays(1); setOpen(false);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd || customStart > customEnd) return;
    setDateMode('custom'); setCustomDateStart(customStart); setCustomDateEnd(customEnd);
    setDays(diffDays(customStart, customEnd)); setOpen(false);
  };

  const yesterday = (() => { const d = new Date(TODAY); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const isYesterday = dateMode === 'custom' && customDateStart === yesterday && customDateEnd === yesterday;
  const isActive = (d) => dateMode === 'relative' && days === d;

  const buttonLabel = () => {
    if (isYesterday) return `Ontem · ${fmt(yesterday, lang)}`;
    if (dateMode === 'custom' && customDateStart && customDateEnd) {
      return `${fmt(customDateStart, lang)} – ${fmt(customDateEnd, lang)} · ${diffDays(customDateStart, customDateEnd)}d`;
    }
    if (days === 1) return `Hoje · ${fmt(TODAY, lang)}`;
    return `${fmt(cutoffDate, lang)} – ${fmt(TODAY, lang)} · ${days}d`;
  };

  const title    = selectedCampaign ? selectedCampaign.name : (TAB_TITLES[tab]?.[lang] || tab);
  const subtitle = selectedCampaign
    ? (lang === 'pt' ? 'Detalhes da campanha' : 'Campaign details')
    : (TAB_SUBS[tab]?.[lang] || '');

  return (
    <header style={{
      background: 'var(--bg-topbar)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 68, flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: 'var(--shadow-sm)',
      transition: 'background var(--t-slow), border-color var(--t-slow)',
    }}>

      {/* ── Left: Title ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {selectedCampaign && (
          <button onClick={() => setSelectedCampaign(null)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', padding: '6px 12px',
            cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500,
            transition: 'all var(--t-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <IconBack /> {t.back}
          </button>
        )}
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.3px' }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>

      {/* ── Right: Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Account filter — custom dropdown (native select breaks dark mode on Windows) */}
        <div style={{ position: 'relative' }} ref={accountRef}>
          <button
            onClick={() => setAccountOpen(p => !p)}
            style={{
              ...inputStyle, minWidth: 148, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 8, cursor: 'pointer',
              background: accountOpen ? 'var(--accent-soft)' : 'var(--bg-input)',
              border: `1px solid ${accountOpen ? 'var(--accent-border)' : 'var(--border-input)'}`,
              color: accountOpen ? 'var(--accent)' : 'var(--text-primary)',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
              {ACCOUNTS_OPTS.find(o => o.value === selectedAccount)?.[lang] || selectedAccount}
            </span>
            <IconChevronDown open={accountOpen} />
          </button>

          {accountOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-popup)',
              zIndex: 400, minWidth: 180, overflow: 'hidden',
              padding: '4px',
            }}>
              {ACCOUNTS_OPTS.map(o => {
                const active = o.value === selectedAccount;
                return (
                  <button key={o.value}
                    onClick={() => { setSelectedAccount(o.value); setAccountOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                      borderRadius: 'var(--r-sm)', textAlign: 'left', fontSize: '13px',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: active ? 700 : 400,
                      transition: 'background var(--t-fast)',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{o[lang]}</span>
                    {active && <span style={{ fontSize: '10px', color: 'var(--accent)' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Date picker */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => setOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: open ? 'var(--accent-soft)' : 'var(--bg-input)',
              border: `1px solid ${open ? 'var(--accent-border)' : 'var(--border-input)'}`,
              borderRadius: 'var(--r-sm)', padding: '7px 12px',
              cursor: 'pointer', fontSize: '13px',
              color: open ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 500,
              whiteSpace: 'nowrap', boxShadow: 'var(--shadow-xs)',
              transition: 'all var(--t-fast)',
            }}
          >
            <span style={{ color: open ? 'var(--accent)' : 'var(--text-muted)' }}><IconCalendar /></span>
            <span>{buttonLabel()}</span>
            <span style={{ color: 'var(--text-muted)' }}><IconChevronDown open={open} /></span>
          </button>

          {open && (
            <div className="dropdown-animate" style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-xl)',
              boxShadow: 'var(--shadow-popup)',
              padding: '16px', zIndex: 300, minWidth: 284,
            }}>
              {/* Quick presets */}
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Acesso rápido
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {PRESETS.map(({ label, days: d, today: isToday, yesterday: isYest }) => {
                  const active = isYest ? isYesterday : (isToday ? isActive(1) : isActive(d));
                  const isSpecial = isToday || isYest;
                  return (
                    <button key={label}
                      onClick={() => isYest ? applyYesterday() : applyPreset(d)}
                      style={{
                        padding: '5px 13px', borderRadius: 99, border: '1.5px solid',
                        borderColor: active ? 'var(--accent)' : 'var(--border)',
                        background: active ? 'var(--accent)' : isSpecial ? 'var(--warning-soft)' : 'var(--bg-subtle)',
                        color: active ? 'white' : isSpecial ? 'var(--warning)' : 'var(--text-secondary)',
                        fontSize: '12px', fontWeight: active ? 700 : 500,
                        cursor: 'pointer', transition: 'all var(--t-fast)',
                        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = isSpecial ? 'var(--warning)' : 'var(--text-secondary)'; }}}
                    >{label}</button>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0 -4px 14px' }} />

              {/* Custom range */}
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Intervalo personalizado
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>De</div>
                    <input type="date" value={customStart} max={customEnd || TODAY}
                      onChange={e => setCustomStart(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <div style={{ color: 'var(--text-disabled)', paddingBottom: 8, fontSize: 12 }}>→</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Até</div>
                    <input type="date" value={customEnd} min={customStart} max={TODAY}
                      onChange={e => setCustomEnd(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                </div>
                {customStart && customEnd && customStart <= customEnd && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {diffDays(customStart, customEnd)} {diffDays(customStart, customEnd) === 1 ? 'dia' : 'dias'} selecionados
                  </div>
                )}
                <button
                  onClick={applyCustom}
                  disabled={!customStart || !customEnd || customStart > customEnd}
                  style={{
                    background: customStart && customEnd && customStart <= customEnd
                      ? 'var(--accent)' : 'var(--bg-subtle)',
                    border: 'none', borderRadius: 'var(--r-md)', padding: '9px',
                    color: customStart && customEnd && customStart <= customEnd ? 'white' : 'var(--text-disabled)',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all var(--t-fast)',
                    boxShadow: customStart && customEnd && customStart <= customEnd
                      ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                  }}
                >Aplicar intervalo</button>
              </div>

              {/* Current info */}
              <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                {isYesterday
                  ? `Exibindo dados de ontem (${fmt(yesterday, lang)})`
                  : dateMode === 'custom'
                    ? `Período: ${fmt(customDateStart, lang)} – ${fmt(customDateEnd, lang)}`
                    : days === 1 ? `Hoje (${fmt(TODAY, lang)})` : `Últimos ${days} dias`
                }
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

        {/* Lang toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', padding: 3, border: '1px solid var(--border)' }}>
          {[['pt', 'PT'], ['en', 'EN']].map(([code, label]) => (
            <button key={code} onClick={() => setLang(code)} style={{
              padding: '4px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: '11px', fontWeight: 700,
              background: lang === code ? 'var(--bg-card)' : 'transparent',
              color: lang === code ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: lang === code ? 'var(--shadow-xs)' : 'none',
              transition: 'all var(--t-fast)',
            }}>{label}</button>
          ))}
        </div>

        {/* Settings (token) */}
        <div style={{ position: 'relative' }} ref={settingsRef}>
          <button
            onClick={() => { setSettingsOpen(p => !p); setTokenStatus(null); }}
            title="Configurações"
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: settingsOpen ? 'var(--accent-soft)' : 'var(--bg-subtle)',
              border: `1px solid ${settingsOpen ? 'var(--accent-border)' : 'var(--border)'}`,
              borderRadius: 'var(--r-sm)', cursor: 'pointer',
              color: settingsOpen ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all var(--t-fast)',
            }}
            onMouseEnter={e => { if (!settingsOpen) { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; } }}
            onMouseLeave={e => { if (!settingsOpen) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            <IconSettings />
          </button>

          {settingsOpen && (
            <div className="dropdown-animate" style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-popup)',
              padding: '16px', zIndex: 300, minWidth: 300,
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                Configurações
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 14 }}>
                Atualizar token da Meta API sem redeploy
              </div>

              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Token Meta API
              </div>
              <input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveToken()}
                placeholder="EAAxxxxx... (novo token)"
                style={{ ...inputStyle, width: '100%', marginBottom: 10, fontFamily: 'monospace', fontSize: '12px' }}
              />
              <button
                onClick={saveToken}
                disabled={!tokenInput.trim() || tokenStatus === 'saving'}
                style={{
                  width: '100%', padding: '9px', border: 'none', borderRadius: 'var(--r-md)',
                  background: tokenStatus === 'ok' ? 'var(--success)' : tokenStatus === 'error' ? 'var(--danger)' : (!tokenInput.trim() || tokenStatus === 'saving') ? 'var(--bg-subtle)' : 'var(--accent)',
                  color: (!tokenInput.trim() && tokenStatus !== 'ok' && tokenStatus !== 'error') ? 'var(--text-disabled)' : 'white',
                  fontSize: '13px', fontWeight: 700, cursor: (!tokenInput.trim() || tokenStatus === 'saving') ? 'default' : 'pointer',
                  transition: 'all var(--t-fast)',
                }}
              >
                {tokenStatus === 'saving' ? 'Salvando…' : tokenStatus === 'ok' ? '✓ Token atualizado!' : tokenStatus === 'error' ? '✕ Erro ao salvar' : 'Salvar Token'}
              </button>

              <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', fontSize: '10.5px', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                O token é aplicado imediatamente em memória. Não persiste após reinício do servidor.
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(d => !d)}
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
          style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', cursor: 'pointer',
            color: 'var(--text-secondary)', transition: 'all var(--t-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {darkMode ? <IconSun /> : <IconMoon />}
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />

        {/* Live status + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isLive && lastUpdated && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="live-dot" />
              <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          <button onClick={refreshData} disabled={loading} title="Atualizar dados" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--bg-input)', border: '1px solid var(--border-input)',
            borderRadius: 'var(--r-sm)', padding: '7px 11px',
            cursor: loading ? 'default' : 'pointer', fontSize: '12px',
            color: loading ? 'var(--text-muted)' : 'var(--text-secondary)', fontWeight: 500,
            boxShadow: 'var(--shadow-xs)', transition: 'all var(--t-fast)',
          }}>
            <IconRefresh spinning={loading} />
            {loading ? 'Buscando…' : 'Atualizar'}
          </button>
          <button onClick={triggerSync} disabled={syncing} title="Sincronizar Meta API → Banco" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--success-soft)', border: '1px solid var(--success)',
            borderRadius: 'var(--r-sm)', padding: '7px 11px',
            cursor: syncing ? 'default' : 'pointer', fontSize: '12px',
            color: 'var(--success)', fontWeight: 600,
            boxShadow: 'var(--shadow-xs)', transition: 'all var(--t-fast)',
            opacity: syncing ? 0.7 : 1,
          }}>
            <IconSync spinning={syncing} />
            {syncing ? 'Sincronizando…' : 'Sync'}
          </button>
        </div>

        {/* Send report */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--accent)', border: 'none',
          borderRadius: 'var(--r-sm)', padding: '8px 14px',
          cursor: 'pointer', color: 'white', fontSize: '12px', fontWeight: 600,
          whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
          transition: 'all var(--t-fast)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.45)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.35)'; }}
        >
          <IconMail /> {t.header.sendReport}
        </button>

        {/* Pinned indicator */}
        {pinnedIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', background: 'var(--warning-soft)',
            border: '1px solid var(--warning)', borderRadius: 'var(--r-sm)',
            fontSize: '12px', color: 'var(--warning)', fontWeight: 700,
          }}>★ {pinnedIds.size}</div>
        )}
      </div>
    </header>
  );
}
