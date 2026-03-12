import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App.jsx';

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
  { value: 'all', pt: 'Todas as contas', en: 'All accounts' },
  { value: 'Arcanjo Miguel', pt: 'Arcanjo Miguel', en: 'Arcanjo Miguel' },
  { value: 'Arcanjo Editr', pt: 'Arcanjo Editr', en: 'Arcanjo Editr' },
  { value: 'BM ADSLY01', pt: 'BM ADSLY01', en: 'BM ADSLY01' },
  { value: 'Andreia Muller', pt: 'Andreia Muller', en: 'Andreia Muller' },
  { value: 'Conta Antiga', pt: 'Conta Antiga', en: 'Old Account' },
];

const PRESETS = [
  { label: 'Hoje', days: 1, today: true },
  { label: 'Ontem', yesterday: true },
  { label: '3d', days: 3 },
  { label: '7d', days: 7 },
  { label: '15d', days: 15 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
];

function fmt(dateStr, lang) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
}

export default function TopBar({ lang, setLang, tab, selectedCampaign, setSelectedCampaign }) {
  const {
    t, days, setDays, selectedAccount, setSelectedAccount, pinnedIds, cutoffDate,
    dateMode, setDateMode, customDateStart, setCustomDateStart, customDateEnd, setCustomDateEnd,
    endDate, TODAY, loading, lastUpdated, refreshData, isLive, syncing, triggerSync,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(customDateStart || '');
  const [customEnd, setCustomEnd] = useState(customDateEnd || TODAY);
  const dropRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyPreset = (d) => {
    setDays(d);
    setDateMode('relative');
    setCustomDateStart('');
    setCustomDateEnd('');
    setOpen(false);
  };

  const applyYesterday = () => {
    const yd = new Date(TODAY);
    yd.setDate(yd.getDate() - 1);
    const yds = yd.toISOString().slice(0, 10);
    setDateMode('custom');
    setCustomDateStart(yds);
    setCustomDateEnd(yds);
    setCustomStart(yds);
    setCustomEnd(yds);
    setDays(1);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) return;
    if (customStart > customEnd) return;
    setDateMode('custom');
    setCustomDateStart(customStart);
    setCustomDateEnd(customEnd);
    const diff = diffDays(customStart, customEnd);
    setDays(diff);
    setOpen(false);
  };

  const yesterday = (() => { const d = new Date(TODAY); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const isYesterday = dateMode === 'custom' && customDateStart === yesterday && customDateEnd === yesterday;

  // Build button label
  const buttonLabel = () => {
    if (isYesterday) return `Ontem · ${fmt(yesterday, lang)}`;
    if (dateMode === 'custom' && customDateStart && customDateEnd) {
      const d = diffDays(customDateStart, customDateEnd);
      return `${fmt(customDateStart, lang)} – ${fmt(customDateEnd, lang)} · ${d}d`;
    }
    if (days === 1) return `Hoje · ${fmt(TODAY, lang)}`;
    return `${fmt(cutoffDate, lang)} – ${fmt(TODAY, lang)} · ${days}d`;
  };

  const isActive = (d) => dateMode === 'relative' && days === d;

  const title = selectedCampaign ? selectedCampaign.name : (TAB_TITLES[tab]?.[lang] || tab);
  const subtitle = selectedCampaign
    ? (lang === 'pt' ? 'Detalhes da campanha' : 'Campaign details')
    : (TAB_SUBS[tab]?.[lang] || '');

  return (
    <header style={{
      background: 'white', borderBottom: '1px solid #e2e8f0',
      padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 72, flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {selectedCampaign && (
          <button onClick={() => setSelectedCampaign(null)}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            {t.back}
          </button>
        )}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{title}</h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, marginTop: '2px' }}>{subtitle}</p>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Account filter */}
        <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} style={selStyle}>
          {ACCOUNTS_OPTS.map(o => <option key={o.value} value={o.value}>{o[lang]}</option>)}
        </select>

        {/* Date picker */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => setOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: open ? '#f8fafc' : 'white',
              border: open ? '1px solid #a5b4fc' : '1px solid #e2e8f0',
              borderRadius: '10px', padding: '8px 14px', cursor: 'pointer',
              fontSize: '13px', color: '#1e293b', fontWeight: 500,
              whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '14px' }}>📅</span>
            <span>{buttonLabel()}</span>
            <span style={{ fontSize: '10px', color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.14)', padding: '16px', zIndex: 300,
              minWidth: '280px',
            }}>
              {/* Quick presets */}
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                ⚡ Acesso rápido
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {PRESETS.map(({ label, days: d, today: isToday, yesterday: isYest }) => {
                  const active = isYest ? isYesterday : (isToday ? isActive(1) : isActive(d));
                  const isSpecial = isToday || isYest;
                  return (
                    <button key={label} onClick={() => isYest ? applyYesterday() : applyPreset(d)}
                      style={{
                        padding: '6px 14px', borderRadius: '999px', border: '1.5px solid',
                        borderColor: active ? '#6366f1' : '#e2e8f0',
                        background: active ? '#6366f1' : isSpecial ? '#fef9c3' : 'white',
                        color: active ? 'white' : isSpecial ? '#92400e' : '#475569',
                        fontSize: '12px', fontWeight: active ? 700 : 500,
                        cursor: 'pointer', transition: 'all 0.12s',
                        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.color = '#6366f1'; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = isSpecial ? '#92400e' : '#475569'; } }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #f1f5f9', margin: '0 -4px 14px' }} />

              {/* Custom range */}
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                📅 Intervalo personalizado
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>De</div>
                    <input
                      type="date"
                      value={customStart}
                      max={customEnd || TODAY}
                      onChange={e => setCustomStart(e.target.value)}
                      style={dateInputStyle}
                    />
                  </div>
                  <div style={{ color: '#cbd5e1', marginTop: '14px' }}>→</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Até</div>
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart}
                      max={TODAY}
                      onChange={e => setCustomEnd(e.target.value)}
                      style={dateInputStyle}
                    />
                  </div>
                </div>
                {customStart && customEnd && customStart <= customEnd && (
                  <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                    {diffDays(customStart, customEnd)} {diffDays(customStart, customEnd) === 1 ? 'dia' : 'dias'} selecionados
                  </div>
                )}
                <button
                  onClick={applyCustom}
                  disabled={!customStart || !customEnd || customStart > customEnd}
                  style={{
                    background: customStart && customEnd && customStart <= customEnd
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : '#f1f5f9',
                    border: 'none', borderRadius: '10px', padding: '10px',
                    color: customStart && customEnd && customStart <= customEnd ? 'white' : '#94a3b8',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: customStart && customEnd && customStart <= customEnd
                      ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  Aplicar intervalo
                </button>
              </div>

              {/* Current info */}
              <div style={{ marginTop: '12px', padding: '8px', background: '#f8fafc', borderRadius: '8px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                {isYesterday
                  ? `Exibindo dados de ontem (${fmt(yesterday, lang)})`
                  : dateMode === 'custom'
                    ? `Período personalizado: ${fmt(customDateStart, lang)} – ${fmt(customDateEnd, lang)}`
                    : days === 1 ? `Exibindo dados de hoje (${fmt(TODAY, lang)})` : `Exibindo dados dos últimos ${days} dias`
                }
              </div>
            </div>
          )}
        </div>

        {/* Lang toggle */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
          {[['pt', 'PT-BR'], ['en', 'EN-USA']].map(([code, label]) => (
            <button key={code} onClick={() => setLang(code)}
              style={{
                padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 700,
                background: lang === code ? 'white' : 'transparent',
                color: lang === code ? '#6366f1' : '#94a3b8',
                boxShadow: lang === code ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Live status + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isLive && lastUpdated && !loading && (
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }}>
              ● ao vivo · {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={refreshData}
            disabled={loading}
            title="Atualizar dados"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: loading ? '#f1f5f9' : 'white',
              border: '1px solid #e2e8f0', borderRadius: '10px',
              padding: '8px 12px', cursor: loading ? 'default' : 'pointer',
              fontSize: '13px', color: loading ? '#94a3b8' : '#1e293b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <span style={{ display: 'inline-block', animation: loading ? 'spin 0.7s linear infinite' : 'none' }}>↻</span>
            {loading ? 'Buscando...' : 'Atualizar'}
          </button>
          <button
            onClick={triggerSync}
            disabled={syncing}
            title="Sincronizar Meta API → Banco + rodar regras de alerta"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: syncing ? '#f0fdf4' : '#f0fdf4',
              border: '1px solid ' + (syncing ? '#86efac' : '#bbf7d0'),
              borderRadius: '10px', padding: '8px 12px',
              cursor: syncing ? 'default' : 'pointer',
              fontSize: '13px', color: syncing ? '#15803d' : '#16a34a',
              fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <span style={{ display: 'inline-block', animation: syncing ? 'spin 0.7s linear infinite' : 'none' }}>⟳</span>
            {syncing ? 'Sincronizando...' : 'Sync'}
          </button>
        </div>

        {/* Send report button */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#1877F2', border: 'none', borderRadius: '10px',
          padding: '9px 16px', cursor: 'pointer', color: 'white',
          fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(24,119,242,0.35)',
        }}>
          ✉️ {t.header.sendReport}
        </button>

        {/* Pinned indicator */}
        {pinnedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
            ★ {pinnedIds.size}
          </div>
        )}
      </div>
    </header>
  );
}

const selStyle = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
  color: '#1e293b', padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
  outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const dateInputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  border: '1.5px solid #e2e8f0', fontSize: '13px', color: '#1e293b',
  outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
  background: 'white', transition: 'border-color 0.15s',
};
