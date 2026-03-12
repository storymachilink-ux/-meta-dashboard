import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext.jsx';

// ── Storage helpers ────────────────────────────────────────────────────────
const PROFILES_KEY    = 'meta_profiles';
const ACTIVE_PROF_KEY = 'meta_active_profile';

function loadJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_WINDOWS = [
  { id: 'manha',     label: 'Manhã',     icon: '🌅', start: '07', end: '09' },
  { id: 'tarde',     label: 'Tarde',     icon: '☀️', start: '12', end: '15' },
  { id: 'noite',     label: 'Noite',     icon: '🌙', start: '19', end: '22' },
  { id: 'madrugada', label: 'Madrugada', icon: '🌃', start: '00', end: '03' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

function newProfile(name = 'Novo Perfil') {
  return { id: uuid(), name, activeAccounts: null, timeWindows: DEFAULT_WINDOWS, createdAt: new Date().toISOString() };
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { rawCampaigns, setActiveAccounts } = useApp();

  // All unique accounts from raw campaigns
  const allAccounts = useMemo(() => {
    const map = {};
    (rawCampaigns || []).forEach(c => {
      if (c.account && !map[c.account]) map[c.account] = c.account_id || c.account;
    });
    return Object.entries(map).map(([name, id]) => ({ name, id }));
  }, [rawCampaigns]);

  // Profiles list
  const [profiles, setProfiles] = useState(() => {
    const saved = loadJSON(PROFILES_KEY, null);
    if (saved && saved.length) return saved;
    return [newProfile('Perfil Principal')];
  });

  // Active profile id
  const [activeId, setActiveIdState] = useState(() =>
    loadJSON(ACTIVE_PROF_KEY, null) || profiles[0]?.id
  );

  // Which profile is being edited
  const [editingId, setEditingId] = useState(activeId);

  // Meta token state
  const [tokenInput, setTokenInput] = useState('');
  const [tokenStatus, setTokenStatus] = useState(null); // null | 'ok' | 'err'
  const [tokenSaving, setTokenSaving] = useState(false);

  // Flash save indicator
  const [savedFlash, setSavedFlash] = useState(false);

  const editingProfile = profiles.find(p => p.id === editingId) || profiles[0];
  const activeProfile  = profiles.find(p => p.id === activeId)  || profiles[0];

  // Persist profiles
  useEffect(() => { saveJSON(PROFILES_KEY, profiles); }, [profiles]);

  // When active profile changes, propagate accounts to app
  useEffect(() => {
    saveJSON(ACTIVE_PROF_KEY, activeId);
    if (!activeProfile) return;
    if (activeProfile.activeAccounts === null) {
      setActiveAccounts(null);
    } else {
      setActiveAccounts(new Set(activeProfile.activeAccounts));
    }
  }, [activeId, profiles]);

  // ── Profile mutations ──────────────────────────────────────────────────
  const addProfile = () => {
    const p = newProfile('Novo Perfil');
    setProfiles(prev => [...prev, p]);
    setEditingId(p.id);
  };

  const deleteProfile = (id) => {
    if (profiles.length <= 1) return;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (editingId === id) setEditingId(profiles.find(p => p.id !== id)?.id);
    if (activeId === id) {
      const next = profiles.find(p => p.id !== id);
      if (next) setActiveIdState(next.id);
    }
  };

  const updateEditing = (patch) => {
    setProfiles(prev => prev.map(p => p.id === editingId ? { ...p, ...patch } : p));
  };

  const setActiveProfile = (id) => {
    setActiveIdState(id);
  };

  const saveProfile = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  // ── Account toggle in editing profile ─────────────────────────────────
  const toggleAccount = (name) => {
    const current = editingProfile.activeAccounts === null
      ? new Set(allAccounts.map(a => a.name))
      : new Set(editingProfile.activeAccounts);
    if (current.has(name)) current.delete(name); else current.add(name);
    const next = current.size === allAccounts.length ? null : [...current];
    updateEditing({ activeAccounts: next });
  };

  const toggleAllAccounts = () => {
    const allNull = editingProfile.activeAccounts === null;
    updateEditing({ activeAccounts: allNull ? [] : null });
  };

  const allSelected = editingProfile.activeAccounts === null
    || editingProfile.activeAccounts.length === allAccounts.length;

  // ── Time windows in editing profile ───────────────────────────────────
  const updateWindow = (wid, field, val) => {
    updateEditing({
      timeWindows: editingProfile.timeWindows.map(w => w.id === wid ? { ...w, [field]: val } : w)
    });
  };

  // ── Meta token ─────────────────────────────────────────────────────────
  const saveToken = async () => {
    if (!tokenInput.trim()) return;
    setTokenSaving(true);
    try {
      const r = await fetch('/api/admin/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      const d = await r.json();
      setTokenStatus(d.status === 'ok' ? 'ok' : 'err');
      if (d.status === 'ok') setTokenInput('');
    } catch {
      setTokenStatus('err');
    } finally {
      setTokenSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', maxWidth: 1100 }}>

      {/* ── Left: Profile list ── */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ ...card, padding: '14px 16px' }}>
          <div style={sectionTitle}>Perfis</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {profiles.map(p => (
              <div key={p.id}
                onClick={() => setEditingId(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 10px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  background: editingId === p.id ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${editingId === p.id ? 'var(--accent-border)' : 'transparent'}`,
                  transition: 'all var(--t-fast)',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: activeId === p.id
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'var(--bg-subtle)',
                  border: `2px solid ${activeId === p.id ? '#6366f1' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: activeId === p.id ? 'white' : 'var(--text-muted)',
                }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  {activeId === p.id && (
                    <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>● Ativo</div>
                  )}
                </div>
                {profiles.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); deleteProfile(p.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-disabled)', padding: '2px 4px', lineHeight: 1 }}
                    title="Excluir perfil"
                  >×</button>
                )}
              </div>
            ))}
          </div>

          <button onClick={addProfile} style={{
            width: '100%', padding: '8px', background: 'var(--bg-subtle)',
            border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            transition: 'all var(--t-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            + Novo Perfil
          </button>
        </div>
      </div>

      {/* ── Right: Profile editor ── */}
      {editingProfile && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile name + activate */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                Nome do Perfil
              </label>
              <input
                value={editingProfile.name}
                onChange={e => updateEditing({ name: e.target.value })}
                style={{
                  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                  background: 'var(--bg-input)', border: '1.5px solid var(--border-input)',
                  borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
                  fontSize: 14, fontWeight: 700, outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-border)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-input)'}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 2 }}>
              {activeId !== editingProfile.id && (
                <button onClick={() => setActiveProfile(editingProfile.id)} style={{
                  padding: '9px 18px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                  transition: 'all var(--t-fast)',
                }}>
                  ✓ Usar este perfil
                </button>
              )}
              {activeId === editingProfile.id && (
                <span style={{
                  padding: '9px 14px', background: 'var(--success-soft)', color: 'var(--success)',
                  border: '1px solid var(--success)', borderRadius: 'var(--r-md)',
                  fontSize: 12, fontWeight: 700,
                }}>
                  ● Perfil ativo
                </span>
              )}
              <button onClick={saveProfile} style={{
                padding: '9px 18px',
                background: savedFlash ? 'var(--success)' : 'var(--bg-subtle)',
                color: savedFlash ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${savedFlash ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                transition: 'all var(--t-fast)',
              }}>
                {savedFlash ? '✓ Salvo!' : '💾 Salvar'}
              </button>
            </div>
          </div>

          {/* BM / Account selector */}
          <div style={card}>
            <div style={sectionTitle}>🏢 Portfolios / BMs Ativos</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
              Selecione quais contas/BMs aparecem nos filtros e análises para este perfil.
            </p>

            <label style={{ ...checkRow, cursor: 'pointer', marginBottom: 4 }} onClick={toggleAllAccounts}>
              <input type="checkbox" checked={allSelected} readOnly
                style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Todas as contas
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {allAccounts.length} disponíveis
              </span>
            </label>

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0 10px' }} />

            {allAccounts.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                Nenhuma conta encontrada. Sincronize os dados primeiro.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {allAccounts.map(acc => {
                  const checked = editingProfile.activeAccounts === null
                    || (editingProfile.activeAccounts || []).includes(acc.name);
                  return (
                    <label key={acc.name} style={{ ...checkRow, cursor: 'pointer' }} onClick={() => toggleAccount(acc.name)}>
                      <input type="checkbox" checked={checked} readOnly
                        style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{acc.id}</div>
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
            )}
          </div>

          {/* Time windows */}
          <div style={card}>
            <div style={sectionTitle}>⏰ Janelas de Análise por Horário</div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              Configure faixas horárias para identificar os melhores momentos de venda.
              Usadas na Visão Geral para análise de performance por período.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {(editingProfile.timeWindows || DEFAULT_WINDOWS).map(w => (
                <div key={w.id} style={{
                  background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)', padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 17 }}>{w.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{w.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>De</div>
                      <select value={w.start} onChange={e => updateWindow(w.id, 'start', e.target.value)} style={selectSt}>
                        {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 16 }}>→</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>Até</div>
                      <select value={w.end} onChange={e => updateWindow(w.id, 'end', e.target.value)} style={selectSt}>
                        {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                    {w.start}:00 – {w.end}:00
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta token */}
          <div style={card}>
            <div style={sectionTitle}>🔗 Conexão Meta Ads</div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Configure o token de acesso da API do Meta (Facebook) para sincronizar campanhas.
              Obtenha seu token em{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                developers.facebook.com → Graph API Explorer
              </span>
              .
            </p>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
                  Access Token
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={e => { setTokenInput(e.target.value); setTokenStatus(null); }}
                  placeholder="EAAxxxxx... (cole o token aqui)"
                  style={{
                    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                    background: 'var(--bg-input)', border: `1.5px solid ${tokenStatus === 'err' ? 'var(--danger)' : tokenStatus === 'ok' ? 'var(--success)' : 'var(--border-input)'}`,
                    borderRadius: 'var(--r-md)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none', fontFamily: 'monospace',
                  }}
                />
              </div>
              <button
                onClick={saveToken}
                disabled={!tokenInput.trim() || tokenSaving}
                style={{
                  padding: '9px 20px', background: tokenInput.trim() ? 'var(--accent)' : 'var(--bg-subtle)',
                  color: tokenInput.trim() ? 'white' : 'var(--text-disabled)',
                  border: 'none', borderRadius: 'var(--r-md)',
                  cursor: tokenInput.trim() ? 'pointer' : 'default',
                  fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                  boxShadow: tokenInput.trim() ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                  transition: 'all var(--t-fast)',
                }}
              >
                {tokenSaving ? '⏳ Salvando...' : '🔑 Atualizar Token'}
              </button>
            </div>

            {tokenStatus === 'ok' && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                ✅ Token atualizado com sucesso! Clique em Sync para recarregar os dados.
              </div>
            )}
            {tokenStatus === 'err' && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                ❌ Erro ao atualizar o token. Verifique se o servidor está online.
              </div>
            )}

            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Como obter o token
              </div>
              <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <li>Acesse <strong>developers.facebook.com/tools/explorer</strong></li>
                <li>Selecione seu app e clique em <strong>Generate Access Token</strong></li>
                <li>Permissões necessárias: <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>ads_read</code>, <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>ads_management</code></li>
                <li>Cole o token acima e clique em Atualizar</li>
              </ol>
            </div>
          </div>

        </div>
      )}
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
  fontSize: 13, fontWeight: 800, color: 'var(--text-primary)',
  marginBottom: 10, paddingLeft: 10,
  borderLeft: '3px solid var(--accent)',
};

const checkRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '7px 10px', borderRadius: 'var(--r-sm)',
  transition: 'background var(--t-fast)',
};

const selectSt = {
  width: '100%', padding: '5px 6px',
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)', color: 'var(--text-primary)',
  fontSize: 12, cursor: 'pointer', outline: 'none',
};
