import React, { useState } from 'react';
import { useApp } from '../AppContext.jsx';

const SEVERITY = {
  critical: { label: 'Crítico',  color: 'var(--danger)',  bg: 'var(--danger-soft)',  border: 'var(--danger)',  dot: 'var(--danger)'  },
  warning:  { label: 'Atenção',  color: 'var(--warning)', bg: 'var(--warning-soft)', border: 'var(--warning)', dot: 'var(--warning)' },
  info:     { label: 'Info',     color: 'var(--info)',    bg: 'var(--info-soft)',    border: 'var(--info)',    dot: 'var(--info)'    },
};

const TYPE_LABELS = {
  roas_below:     'ROAS Baixo',
  no_sales:       'Sem Vendas',
  high_frequency: 'Frequência Alta',
  ctr_drop:       'Queda de CTR',
  scalable:       'Escalável',
};

const SUMMARY_CARDS = [
  { key: 'total',    label: 'Total',    icon: '🔔', color: 'var(--accent)',   bg: 'var(--accent-soft)'  },
  { key: 'critical', label: 'Críticos', icon: '🚨', color: 'var(--danger)',   bg: 'var(--danger-soft)'  },
  { key: 'warning',  label: 'Atenção',  icon: '⚠️', color: 'var(--warning)',  bg: 'var(--warning-soft)' },
  { key: 'info',     label: 'Info',     icon: 'ℹ️', color: 'var(--info)',     bg: 'var(--info-soft)'    },
];

export default function AlertsPage() {
  const { alerts, alertsLoading, alertsSummary, dismissAlert, reloadAlerts } = useApp();
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dismissing, setDismissing] = useState(new Set());

  const filtered = (alerts || []).filter(a => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterType !== 'all' && a.alert_type !== filterType) return false;
    return true;
  });

  const handleDismiss = async (id) => {
    setDismissing(prev => new Set(prev).add(id));
    try { await dismissAlert(id); }
    finally { setDismissing(prev => { const s = new Set(prev); s.delete(id); return s; }); }
  };

  const alertTypes = [...new Set((alerts || []).map(a => a.alert_type))];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>Central de Alertas</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Monitoramento automático das suas campanhas
          </p>
        </div>
        <button
          onClick={reloadAlerts}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, transition: 'all var(--t-fast)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          ↻ Atualizar
        </button>
      </div>

      {/* Summary cards */}
      {alertsSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {SUMMARY_CARDS.map(({ key, label, icon, color, bg }) => (
            <div key={key} style={{ background: bg, border: `1px solid ${color}`, borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.8px' }}>
                {alertsSummary[key] || 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', padding: 4, border: '1px solid var(--border)' }}>
          {['all', 'critical', 'warning', 'info'].map(s => (
            <button key={s} onClick={() => setFilterSeverity(s)}
              style={{
                padding: '5px 12px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: filterSeverity === s ? 700 : 500,
                background: filterSeverity === s ? 'var(--bg-card)' : 'transparent',
                color: filterSeverity === s ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: filterSeverity === s ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--t-fast)',
              }}
            >
              {s === 'all' ? 'Todos' : SEVERITY[s]?.label || s}
            </button>
          ))}
        </div>

        {alertTypes.length > 0 && (
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 10px', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-card)', cursor: 'pointer', fontWeight: 500 }}
          >
            <option value="all">Todos os tipos</option>
            {alertTypes.map(type => (
              <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {alertsLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Carregando alertas...
        </div>
      )}

      {/* Empty state */}
      {!alertsLoading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {(alerts || []).length === 0 ? 'Nenhum alerta ativo' : 'Nenhum alerta nesta categoria'}
          </div>
          <div style={{ fontSize: '13px' }}>
            {(alerts || []).length === 0
              ? 'Suas campanhas estão dentro dos parâmetros normais.'
              : 'Tente remover os filtros para ver todos os alertas.'}
          </div>
        </div>
      )}

      {/* Alert list */}
      {!alertsLoading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(alert => {
            const cfg = SEVERITY[alert.severity] || SEVERITY.info;
            const isDismissing = dismissing.has(alert.id);
            return (
              <div key={alert.id} style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 'var(--r-lg)',
                padding: '16px 18px',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                opacity: isDismissing ? 0.5 : 1,
                transition: 'opacity 0.2s, transform 0.15s',
              }}>
                {/* Left accent dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot, flexShrink: 0, marginTop: 4, boxShadow: `0 0 0 3px ${cfg.dot}28` }} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{alert.title}</span>
                    <span style={{ fontSize: '11px', background: cfg.color + '20', color: cfg.color, padding: '2px 8px', borderRadius: 999, fontWeight: 700, border: `1px solid ${cfg.border}` }}>
                      {SEVERITY[alert.severity]?.label || alert.severity}
                    </span>
                    <span style={{ fontSize: '11px', background: 'var(--bg-card)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)' }}>
                      {TYPE_LABELS[alert.alert_type] || alert.alert_type}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{alert.message}</p>
                  <div style={{ display: 'flex', gap: 16, fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    {alert.date_ref && <span>📅 {alert.date_ref}</span>}
                    {alert.entity_name && <span>📢 {alert.entity_name}</span>}
                    {alert.metric_value != null && (
                      <span>Valor: <strong style={{ color: 'var(--text-secondary)' }}>{Number(alert.metric_value).toFixed(2)}</strong></span>
                    )}
                  </div>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => handleDismiss(alert.id)}
                  disabled={isDismissing}
                  title="Dispensar alerta"
                  style={{
                    flexShrink: 0, background: 'none', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)', padding: '4px 10px',
                    cursor: isDismissing ? 'default' : 'pointer',
                    fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                    transition: 'all var(--t-fast)',
                  }}
                  onMouseEnter={e => { if (!isDismissing) { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; }}}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  {isDismissing ? '...' : '✕ Dispensar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
