import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext.jsx';
import { scoreColor, calcScore } from '../utils.js';

const APPLIED_KEY = 'recs_applied';
const getApplied = () => { try { return new Set(JSON.parse(localStorage.getItem(APPLIED_KEY) || '[]')); } catch { return new Set(); } };
const saveApplied = (set) => { try { localStorage.setItem(APPLIED_KEY, JSON.stringify([...set])); } catch {} };

const ACTION_CONFIG = {
  scale:          { icon: '🚀', label: 'Escalar',         color: 'var(--success)',  bg: 'var(--success-soft)',  border: 'var(--success)' },
  pause:          { icon: '⏸',  label: 'Pausar',          color: 'var(--danger)',   bg: 'var(--danger-soft)',   border: 'var(--danger)'  },
  test_creative:  { icon: '🔬', label: 'Testar Criativo', color: 'var(--warning)',  bg: 'var(--warning-soft)',  border: 'var(--warning)' },
  review:         { icon: '👁',  label: 'Revisar',         color: 'var(--accent)',   bg: 'var(--accent-soft)',   border: 'var(--accent)'  },
  observe:        { icon: '👁',  label: 'Observar',        color: 'var(--accent)',   bg: 'var(--accent-soft)',   border: 'var(--accent)'  },
};

export default function RecommendationsPage({ onSelectCampaign }) {
  const { recommendations, recsLoading, reloadRecs, filteredCampaigns, scaleRecs, pauseRecs, testRecs, reviewRecs } = useApp();
  const [applied, setApplied] = useState(getApplied);
  const [filter, setFilter] = useState('all');

  const toggleApplied = (id) => {
    setApplied(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveApplied(next);
      return next;
    });
  };

  const groups = [
    { key: 'scale',         recs: scaleRecs,  ...ACTION_CONFIG.scale },
    { key: 'pause',         recs: pauseRecs,  ...ACTION_CONFIG.pause },
    { key: 'test_creative', recs: testRecs,   ...ACTION_CONFIG.test_creative },
    { key: 'review',        recs: reviewRecs, ...ACTION_CONFIG.review },
  ];

  const visibleGroups = filter === 'all' ? groups : groups.filter(g => g.key === filter);
  const total = recommendations.length;
  const appliedCount = recommendations.filter(r => applied.has(r.id)).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Recomendações da IA
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 3 }}>
            {total} recomendações · {appliedCount} aplicadas · {total - appliedCount} pendentes
          </div>
        </div>
        <button onClick={reloadRecs} style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
          padding: '8px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
        }}>
          <span style={{ fontSize: '14px' }}>↻</span> Atualizar
        </button>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} color="var(--accent)">
          Todos ({total})
        </FilterPill>
        {groups.map(g => g.recs.length > 0 && (
          <FilterPill key={g.key} active={filter === g.key} onClick={() => setFilter(g.key)} color={g.color}>
            {g.icon} {g.label} ({g.recs.length})
          </FilterPill>
        ))}
      </div>

      {/* Loading */}
      {recsLoading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid var(--accent-border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />
          Carregando recomendações...
        </div>
      )}

      {/* Empty */}
      {!recsLoading && total === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Nenhuma recomendação pendente</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>O motor de IA não encontrou ações prioritárias no momento.</div>
        </div>
      )}

      {/* Groups */}
      {!recsLoading && visibleGroups.map(g => g.recs.length > 0 && (
        <div key={g.key} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '18px' }}>{g.icon}</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{g.label}</span>
            <span style={{ background: g.color, color: 'white', fontSize: '11px', fontWeight: 800, borderRadius: 99, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
              {g.recs.length}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {g.recs.map(r => (
              <RecCard
                key={r.id} rec={r} config={g}
                isApplied={applied.has(r.id)}
                onToggleApplied={() => toggleApplied(r.id)}
                campaigns={filteredCampaigns}
                onSelect={onSelectCampaign}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecCard({ rec, config, isApplied, onToggleApplied, campaigns, onSelect }) {
  const camp = campaigns.find(c => c.id === rec.entity_id || c.name === rec.entity_name);
  const score = camp ? calcScore(camp) : null;
  const scoreCol = score != null ? scoreColor(score) : 'var(--text-muted)';

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${isApplied ? 'var(--border)' : config.border}`,
      borderRadius: 'var(--r-lg)', padding: '16px', opacity: isApplied ? 0.6 : 1,
      transition: 'all var(--t-base)', position: 'relative', overflow: 'hidden',
      boxShadow: isApplied ? 'none' : 'var(--shadow-sm)',
    }}>
      {/* Applied overlay badge */}
      {isApplied && (
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'var(--success)', color: 'white', fontSize: '10px', fontWeight: 700, borderRadius: 99, padding: '2px 8px' }}>
          ✓ Aplicado
        </div>
      )}

      {/* Left accent bar */}
      {!isApplied && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: config.color, borderRadius: 'var(--r-lg) 0 0 var(--r-lg)' }} />
      )}

      <div style={{ paddingLeft: isApplied ? 0 : 8 }}>
        {/* Campaign name + score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div
            onClick={() => camp && onSelect(camp)}
            style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', flex: 1, marginRight: 8, cursor: camp ? 'pointer' : 'default', lineHeight: 1.35 }}
          >
            {rec.entity_name || '—'}
          </div>
          {score != null && (
            <span style={{ fontSize: '12px', fontWeight: 800, color: scoreCol, background: scoreCol + '18', borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
              {score}
            </span>
          )}
        </div>

        {/* Message */}
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
          {rec.message || rec.reason || '—'}
        </div>

        {/* Metric value */}
        {rec.metric_value != null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10, background: config.bg, borderRadius: 6, padding: '3px 8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Métrica:</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: config.color }}>
              {typeof rec.metric_value === 'number' ? rec.metric_value.toFixed(2) : rec.metric_value}
            </span>
          </div>
        )}

        {/* Date + Action badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            {rec.date_ref || '—'}
          </span>
          <button
            onClick={onToggleApplied}
            style={{
              background: isApplied ? 'var(--bg-subtle)' : config.color,
              color: isApplied ? 'var(--text-muted)' : 'white',
              border: 'none', borderRadius: 'var(--r-sm)', padding: '5px 12px',
              cursor: 'pointer', fontSize: '11.5px', fontWeight: 700,
              transition: 'all var(--t-fast)',
            }}
          >
            {isApplied ? '↩ Desfazer' : '✓ Marcar como aplicado'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 999, border: '1.5px solid',
      borderColor: active ? color : 'var(--border)',
      background: active ? color : 'var(--bg-subtle)',
      color: active ? 'white' : 'var(--text-secondary)',
      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      transition: 'all var(--t-fast)',
    }}>
      {children}
    </button>
  );
}
