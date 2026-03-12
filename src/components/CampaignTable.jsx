import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
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
    { key: '_pin',       label: '',                    w: 36,  sortable: false },
    { key: 'name',       label: t.table.campaign,      w: 220 },
    { key: 'account',    label: t.table.account,       w: 120 },
    { key: 'objective',  label: t.table.objective,     w: 100 },
    { key: 'spend',      label: t.table.spend,         w: 100 },
    { key: 'impressions',label: t.table.impressions,   w: 110 },
    { key: 'clicks',     label: t.table.clicks,        w: 80  },
    { key: 'ctr',        label: t.table.ctr,           w: 70  },
    { key: 'cpc',        label: t.table.cpc,           w: 80  },
    { key: 'cpm',        label: t.table.cpm,           w: 80  },
    { key: 'frequency',  label: t.table.frequency,     w: 60  },
    { key: 'roas',       label: t.table.roas,          w: 70  },
    { key: 'purchases',  label: t.table.purchases,     w: 80  },
    { key: 'score',      label: t.table.score,         w: 70  },
  ];

  const renderCell = (c, key) => {
    switch (key) {
      case '_pin':
        return (
          <button onClick={e => { e.stopPropagation(); togglePin(c.id); }} title={t.pinHint}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: pinnedIds.has(c.id) ? '#fbbf24' : 'var(--text-disabled)', padding: '2px', transition: 'color var(--t-fast)' }}>
            {pinnedIds.has(c.id) ? '★' : '☆'}
          </button>
        );
      case 'name':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {c._period && <span style={{ fontSize: '9px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 4, padding: '1px 5px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0 }}>P</span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, color: 'var(--text-primary)', fontWeight: 500 }} title={c.name}>{c.name}</span>
          </div>
        );
      case 'account':
        return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.account}</span>;
      case 'objective':
        return <ObjBadge obj={c.objective} t={t} />;
      case 'spend':
        return <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmtBRL(c.spend)}</span>;
      case 'impressions':
        return <span style={{ color: 'var(--text-secondary)' }}>{fmtInt(c.impressions)}</span>;
      case 'clicks':
        return <span style={{ color: 'var(--text-secondary)' }}>{fmtInt(c.clicks)}</span>;
      case 'ctr':
        return <ColorVal val={c.ctr}       fmt={v => v.toFixed(2) + '%'}              good={2}   mid={1}   />;
      case 'cpc':
        return <ColorVal val={c.cpc}       fmt={v => v > 0 ? fmtBRL(v) : '—'}        good={1}   mid={3}   invert />;
      case 'cpm':
        return <span style={{ color: 'var(--text-secondary)' }}>{c.cpm > 0 ? fmtBRL(c.cpm) : '—'}</span>;
      case 'frequency':
        return <ColorVal val={c.frequency} fmt={v => v > 0 ? v.toFixed(2) + 'x' : '—'} good={1.5} mid={2.5} invert />;
      case 'roas':
        return <ColorVal val={c.roas}      fmt={v => v > 0 ? v.toFixed(2) + 'x' : '—'} good={3}   mid={1.5} />;
      case 'purchases':
        return c.purchases > 0
          ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtInt(c.purchases)}</span>
          : <span style={{ color: 'var(--text-disabled)' }}>—</span>;
      case 'score': {
        const sc = c.score;
        const col = scoreColor(sc);
        return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 22, borderRadius: 6, background: col + '18', color: col, fontSize: '11px', fontWeight: 800, letterSpacing: '-0.2px' }}>{sc}</span>;
      }
      default: return <span style={{ color: 'var(--text-secondary)' }}>{c[key] ?? '—'}</span>;
    }
  };

  return (
    <div>
      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchCampaign}
            style={{ width: '100%', paddingLeft: 36, ...inputStyle, boxSizing: 'border-box' }}
          />
        </div>
        <select value={objectiveFilter} onChange={e => setObjectiveFilter(e.target.value)} style={inputStyle}>
          <option value="all">{t.allObjectives}</option>
          {objectives.map(o => <option key={o} value={o}>{t.objectives[o] || o}</option>)}
        </select>
        <button onClick={() => setShowPinnedOnly(p => !p)} style={{
          padding: '8px 14px', borderRadius: 'var(--r-sm)', border: '1px solid',
          borderColor: showPinnedOnly ? 'var(--warning)' : 'var(--border-input)',
          background: showPinnedOnly ? 'var(--warning-soft)' : 'var(--bg-input)',
          color: showPinnedOnly ? 'var(--warning)' : 'var(--text-secondary)',
          cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          display: 'flex', gap: 6, alignItems: 'center', transition: 'all var(--t-fast)',
        }}>
          ★ {t.filterPinned}
        </button>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {t.campaigns_count(sorted.length)}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                {COLS.map(col => (
                  <th key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{
                      padding: '11px 14px', textAlign: 'left', whiteSpace: 'nowrap',
                      fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: sortKey === col.key ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: col.sortable !== false ? 'pointer' : 'default',
                      userSelect: 'none', minWidth: col.w,
                      transition: 'color var(--t-fast)',
                    }}
                  >
                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id}
                  onClick={() => onSelectCampaign(c)}
                  className={`table-row${pinnedIds.has(c.id) ? ' pinned' : ''}`}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  {COLS.map(col => (
                    <td key={col.key} style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      {renderCell(c, col.key)}
                    </td>
                  ))}
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={COLS.length} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {t.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} / {sorted.length}
          </span>
          <div style={{ display: 'flex', gap: 5 }}>
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

/* ── Sub-components ── */

function ColorVal({ val, fmt, good, mid, invert }) {
  let color = 'var(--text-muted)';
  if (val > 0) {
    if (!invert) color = val >= good ? 'var(--success)' : val >= mid ? 'var(--warning)' : 'var(--danger)';
    else         color = val <= good ? 'var(--success)' : val <= mid ? 'var(--warning)' : 'var(--danger)';
  }
  return <span style={{ color, fontWeight: 600 }}>{fmt(val)}</span>;
}

function ObjBadge({ obj, t }) {
  const map = {
    OUTCOME_SALES:      ['#10b981', '💰'],
    OUTCOME_ENGAGEMENT: ['#6366f1', '❤️'],
    OUTCOME_AWARENESS:  ['#f59e0b', '👁'],
    LINK_CLICKS:        ['#0ea5e9', '🖱'],
  };
  const [color, icon] = map[obj] || ['var(--text-muted)', '•'];
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, color, background: color + '18', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
      {icon} {t.objectives[obj] || obj || '—'}
    </span>
  );
}

function PagBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 30, height: 28, borderRadius: 'var(--r-sm)', border: '1px solid',
      fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: active ? 700 : 400,
      borderColor: active ? 'var(--accent)' : 'var(--border)',
      background: active ? 'var(--accent-soft)' : 'var(--bg-card)',
      color: active ? 'var(--accent)' : disabled ? 'var(--text-disabled)' : 'var(--text-secondary)',
      transition: 'all var(--t-fast)',
    }}>
      {children}
    </button>
  );
}

const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
  boxShadow: 'var(--shadow-xs)',
};
