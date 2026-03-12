import React, { useState, useMemo } from 'react';
import { useApp } from '../App.jsx';
import { fmtBRL, fmtInt, fmtPct, scoreColor, calcScore } from '../utils.js';

export default function CampaignTable({ onSelectCampaign }) {
  const { t, filteredCampaigns, pinnedIds, togglePin, showPinnedOnly, setShowPinnedOnly,
    searchQuery, setSearchQuery, objectiveFilter, setObjectiveFilter, objectives, days } = useApp();

  const [sortKey, setSortKey] = useState('spend');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const sorted = useMemo(() => {
    return [...filteredCampaigns].map(c => ({ ...c, score: calcScore(c) })).sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
      return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
  }, [filteredCampaigns, sortKey, sortDir]);

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); setPage(0); }
  };

  const COLS = [
    { key: '_pin', label: '★', w: 36, sortable: false },
    { key: 'name', label: t.table.campaign, w: 220 },
    { key: 'account', label: t.table.account, w: 120 },
    { key: 'objective', label: t.table.objective, w: 100 },
    { key: 'spend', label: t.table.spend, w: 100 },
    { key: 'impressions', label: t.table.impressions, w: 110 },
    { key: 'clicks', label: t.table.clicks, w: 80 },
    { key: 'ctr', label: t.table.ctr, w: 70 },
    { key: 'cpc', label: t.table.cpc, w: 80 },
    { key: 'cpm', label: t.table.cpm, w: 80 },
    { key: 'frequency', label: t.table.frequency, w: 60 },
    { key: 'roas', label: t.table.roas, w: 70 },
    { key: 'purchases', label: t.table.purchases, w: 80 },
    { key: 'score', label: t.table.score, w: 70 },
  ];

  const renderCell = (c, key) => {
    switch (key) {
      case '_pin':
        return (
          <button onClick={e => { e.stopPropagation(); togglePin(c.id); }}
            title={t.pinHint}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: pinnedIds.has(c.id) ? '#fbbf24' : '#cbd5e1', padding: '2px' }}>
            {pinnedIds.has(c.id) ? '★' : '☆'}
          </button>
        );
      case 'name':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {c._period && <span title="Dados do período" style={{ fontSize: '8px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', padding: '1px 4px', fontWeight: 700 }}>P</span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={c.name}>{c.name}</span>
          </div>
        );
      case 'account': return <span style={{ color: '#94a3b8', fontSize: '12px' }}>{c.account}</span>;
      case 'objective': return <ObjBadge obj={c.objective} t={t} />;
      case 'spend': return <span style={{ fontWeight: 700, color: '#1e293b' }}>{fmtBRL(c.spend)}</span>;
      case 'impressions': return fmtInt(c.impressions);
      case 'clicks': return fmtInt(c.clicks);
      case 'ctr': return <ColorVal val={c.ctr} fmt={v => v.toFixed(2) + '%'} good={2} mid={1} />;
      case 'cpc': return <ColorVal val={c.cpc} fmt={v => v > 0 ? fmtBRL(v) : '—'} good={1} mid={3} invert />;
      case 'cpm': return c.cpm > 0 ? fmtBRL(c.cpm) : '—';
      case 'frequency': return <ColorVal val={c.frequency} fmt={v => v > 0 ? v.toFixed(2) + 'x' : '—'} good={1.5} mid={2.5} invert />;
      case 'roas': return <ColorVal val={c.roas} fmt={v => v > 0 ? v.toFixed(2) + 'x' : '—'} good={3} mid={1.5} />;
      case 'purchases': return c.purchases > 0 ? fmtInt(c.purchases) : <span style={{ color: '#cbd5e1' }}>—</span>;
      case 'score': {
        const sc = c.score;
        const col = scoreColor(sc);
        return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 22, borderRadius: '6px', background: col + '18', color: col, fontSize: '11px', fontWeight: 800 }}>{sc}</span>;
      }
      default: return c[key] ?? '—';
    }
  };

  return (
    <div>
      {/* Filters bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.4 }}>🔍</span>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchCampaign}
            style={{ width: '100%', paddingLeft: '36px', ...inputStyle, boxSizing: 'border-box' }} />
        </div>
        <select value={objectiveFilter} onChange={e => setObjectiveFilter(e.target.value)} style={inputStyle}>
          <option value="all">{t.allObjectives}</option>
          {objectives.map(o => <option key={o} value={o}>{t.objectives[o] || o}</option>)}
        </select>
        <button onClick={() => setShowPinnedOnly(p => !p)}
          style={{
            padding: '8px 14px', borderRadius: '10px', border: '1px solid',
            borderColor: showPinnedOnly ? '#fbbf24' : '#e2e8f0',
            background: showPinnedOnly ? '#fef9c3' : 'white',
            color: showPinnedOnly ? '#92400e' : '#64748b',
            cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', gap: '6px', alignItems: 'center',
          }}>
          ★ {t.filterPinned}
        </button>
        <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' }}>
          {t.campaigns_count(sorted.length)}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {COLS.map(col => (
                  <th key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{
                      padding: '11px 14px', textAlign: 'left', whiteSpace: 'nowrap',
                      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
                      color: sortKey === col.key ? '#6366f1' : '#94a3b8',
                      cursor: col.sortable !== false ? 'pointer' : 'default',
                      userSelect: 'none', minWidth: col.w,
                    }}
                  >
                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => (
                <tr key={c.id}
                  onClick={() => onSelectCampaign(c)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: pinnedIds.has(c.id) ? '#fffbeb' : 'white', transition: 'background 0.12s' }}
                  onMouseEnter={e => { if (!pinnedIds.has(c.id)) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = pinnedIds.has(c.id) ? '#fffbeb' : 'white'; }}
                >
                  {COLS.map(col => (
                    <td key={col.key} style={{ padding: '10px 14px', color: '#334155', verticalAlign: 'middle' }}>
                      {renderCell(c, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={COLS.length} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>{t.noData}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} / {sorted.length}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <PagBtn onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>←</PagBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return <PagBtn key={p} onClick={() => setPage(p)} active={p === page}>{p + 1}</PagBtn>;
            })}
            <PagBtn onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>→</PagBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorVal({ val, fmt, good, mid, invert }) {
  let color = '#94a3b8';
  if (val > 0) {
    if (!invert) color = val >= good ? '#10b981' : val >= mid ? '#f59e0b' : '#ef4444';
    else color = val <= good ? '#10b981' : val <= mid ? '#f59e0b' : '#ef4444';
  }
  return <span style={{ color, fontWeight: 600 }}>{fmt(val)}</span>;
}

function ObjBadge({ obj, t }) {
  const labels = { OUTCOME_SALES: ['#10b981', '💰'], OUTCOME_ENGAGEMENT: ['#6366f1', '❤️'], OUTCOME_AWARENESS: ['#f59e0b', '👁'], LINK_CLICKS: ['#0ea5e9', '🖱'] };
  const [color, icon] = labels[obj] || ['#94a3b8', '•'];
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, color, background: color + '15', padding: '2px 7px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
      {icon} {t.objectives[obj] || obj || '—'}
    </span>
  );
}

function PagBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 32, height: 28, borderRadius: '6px', border: '1px solid', fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: active ? 700 : 400, borderColor: active ? '#6366f1' : '#e2e8f0', background: active ? '#eef2ff' : 'white', color: active ? '#6366f1' : disabled ? '#cbd5e1' : '#64748b' }}>
      {children}
    </button>
  );
}

const inputStyle = {
  background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
  color: '#1e293b', padding: '8px 12px', fontSize: '13px', outline: 'none',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};
