import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext.jsx';

const STORAGE_KEY_ACCOUNTS  = 'meta_active_accounts';
const STORAGE_KEY_WINDOWS   = 'meta_time_windows';

const DEFAULT_WINDOWS = [
  { id: 'manha',     label: 'Manhã',     icon: '🌅', start: '07', end: '09' },
  { id: 'tarde',     label: 'Tarde',     icon: '☀️', start: '12', end: '15' },
  { id: 'noite',     label: 'Noite',     icon: '🌙', start: '19', end: '22' },
  { id: 'madrugada', label: 'Madrugada', icon: '🌃', start: '00', end: '03' },
];

function loadJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

export default function ProfilePage() {
  const { rawCampaigns, setActiveAccounts } = useApp();

  // All unique accounts (from raw, unfiltered campaigns)
  const allAccounts = useMemo(() => {
    const map = {};
    (rawCampaigns || []).forEach(c => {
      if (c.account && !map[c.account]) map[c.account] = c.account_id || c.account;
    });
    return Object.entries(map).map(([name, id]) => ({ name, id }));
  }, [allCampaigns]);

  // Active accounts (stored)
  const [activeIds, setActiveIds] = useState(() => {
    const saved = loadJSON(STORAGE_KEY_ACCOUNTS, null);
    return saved ? new Set(saved) : null; // null = all active
  });

  // Time windows
  const [windows, setWindows] = useState(() =>
    loadJSON(STORAGE_KEY_WINDOWS, DEFAULT_WINDOWS)
  );
  const [saved, setSaved] = useState(false);

  // Persist + propagate activeIds
  useEffect(() => {
    const ids = activeIds === null ? allAccounts.map(a => a.name) : [...activeIds];
    saveJSON(STORAGE_KEY_ACCOUNTS, ids);
    if (setActiveAccounts) setActiveAccounts(activeIds === null ? null : new Set(activeIds));
  }, [activeIds]);

  // Persist time windows
  const saveWindows = () => {
    saveJSON(STORAGE_KEY_WINDOWS, windows);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleAccount = (name) => {
    setActiveIds(prev => {
      const all = new Set(allAccounts.map(a => a.name));
      const current = prev === null ? all : new Set(prev);
      if (current.has(name)) current.delete(name); else current.add(name);
      // if all selected → use null (means all)
      return current.size === allAccounts.length ? null : current;
    });
  };

  const toggleAll = () => {
    setActiveIds(prev => prev === null ? new Set() : null);
  };

  const updateWindow = (id, field, val) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, [field]: val } : w));
  };

  const allSelected = activeIds === null || activeIds.size === allAccounts.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
          ⚙️ Perfil & Configurações
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          Configure suas contas ativas e janelas de análise de métricas.
        </p>
      </div>

      {/* BM / Account selector */}
      <div style={card}>
        <div style={sectionTitle}>🏢 Contas Ativas (BM)</div>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>
          Selecione quais Business Managers / Contas devem aparecer nos filtros e análises.
        </p>

        {/* Select all */}
        <label style={checkRow} onClick={toggleAll}>
          <input type="checkbox" checked={allSelected} readOnly
            style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Todas as contas
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {allAccounts.length} contas
          </span>
        </label>

        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

        {allAccounts.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
            Nenhuma conta encontrada. Sincronize os dados primeiro.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {allAccounts.map(acc => {
            const checked = activeIds === null || activeIds.has(acc.name);
            return (
              <label key={acc.name} style={{ ...checkRow, cursor: 'pointer' }} onClick={() => toggleAccount(acc.name)}>
                <input type="checkbox" checked={checked} readOnly
                  style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc.id}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: checked ? 'var(--success-soft)' : 'var(--bg-subtle)',
                  color: checked ? 'var(--success)' : 'var(--text-disabled)',
                  border: `1px solid ${checked ? 'var(--success)' : 'var(--border)'}`,
                  flexShrink: 0,
                }}>
                  {checked ? 'Ativa' : 'Oculta'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Time windows */}
      <div style={card}>
        <div style={sectionTitle}>⏰ Janelas de Métricas por Horário</div>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
          Configure 4 janelas horárias para analisar performance por período do dia.
          As métricas dessas janelas aparecem na Visão Geral para identificar os melhores horários de venda.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          {windows.map(w => (
            <div key={w.id} style={{
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{w.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{w.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>De</div>
                  <select value={w.start} onChange={e => updateWindow(w.id, 'start', e.target.value)}
                    style={selectStyle}>
                    {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>→</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>Até</div>
                  <select value={w.end} onChange={e => updateWindow(w.id, 'end', e.target.value)}
                    style={selectStyle}>
                    {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                {w.start}:00 – {w.end}:00 · {
                  (() => {
                    const diff = (parseInt(w.end) - parseInt(w.start) + 24) % 24;
                    return diff === 0 ? '24h' : `${diff}h`;
                  })()
                }
              </div>
            </div>
          ))}
        </div>

        <button onClick={saveWindows} style={{
          background: saved ? 'var(--success)' : 'var(--accent)',
          color: 'white', border: 'none', borderRadius: 'var(--r-md)',
          padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          transition: 'all var(--t-fast)',
          boxShadow: saved ? '0 2px 8px rgba(16,185,129,0.35)' : '0 2px 8px rgba(99,102,241,0.35)',
        }}>
          {saved ? '✓ Salvo!' : '💾 Salvar janelas'}
        </button>
      </div>

      {/* Info callout */}
      <div style={{
        background: 'var(--info-soft)', border: '1px solid var(--accent-border)',
        borderRadius: 'var(--r-md)', padding: '14px 18px',
        fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--accent)' }}>Como funciona:</strong> As janelas configuradas acima são usadas na
        Visão Geral para mostrar quais períodos do dia têm melhor performance de vendas, comparando
        investimento × receita por faixa horária. Isso ajuda a identificar quando escalar budget ou
        pausar anúncios.
      </div>
    </div>
  );
}

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-lg)',
  padding: '20px 22px',
  boxShadow: 'var(--shadow-sm)',
};

const sectionTitle = {
  fontSize: 14, fontWeight: 800, color: 'var(--text-primary)',
  marginBottom: 10, paddingLeft: 10,
  borderLeft: '3px solid var(--accent)',
};

const checkRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 10px', borderRadius: 'var(--r-sm)',
  cursor: 'pointer', transition: 'background var(--t-fast)',
};

const selectStyle = {
  width: '100%', padding: '5px 8px',
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', color: 'var(--text-primary)',
  fontSize: 12, cursor: 'pointer',
};
